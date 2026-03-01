import { useEffect, useState, useRef, useCallback } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from "react-leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, Info, Search, MapPin, Navigation, X, Volume2, VolumeX, Sparkles, Palmtree, Landmark, TreePine, Star, Eye, Theater, Route, Trash2, Compass, ChevronDown, ChevronUp, Loader2, Map as MapIcon } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { TourSpot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const PROXIMITY_THRESHOLD = 200;

const categories = [
  { id: 'all', labelEn: 'All', labelZh: '全部', icon: Sparkles },
  { id: 'hengqin', labelEn: 'Hengqin', labelZh: '横琴', icon: Palmtree },
  { id: 'historical', labelEn: 'Historical', labelZh: '景点', icon: Landmark },
  { id: 'nature', labelEn: 'Nature', labelZh: '自然', icon: TreePine },
  { id: 'entertainment', labelEn: 'Fun', labelZh: '娱乐', icon: Theater },
  { id: 'landmark', labelEn: 'Landmark', labelZh: '地标', icon: Star },
];

const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000;
const AI_DISCOVERY_COOLDOWN_MS = 10 * 60 * 1000;

const HENGQIN_BOUNDS = {
  minLat: 22.05, maxLat: 22.15, minLng: 113.48, maxLng: 113.58
};

function isInHengqin(lat: number, lng: number) {
  return lat >= HENGQIN_BOUNDS.minLat && lat <= HENGQIN_BOUNDS.maxLat &&
         lng >= HENGQIN_BOUNDS.minLng && lng <= HENGQIN_BOUNDS.maxLng;
}

function MapController({ targetLocation, zoom }: { targetLocation: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], zoom || 14, { duration: 1 });
    }
  }, [targetLocation, zoom, map]);
  return null;
}

interface AmapPoi {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  distance: string;
  shortDesc?: string;
  longDesc?: string;
  descLoading?: boolean;
}

// Hook for 豆包 TTS - per-item audio
function useDoubaoTTS() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, id: string) => {
    if (loadingId || playingId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
      setLoadingId(null);
      return;
    }

    setLoadingId(id);
    try {
      const response = await fetch("/api/doubao/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS 请求失败");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => { setLoadingId(null); setPlayingId(id); };
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setLoadingId(null); setPlayingId(null); URL.revokeObjectURL(url); audioRef.current = null; };

      await audio.play();
    } catch (err) {
      console.error("豆包 TTS 错误:", err);
      setLoadingId(null);
      setPlayingId(null);
    }
  }, [loadingId, playingId]);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  return { speak, stop, playingId, loadingId };
}

