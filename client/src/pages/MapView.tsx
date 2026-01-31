import { useEffect, useState, useRef, useCallback } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, Info, Search, MapPin, Navigation, X, Volume2, VolumeX, Sparkles, Palmtree, Landmark, TreePine, Star, Eye, Theater } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { TourSpot } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Calculate distance between two coordinates in meters
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Proximity threshold in meters for auto-announce
const PROXIMITY_THRESHOLD = 200;

const categories = [
  { id: 'all', labelEn: 'All', labelZh: '全部', icon: Sparkles },
  { id: 'hengqin', labelEn: 'Hengqin', labelZh: '横琴', icon: Palmtree },
  { id: 'historical', labelEn: 'Historical', labelZh: '景点', icon: Landmark },
  { id: 'nature', labelEn: 'Nature', labelZh: '自然', icon: TreePine },
  { id: 'entertainment', labelEn: 'Fun', labelZh: '娱乐', icon: Theater },
  { id: 'landmark', labelEn: 'Landmark', labelZh: '地标', icon: Star },
];

// Cooldown for auto-announce (5 minutes per spot)
const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000;

// Hengqin area bounding box (approximate)
const HENGQIN_BOUNDS = {
  minLat: 22.05,
  maxLat: 22.15,
  minLng: 113.48,
  maxLng: 113.58
};

function isInHengqin(lat: number, lng: number) {
  return lat >= HENGQIN_BOUNDS.minLat && 
         lat <= HENGQIN_BOUNDS.maxLat && 
         lng >= HENGQIN_BOUNDS.minLng && 
         lng <= HENGQIN_BOUNDS.maxLng;
}