export default function MapView() {
  const { data: spots, isLoading: isLoadingSpots } = useSpots();
  const { coords, loading: isLoadingLocation } = useLocation();
  const { t, language } = useLanguage();
  const { speak, isSpeaking, stop, isLoading: isLoadingAudio } = useTextToSpeech();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [autoAnnounceEnabled, setAutoAnnounceEnabled] = useState(() => {
    return localStorage.getItem('map_auto_announce') !== 'false';
  });
  const [announcedSpots, setAnnouncedSpots] = useState<Map<number, number>>(new Map());
  const [lastAIDiscoveryTime, setLastAIDiscoveryTime] = useState(0);
  const [isDiscoveringLocation, setIsDiscoveringLocation] = useState(false);
  const [routePlanningMode, setRoutePlanningMode] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<{lat: number; lng: number; name: string}[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // 高德 POI & 豆包 相关状态
  const [amapPois, setAmapPois] = useState<AmapPoi[]>([]);
  const [isFetchingPois, setIsFetchingPois] = useState(false);
  const [showPoisPanel, setShowPoisPanel] = useState(false);
  const [staticMapUrl, setStaticMapUrl] = useState<string | null>(null);
  const [showStaticMap, setShowStaticMap] = useState(false);
  const doubaoTTS = useDoubaoTTS();

  const addToRoute = useCallback((spot: TourSpot) => {
    setRouteWaypoints(prev => {
      const exists = prev.some(p => p.lat === spot.lat && p.lng === spot.lng);
      if (exists) return prev;
      return [...prev, { lat: spot.lat, lng: spot.lng, name: spot.nameZh }];
    });
    toast({ title: "已添加到路线", description: `${spot.nameZh} 已加入规划路线` });
  }, [toast]);

  const clearRoute = useCallback(() => {
    setRouteWaypoints([]);
    setRoutePlanningMode(false);
  }, []);

  const center = { lat: 22.22, lng: 113.55 };

  const toggleAutoAnnounce = useCallback(() => {
    setAutoAnnounceEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('map_auto_announce', String(newValue));
      toast({
        title: newValue ? t("AI Announcements On", "AI播报已开启") : t("AI Announcements Off", "AI播报已关闭"),
        description: newValue
          ? t("You'll hear announcements when approaching landmarks", "接近景点时将自动播报")
          : t("Location announcements disabled", "位置播报已禁用"),
      });
      return newValue;
    });
  }, [t, toast]);

  const AMAP_KEY = "181ca3f3351643cbbe03ccb4624f9416";

  // 生成景点描述 (豆包)
  const generatePoiDesc = useCallback(async (poi: AmapPoi, index: number) => {
    setAmapPois(prev => prev.map((p, i) => i === index ? { ...p, descLoading: true } : p));
    try {
      const res = await fetch("/api/doubao/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: poi.name, type: poi.type, address: poi.address }),
      });
      const data = await res.json();
      setAmapPois(prev => prev.map((p, i) => i === index
        ? { ...p, shortDesc: data.short, longDesc: data.long, descLoading: false }
        : p
      ));
    } catch {
      setAmapPois(prev => prev.map((p, i) => i === index ? { ...p, descLoading: false } : p));
    }
  }, []);

  // 获取周边景点 - 先尝试高德，失败则用 OpenStreetMap Overpass API
  const fetchNearbyPois = useCallback(async () => {
    if (!coords) {
      toast({ title: "无法获取位置", description: "请确保已开启位置权限", variant: "destructive" });
      return;
    }

    setIsFetchingPois(true);
    setShowPoisPanel(true);
    setAmapPois([]);

    try {
      let pois: AmapPoi[] = [];

      // 尝试高德地图 POI API
      try {
        const amapUrl = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${coords.lng},${coords.lat}&radius=2000&types=110000&offset=20&page=1&extensions=all&output=json`;
        const amapRes = await fetch(amapUrl);
        const amapData = await amapRes.json() as any;

        if (amapData.status === "1" && amapData.pois && amapData.pois.length > 0) {
          pois = amapData.pois.map((poi: any) => {
            const [poiLng, poiLat] = poi.location.split(",");
            return {
              id: poi.id,
              name: poi.name,
              type: poi.type,
              address: poi.address || (poi.pname + poi.cityname + poi.adname),
              lat: parseFloat(poiLat),
              lng: parseFloat(poiLng),
              distance: poi.distance,
            };
          });
        } else {
          throw new Error("高德返回无数据");
        }
      } catch {
        // 高德失败，改用 OpenStreetMap Overpass API
        const overpassQuery = `[out:json][timeout:15];(node["tourism"~"attraction|viewpoint|museum|gallery|zoo|theme_park|artwork|aquarium|monument|ruins"](around:2000,${coords.lat},${coords.lng});way["tourism"~"attraction|viewpoint|museum|gallery|zoo|theme_park|monument"](around:2000,${coords.lat},${coords.lng}););out center 20;`;
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

        const overpassRes = await fetch(overpassUrl);
        const overpassData = await overpassRes.json() as any;

        pois = (overpassData.elements || [])
          .filter((el: any) => el.tags?.name || el.tags?.["name:zh"])
          .slice(0, 20)
          .map((el: any, i: number) => {
            const elLat = el.lat ?? el.center?.lat ?? 0;
            const elLng = el.lon ?? el.center?.lon ?? 0;
            const dist = Math.round(getDistance(coords.lat, coords.lng, elLat, elLng));
            return {
              id: String(el.id || i),
              name: el.tags?.["name:zh"] || el.tags?.name || "未知景点",
              type: el.tags?.tourism || "attraction",
              address: el.tags?.["addr:full"] || el.tags?.["addr:city"] || "",
              lat: elLat,
              lng: elLng,
              distance: String(dist),
            };
          })
          .filter((p: AmapPoi) => p.lat !== 0 && p.lng !== 0);
      }

      setAmapPois(pois);
      setTargetLocation({ lat: coords.lat, lng: coords.lng });

      // 高德静态地图 - 作为标注地图展示
      const markerStr = pois.slice(0, 10).map((p, i) =>
        `mid,0xFF6600,${String.fromCharCode(65 + i)}:${p.lng},${p.lat}`
      ).join("|");
      const mapUrl = `https://restapi.amap.com/v3/staticmap?key=${AMAP_KEY}&location=${coords.lng},${coords.lat}&zoom=14&size=750*400&scale=2&markers=${encodeURIComponent(markerStr)}`;
      setStaticMapUrl(mapUrl);

      toast({ title: `发现 ${pois.length} 个景点`, description: "豆包AI正在生成趣味讲解..." });

      // 为前5个景点自动生成描述
      pois.slice(0, 5).forEach((poi, i) => generatePoiDesc(poi, i));

    } catch (error: any) {
      toast({ title: "获取景点失败", description: error.message || "请检查网络连接", variant: "destructive" });
    } finally {
      setIsFetchingPois(false);
    }
  }, [coords, toast, generatePoiDesc, AMAP_KEY]);

  // AI 自动播报
  useEffect(() => {
    if (!autoAnnounceEnabled || !coords || !spots || isSpeaking || isLoadingAudio || isDiscoveringLocation) return;

    const now = Date.now();
    let foundNearbySpot = false;

    for (const spot of spots) {
      const lastAnnounced = announcedSpots.get(spot.id);
      if (lastAnnounced && now - lastAnnounced < ANNOUNCE_COOLDOWN_MS) continue;

      const distance = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);

      if (distance <= PROXIMITY_THRESHOLD) {
        foundNearbySpot = true;
        const message = `您已到达${spot.nameZh}。${spot.descriptionZh}`;
        speak(message, 'zh');
        setAnnouncedSpots(prev => {
          const newMap = new Map(prev);
          newMap.set(spot.id, now);
          return newMap;
        });
        toast({ title: spot.nameZh, description: "AI播报已触发" });
        break;
      }
    }

    if (!foundNearbySpot && now - lastAIDiscoveryTime > AI_DISCOVERY_COOLDOWN_MS) {
      const anyNearby = spots.some(spot =>
        getDistance(coords.lat, coords.lng, spot.lat, spot.lng) <= 500
      );

      if (!anyNearby) {
        setIsDiscoveringLocation(true);
        fetch('/api/location-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: coords.lat, lng: coords.lng })
        })
          .then(res => res.json())
          .then(data => {
            if (data.description) {
              speak(data.description, 'zh');
              setLastAIDiscoveryTime(Date.now());
              toast({ title: "AI发现新地点", description: "正在为您介绍周围环境" });
            }
          })
          .catch(err => console.error('AI discovery error:', err))
          .finally(() => setIsDiscoveringLocation(false));
      }
    }
  }, [coords, spots, autoAnnounceEnabled, announcedSpots, speak, isSpeaking, isLoadingAudio, toast, lastAIDiscoveryTime, isDiscoveringLocation]);

  const searchResults = searchQuery.length > 0 ? spots?.filter(spot => {
    const name = language === 'en' ? spot.nameEn : spot.nameZh;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }).slice(0, 5) : [];

  const handleSelectSpot = (spot: TourSpot) => {
    setTargetLocation({ lat: spot.lat, lng: spot.lng });
    setSearchQuery(language === 'en' ? spot.nameEn : spot.nameZh);
    setShowSearchResults(false);
  };

  const handleLocateMe = () => {
    if (coords) setTargetLocation({ lat: coords.lat, lng: coords.lng });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const filteredSpots = spots?.filter(spot => {
    let matchesCategory = selectedCategory === 'all' || spot.category === selectedCategory;
    if (selectedCategory === 'hengqin') {
      matchesCategory = isInHengqin(spot.lat, spot.lng);
    }
    const name = language === 'en' ? spot.nameEn : spot.nameZh;
    const matchesSearch = !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoadingSpots || isLoadingLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">{t("Locating...", "定位中...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col relative bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[600] bg-gradient-to-b from-background via-background/90 to-transparent pt-3 pb-8 px-4">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold text-foreground font-serif tracking-wide">荡游者</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="absolute top-12 left-4 right-4 z-[500] space-y-3" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t("Search places or enter location", "搜索地点或输入位置")}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
            onFocus={() => setShowSearchResults(true)}
            className="pl-10 pr-10 h-12 rounded-full bg-card shadow-lg border-0"
            data-testid="input-search"
          />
          {searchQuery && (
            <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full" onClick={handleClearSearch}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}

          {showSearchResults && searchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-lg overflow-hidden">
              {searchResults.map((spot) => (
                <button
                  key={spot.id}
                  className="w-full px-4 py-3 flex items-center gap-3 hover-elevate transition-colors text-left"
                  onClick={() => handleSelectSpot(spot)}
                  data-testid={`search-result-${spot.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground font-serif">
                      {language === 'en' ? spot.nameEn : spot.nameZh}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{spot.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn("rounded-full whitespace-nowrap gap-1.5 shrink-0", isSelected ? "bg-primary text-primary-foreground" : "bg-card shadow-sm")}
                data-testid={`filter-${cat.id}`}
              >
                <Icon className="w-4 h-4" />
                {language === 'en' ? cat.labelEn : cat.labelZh}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 relative z-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={12}
          scrollWheelZoom={true}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            className="warm-map"
          />

          {coords && (
            <CircleMarker
              center={[coords.lat, coords.lng]}
              radius={10}
              pathOptions={{ fillColor: '#f97316', fillOpacity: 0.9, color: '#ffffff', weight: 3 }}
            >
              <Popup className="font-sans">
                <div className="text-center p-1">
                  <p className="font-bold text-primary">{t("You are here", "您的位置")}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* 数据库景点标注 */}
          {filteredSpots?.map((spot) => {
            const spotName = spot.nameZh;
            const distance = coords ? getDistance(coords.lat, coords.lng, spot.lat, spot.lng) : Infinity;
            const isNearby = distance <= PROXIMITY_THRESHOLD;
            const isInRoute = routeWaypoints.some(w => w.lat === spot.lat && w.lng === spot.lng);
            return (
              <CircleMarker
                key={spot.id}
                center={[spot.lat, spot.lng]}
                radius={isNearby ? 10 : 8}
                pathOptions={{
                  fillColor: isInRoute ? '#22c55e' : isNearby ? '#ef4444' : '#d97706',
                  fillOpacity: 0.9,
                  color: '#ffffff',
                  weight: isNearby ? 3 : 2
                }}
              >
                <Popup className="min-w-[220px]">
                  <div className="p-1 space-y-2">
                    <h3 className="font-display font-bold text-lg text-primary">{spotName}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{spot.descriptionZh}</p>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={isLoadingAudio}
                        onClick={() => { isSpeaking ? stop() : speak(spot.descriptionZh, 'zh'); }}
                      >
                        {isLoadingAudio ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isSpeaking ? <>停止</> : <><PlayCircle className="w-4 h-4 mr-1" /> 收听</>}
                      </Button>
                      {routePlanningMode && !isInRoute && (
                        <Button size="sm" variant="outline" onClick={() => addToRoute(spot)}>
                          <Route className="w-4 h-4 mr-1" /> 加入
                        </Button>
                      )}
                      {!routePlanningMode && (
                        <Link href={`/spots/${spot.id}`}>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Info className="w-4 h-4 mr-1" /> 详情
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* 高德 POI 景点标注 */}
          {amapPois.map((poi, index) => (
            <CircleMarker
              key={poi.id}
              center={[poi.lat, poi.lng]}
              radius={8}
              pathOptions={{
                fillColor: '#8b5cf6',
                fillOpacity: 0.85,
                color: '#ffffff',
                weight: 2
              }}
              data-testid={`poi-marker-${poi.id}`}
            >
              <Popup className="min-w-[240px]">
                <div className="p-1 space-y-2">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {index + 1}
                    </div>
                    <h3 className="font-bold text-base text-purple-700 leading-tight">{poi.name}</h3>
                  </div>

                  {poi.descLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      豆包讲解生成中...
                    </div>
                  ) : poi.shortDesc ? (
                    <p className="text-sm text-foreground leading-relaxed">{poi.shortDesc}</p>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-purple-600 p-0 h-auto"
                      onClick={() => generatePoiDesc(poi, index)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      生成豆包讲解
                    </Button>
                  )}

                  {poi.address && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{poi.address}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    {poi.shortDesc && (
                      <Button
                        size="sm"
                        className={cn("flex-1", doubaoTTS.playingId === poi.id ? "bg-purple-600" : "bg-purple-500 hover:bg-purple-600")}
                        onClick={() => doubaoTTS.speak(poi.shortDesc || poi.name, poi.id)}
                        data-testid={`button-tts-${poi.id}`}
                        disabled={doubaoTTS.loadingId === poi.id}
                      >
                        {doubaoTTS.loadingId === poi.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : doubaoTTS.playingId === poi.id ? (
                          <>停止</>
                        ) : (
                          <><Volume2 className="w-3 h-3 mr-1" />豆包朗读</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* 路线规划 */}
          {routeWaypoints.length >= 2 && (
            <Polyline
              positions={routeWaypoints.map(w => [w.lat, w.lng] as [number, number])}
              pathOptions={{ color: '#22c55e', weight: 4, dashArray: '10, 10', opacity: 0.8 }}
            />
          )}

          <MapController targetLocation={targetLocation} />
        </MapContainer>

        {/* 高德静态地图展示 */}
        {showStaticMap && staticMapUrl && (
          <div className="absolute top-36 left-4 right-4 z-[450] bg-card rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-purple-50">
              <span className="text-sm font-medium text-purple-700 flex items-center gap-1">
                <MapIcon className="w-4 h-4" />
                高德地图 · 周边景点
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowStaticMap(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <img
              src={staticMapUrl}
              alt="高德周边景点地图"
              className="w-full object-cover"
              data-testid="img-staticmap"
            />
          </div>
        )}

        {/* 底部 POI 面板 */}
        {showPoisPanel && (
          <div className="absolute bottom-24 left-0 right-0 z-[400] bg-card shadow-2xl rounded-t-3xl max-h-[55vh] flex flex-col">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setShowPoisPanel(false)}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                  <Compass className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-foreground">周边景点</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{amapPois.length}个</span>
              </div>
              <div className="flex items-center gap-2">
                {staticMapUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-600 text-xs h-7"
                    onClick={(e) => { e.stopPropagation(); setShowStaticMap(v => !v); }}
                    data-testid="button-toggle-staticmap"
                  >
                    <MapIcon className="w-3.5 h-3.5 mr-1" />
                    {showStaticMap ? "隐藏地图" : "高德地图"}
                  </Button>
                )}
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <div className="overflow-y-auto px-4 pb-4 space-y-3 flex-1">
              {isFetchingPois ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  <span className="text-muted-foreground text-sm">高德地图搜索中...</span>
                </div>
              ) : amapPois.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">附近暂无景点数据</p>
              ) : (
                amapPois.map((poi, index) => (
                  <div
                    key={poi.id}
                    className="bg-purple-50/50 rounded-2xl p-3 space-y-2"
                    data-testid={`poi-card-${poi.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{poi.name}</p>
                        {poi.address && (
                          <p className="text-xs text-muted-foreground truncate">{poi.address}</p>
                        )}
                        {poi.distance && (
                          <p className="text-xs text-purple-600">{Math.round(Number(poi.distance))}米</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-xs text-purple-600"
                        onClick={() => {
                          setTargetLocation({ lat: poi.lat, lng: poi.lng });
                          setShowPoisPanel(false);
                        }}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {poi.descLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        豆包讲解生成中...
                      </div>
                    ) : poi.longDesc ? (
                      <p className="text-xs text-foreground/80 leading-relaxed pl-8">{poi.longDesc}</p>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-purple-600 h-6 pl-8"
                        onClick={() => generatePoiDesc(poi, index)}
                        data-testid={`button-gen-desc-${poi.id}`}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        生成豆包讲解
                      </Button>
                    )}

                    {(poi.longDesc || poi.shortDesc) && (
                      <div className="pl-8">
                        <Button
                          size="sm"
                          className={cn("h-7 text-xs", doubaoTTS.playingId === poi.id ? "bg-purple-600" : "bg-purple-500 hover:bg-purple-600")}
                          onClick={() => doubaoTTS.speak(poi.longDesc || poi.shortDesc || poi.name, poi.id)}
                          disabled={doubaoTTS.loadingId === poi.id}
                          data-testid={`button-tts-panel-${poi.id}`}
                        >
                          {doubaoTTS.loadingId === poi.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin mr-1" />合成中...</>
                          ) : doubaoTTS.playingId === poi.id ? (
                            <>停止播放</>
                          ) : (
                            <><Volume2 className="w-3 h-3 mr-1" />豆包朗读</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 底部操作区 - 不显示 POI 面板时 */}
        {!showPoisPanel && (
          <div className="absolute bottom-24 left-4 right-4 z-[400] space-y-2">
            {routeWaypoints.length > 0 && (
              <div className="bg-card rounded-2xl shadow-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">规划路线 ({routeWaypoints.length}个站点)</span>
                  <Button variant="ghost" size="sm" onClick={clearRoute} className="text-muted-foreground">
                    <Trash2 className="w-4 h-4 mr-1" />清除
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {routeWaypoints.map((w, idx) => (
                    <span key={idx} className="text-xs bg-green-500/15 text-green-700 px-2 py-1 rounded-full">
                      {idx + 1}. {w.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {amapPois.length > 0 && (
              <Button
                className="w-full rounded-full bg-purple-500 text-white shadow-lg border-0 hover:bg-purple-600"
                size="lg"
                onClick={() => setShowPoisPanel(true)}
                data-testid="button-show-pois"
              >
                <ChevronUp className="w-5 h-5 mr-2" />
                查看 {amapPois.length} 个景点
              </Button>
            )}

            <Button
              className="w-full rounded-full bg-purple-500 text-white shadow-lg border-0 hover:bg-purple-600"
              size="lg"
              onClick={fetchNearbyPois}
              disabled={isFetchingPois || !coords}
              data-testid="button-discover-pois"
            >
              {isFetchingPois ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />高德搜索中...</>
              ) : (
                <><Compass className="w-5 h-5 mr-2" />发现周边景点<span className="ml-1 text-purple-200 text-sm">高德+豆包</span></>
              )}
            </Button>

            <Button
              className="w-full rounded-full bg-card text-foreground shadow-lg border-0"
              variant="outline"
              size="lg"
              onClick={() => {
                const message = `发现${filteredSpots?.length || 0}个景点，点击地图上的标签查看详情。`;
                speak(message, 'zh');
              }}
              data-testid="button-explore"
            >
              <Eye className="w-5 h-5 mr-2" />
              探索此区域
              <span className="ml-2 text-muted-foreground">({filteredSpots?.length || 0})</span>
            </Button>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="absolute bottom-40 right-4 z-[400] flex flex-col gap-2">
          <Button
            variant={autoAnnounceEnabled ? "default" : "outline"}
            size="icon"
            className="rounded-full shadow-lg border-0 bg-card"
            onClick={toggleAutoAnnounce}
            data-testid="button-auto-announce"
          >
            {autoAnnounceEnabled ? (
              <Volume2 className="w-5 h-5 text-primary" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-card shadow-lg border-0"
            onClick={handleLocateMe}
            disabled={!coords}
            data-testid="button-locate-me"
          >
            <Navigation className={cn("w-5 h-5", coords ? "text-primary" : "text-muted-foreground")} />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