// Component to fly to a location
function MapController({ targetLocation, zoom }: { targetLocation: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], zoom || 14, { duration: 1 });
    }
  }, [targetLocation, zoom, map]);
  return null;
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
  const searchRef = useRef<HTMLDivElement>(null);

  // Initial center - Zhuhai fallback (Gongbei area)
  const center = { lat: 22.22, lng: 113.55 };

  // Toggle auto-announce
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

  // AI Location-based auto-announce with cooldown
  useEffect(() => {
    if (!autoAnnounceEnabled || !coords || !spots || isSpeaking || isLoadingAudio) return;

    const now = Date.now();
    
    // Find nearby spots that haven't been announced recently
    for (const spot of spots) {
      const lastAnnounced = announcedSpots.get(spot.id);
      if (lastAnnounced && now - lastAnnounced < ANNOUNCE_COOLDOWN_MS) continue;
      
      const distance = getDistance(coords.lat, coords.lng, spot.lat, spot.lng);
      
      if (distance <= PROXIMITY_THRESHOLD) {
        // Announce this spot
        const spotName = language === 'en' ? spot.nameEn : spot.nameZh;
        const description = language === 'en' ? spot.descriptionEn : spot.descriptionZh;
        const message = language === 'zh' 
          ? `您已到达${spotName}。${description}`
          : `You've arrived at ${spotName}. ${description}`;
        
        speak(message, language);
        setAnnouncedSpots(prev => {
          const newMap = new Map(prev);
          newMap.set(spot.id, now);
          return newMap;
        });
        
        toast({
          title: spotName,
          description: t("AI announcement triggered", "AI播报已触发"),
        });
        
        break; // Only announce one spot at a time
      }
    }
  }, [coords, spots, autoAnnounceEnabled, announcedSpots, language, speak, isSpeaking, isLoadingAudio, t, toast]);

  // Search results for dropdown
  const searchResults = searchQuery.length > 0 ? spots?.filter(spot => {
    const name = language === 'en' ? spot.nameEn : spot.nameZh;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }).slice(0, 5) : [];

  // Handle clicking on a search result
  const handleSelectSpot = (spot: TourSpot) => {
    setTargetLocation({ lat: spot.lat, lng: spot.lng });
    setSearchQuery(language === 'en' ? spot.nameEn : spot.nameZh);
    setShowSearchResults(false);
  };

  // Handle locate me button
  const handleLocateMe = () => {
    if (coords) {
      setTargetLocation({ lat: coords.lat, lng: coords.lng });
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Filter spots by category and search
  const filteredSpots = spots?.filter(spot => {
    let matchesCategory = selectedCategory === 'all' || spot.category === selectedCategory;
    // Special handling for Hengqin filter - show spots within Hengqin area
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
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[500] space-y-3" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t("Search places or enter location", "搜索地点或输入位置")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="pl-10 pr-10 h-12 rounded-full bg-card shadow-lg border-0"
            data-testid="input-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
              onClick={handleClearSearch}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          
          {/* Search Results Dropdown */}
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
                className={cn(
                  "rounded-full whitespace-nowrap gap-1.5 shrink-0",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"
                )}
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
              pathOptions={{ 
                fillColor: '#f97316', 
                fillOpacity: 0.9, 
                color: '#ffffff', 
                weight: 3 
              }}
            >
              <Popup className="font-sans">
                <div className="text-center p-1">
                  <p className="font-bold text-primary">{t("You are here", "您的位置")}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {filteredSpots?.map((spot) => {
            const spotName = language === 'en' ? spot.nameEn : spot.nameZh;
            const distance = coords ? getDistance(coords.lat, coords.lng, spot.lat, spot.lng) : Infinity;
            const isNearby = distance <= PROXIMITY_THRESHOLD;
            return (
              <CircleMarker 
                key={spot.id} 
                center={[spot.lat, spot.lng]} 
                radius={isNearby ? 10 : 8}
                pathOptions={{ 
                  fillColor: isNearby ? '#ef4444' : '#d97706', 
                  fillOpacity: 0.9, 
                  color: '#ffffff', 
                  weight: isNearby ? 3 : 2 
                }}
              >
                <Popup className="min-w-[220px]">
                  <div className="p-1 space-y-2">
                    <h3 className="font-display font-bold text-lg text-primary">
                      {spotName}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {language === 'en' ? spot.descriptionEn : spot.descriptionZh}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        disabled={isLoadingAudio}
                        onClick={() => {
                          const text = language === 'en' ? spot.descriptionEn : spot.descriptionZh;
                          isSpeaking ? stop() : speak(text, language);
                        }}
                      >
                        {isLoadingAudio ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isSpeaking ? (
                          <>{t("Stop", "停止")}</>
                        ) : (
                          <><PlayCircle className="w-4 h-4 mr-1" /> {t("Listen", "收听")}</>
                        )}
                      </Button>
                      <Link href={`/spots/${spot.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Info className="w-4 h-4 mr-1" /> {t("Details", "详情")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          
          <MapController targetLocation={targetLocation} />
        </MapContainer>

        {/* Bottom explore button */}
        <div className="absolute bottom-24 left-4 right-4 z-[400]">
          <Button 
            className="w-full rounded-full bg-card text-foreground shadow-lg border-0"
            variant="outline"
            size="lg"
            onClick={() => {
              const message = language === 'zh' 
                ? `发现${filteredSpots?.length || 0}个景点，点击地图上的标签查看详情。`
                : `Found ${filteredSpots?.length || 0} spots. Tap labels on the map for details.`;
              speak(message, language === 'zh' ? 'zh' : 'en');
            }}
            data-testid="button-explore"
          >
            <Eye className="w-5 h-5 mr-2" />
            {t("Explore this area", "探索此区域")}
            <span className="ml-2 text-muted-foreground">
              ({filteredSpots?.length || 0})
            </span>
          </Button>
        </div>

        {/* Control Buttons */}
        <div className="absolute bottom-40 right-4 z-[400] flex flex-col gap-2">
          {/* AI Auto-Announce Toggle */}
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
          
          {/* Locate Me Button */}
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
