import { useEffect, useState, useRef, useCallback } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Navigation, Volume2, VolumeX, Loader2, MapPin, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { addCheckin } from "@/lib/checkins";

const AMAP_KEY = "181ca3f3351643cbbe03ccb4624f9416";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// WGS84（GPS）→ GCJ02（高德）坐标转换，消除国内偏移
function wgs84ToGcj02(lat: number, lng: number): { lat: number; lng: number } {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  const PI = Math.PI;

  function transformLat(x: number, y: number) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x: number, y: number) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  const magic = Math.sin(radLat);
  const sqrtMagic = Math.sqrt(1 - ee * magic * magic);
  const corrLat = lat + (dLat * 180.0) / ((a * (1 - ee)) / (sqrtMagic * sqrtMagic * sqrtMagic) * PI);
  const corrLng = lng + (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
  return { lat: corrLat, lng: corrLng };
}

// GCJ02（高德）→ WGS84（GPS/OSM）坐标反转换，用于在 OSM 地图上正确显示高德 POI
function gcj02ToWgs84(lat: number, lng: number): { lat: number; lng: number } {
  let wLat = lat, wLng = lng;
  for (let i = 0; i < 10; i++) {
    const gcj = wgs84ToGcj02(wLat, wLng);
    wLat -= gcj.lat - lat;
    wLng -= gcj.lng - lng;
  }
  return { lat: wLat, lng: wLng };
}

const GEOFENCE_RADIUS = 50;
const ANNOUNCE_COOLDOWN_MS = 10 * 60 * 1000;
const FETCH_DISTANCE_THRESHOLD = 300;   // 每移动 300m 重新拉取一次

// 高德 POI 分类：仅景点（风景名胜）
const AMAP_TYPES = "110000";

interface NearbyPoi {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
}

function MapController({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 16, { duration: 1.2 });
  }, [target, map]);
  return null;
}

export default function MapView() {
  const { data: spots } = useSpots();
  const { coords, loading: isLoadingLocation } = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [autoAnnounceEnabled, setAutoAnnounceEnabled] = useState(() =>
    localStorage.getItem("map_auto_announce") !== "false"
  );

  // 地理围栏相关状态
  const [nearbyPois, setNearbyPois] = useState<NearbyPoi[]>([]);
  const [isFetchingPois, setIsFetchingPois] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentPoi, setCurrentPoi] = useState<string | null>(null);
  const announcedRef = useRef<Map<string, number>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFetchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSpeakingRef = useRef(false);

  const center = { lat: 22.22, lng: 113.55 };
  // 将 GPS 坐标转为 GCJ02，用于与高德 POI 精确比对
  const gcjCoords = coords ? wgs84ToGcj02(coords.lat, coords.lng) : null;

  // 从高德获取周边 POI（多分类、3000m 半径、双页并发，适配陌生区域）
  const fetchPois = useCallback(async (lat: number, lng: number) => {
    setIsFetchingPois(true);
    try {
      const gcj = wgs84ToGcj02(lat, lng);
      const base = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${gcj.lng},${gcj.lat}&radius=3000&types=${AMAP_TYPES}&offset=25&output=json`;

      // 并发拉取第 1、2 页
      const [res1, res2] = await Promise.all([
        fetch(`${base}&page=1`).then(r => r.json()),
        fetch(`${base}&page=2`).then(r => r.json()),
      ]);

      const rawPois = [
        ...((res1.status === "1" && res1.pois) ? res1.pois : []),
        ...((res2.status === "1" && res2.pois) ? res2.pois : []),
      ];

      if (rawPois.length > 0) {
        // 去重（同 id）
        const seen = new Set<string>();
        const pois: NearbyPoi[] = rawPois
          .filter((poi: any) => {
            if (seen.has(poi.id)) return false;
            seen.add(poi.id);
            return true;
          })
          .map((poi: any) => {
            const [poiLng, poiLat] = poi.location.split(",");
            return {
              id: poi.id,
              name: poi.name,
              type: poi.type,
              address: poi.address || poi.pname + poi.cityname + poi.adname || "",
              lat: parseFloat(poiLat),
              lng: parseFloat(poiLng),
            };
          });

        setNearbyPois(pois);
        lastFetchCoordsRef.current = { lat, lng };
        console.log(`已加载 ${pois.length} 个周边景点`);
      }
    } catch (err) {
      console.error("高德 POI 获取失败:", err);
    } finally {
      setIsFetchingPois(false);
    }
  }, []);

  // 当位置可用时，加载周边 POI
  useEffect(() => {
    if (!coords) return;

    const last = lastFetchCoordsRef.current;
    const needFetch = !last || getDistance(coords.lat, coords.lng, last.lat, last.lng) > FETCH_DISTANCE_THRESHOLD;

    if (needFetch && !isFetchingPois) {
      fetchPois(coords.lat, coords.lng);
    }
  }, [coords, fetchPois, isFetchingPois]);

  // 触发语音播报（豆包 API）
  const triggerAnnouncement = useCallback(async (poi: NearbyPoi) => {
    if (isSpeakingRef.current || !autoAnnounceEnabled) return;

    const now = Date.now();
    const lastTime = announcedRef.current.get(poi.id) || 0;
    if (now - lastTime < ANNOUNCE_COOLDOWN_MS) return;

    isSpeakingRef.current = true;
    announcedRef.current.set(poi.id, now);
    setIsAnnouncing(true);
    setCurrentPoi(poi.name);

    // 自动打卡：每次地理围栏触发播报，同步写入打卡记录
    addCheckin({
      poiName: poi.name,
      address: poi.address || "",
      timestamp: now,
      lat: poi.lat,
      lng: poi.lng,
    });

    try {
      // 1. 豆包生成讲解
      const descRes = await fetch("/api/doubao/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: poi.name, type: poi.type, address: poi.address }),
      });
      const descData = await descRes.json();
      const text = descData.long || descData.short || `欢迎来到${poi.name}，这里是一处值得细细品味的好地方！`;

      // 2. 豆包语音合成
      const ttsRes = await fetch("/api/doubao/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!ttsRes.ok) throw new Error("TTS 失败");

      const blob = await ttsRes.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        isSpeakingRef.current = false;
        setIsAnnouncing(false);
        setCurrentPoi(null);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      audio.onerror = () => {
        isSpeakingRef.current = false;
        setIsAnnouncing(false);
        setCurrentPoi(null);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await audio.play();

      toast({
        title: `🎙️ ${poi.name}`,
        description: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
      });
    } catch (err) {
      console.error("播报失败:", err);
      isSpeakingRef.current = false;
      setIsAnnouncing(false);
      setCurrentPoi(null);
    }
  }, [autoAnnounceEnabled, toast]);

  // 地理围栏检测（用 GCJ02 坐标对比高德 POI，消除坐标系偏移）
  useEffect(() => {
    if (!coords || !autoAnnounceEnabled || nearbyPois.length === 0) return;

    const gcj = wgs84ToGcj02(coords.lat, coords.lng);
    for (const poi of nearbyPois) {
      const dist = getDistance(gcj.lat, gcj.lng, poi.lat, poi.lng);
      if (dist <= GEOFENCE_RADIUS) {
        triggerAnnouncement(poi);
        break;
      }
    }
  }, [coords, nearbyPois, autoAnnounceEnabled, triggerAnnouncement]);

  const stopAnnouncement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    isSpeakingRef.current = false;
    setIsAnnouncing(false);
    setCurrentPoi(null);
  }, []);

  const toggleAutoAnnounce = useCallback(() => {
    setAutoAnnounceEnabled(prev => {
      const next = !prev;
      localStorage.setItem("map_auto_announce", String(next));
      if (!next) stopAnnouncement();
      toast({
        title: next ? "自动讲解已开启" : "自动讲解已关闭",
        description: next ? `进入景点 ${GEOFENCE_RADIUS}米范围内将自动播报` : "已停止自动播报",
      });
      return next;
    });
  }, [stopAnnouncement, toast]);

  const handleLocateMe = () => {
    if (coords) setTargetLocation({ lat: coords.lat, lng: coords.lng });
  };

  if (isLoadingLocation) {
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
      {/* 顶部标题 */}
      <div className="absolute top-0 left-0 right-0 z-[600] bg-gradient-to-b from-background/95 to-transparent pt-3 pb-6 px-4 pointer-events-none">
        <div className="flex items-center justify-center">
          <h1 className="text-xl font-bold text-foreground font-serif tracking-wide">荡游者</h1>
        </div>
      </div>

      {/* 正在播报提示条 */}
      {isAnnouncing && currentPoi && (
        <div className="absolute top-14 left-4 right-4 z-[600] bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Mic className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-medium">语音讲解中</span>
          </div>
          <p className="text-sm font-semibold flex-1 truncate">{currentPoi}</p>
          <Button
            size="sm"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 h-7 px-2 shrink-0"
            onClick={stopAnnouncement}
            data-testid="button-stop-announce"
          >
            停止
          </Button>
        </div>
      )}

      {/* 地图 */}
      <div className="flex-1 relative z-0">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* 用户位置 */}
          {coords && (
            <CircleMarker
              center={[coords.lat, coords.lng]}
              radius={10}
              pathOptions={{ fillColor: "#f97316", fillOpacity: 0.95, color: "#ffffff", weight: 3 }}
            >
              <Popup>
                <p className="font-bold text-primary text-center">{t("You are here", "您的位置")}</p>
              </Popup>
            </CircleMarker>
          )}

          {/* 用户位置 50m 围栏圈（可视化） */}
          {coords && (
            <CircleMarker
              center={[coords.lat, coords.lng]}
              radius={18}
              pathOptions={{ fillColor: "#f97316", fillOpacity: 0.08, color: "#f97316", weight: 1, dashArray: "4 4" }}
            />
          )}

          {/* 数据库景点标注 */}
          {spots?.map((spot) => {
            const dist = coords ? getDistance(coords.lat, coords.lng, spot.lat, spot.lng) : Infinity;
            const isNearby = dist <= GEOFENCE_RADIUS;
            return (
              <CircleMarker
                key={spot.id}
                center={[spot.lat, spot.lng]}
                radius={isNearby ? 10 : 7}
                pathOptions={{
                  fillColor: isNearby ? "#ef4444" : "#d97706",
                  fillOpacity: 0.85,
                  color: "#ffffff",
                  weight: isNearby ? 3 : 2,
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1">
                    <p className="font-bold text-primary">{spot.nameZh}</p>
                    <p className="text-xs text-muted-foreground">{spot.descriptionZh?.slice(0, 60)}...</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* 高德 POI 标注（GCJ02→WGS84 转换后显示在 OSM 正确位置） */}
          {nearbyPois.map((poi) => {
            const dist = gcjCoords ? getDistance(gcjCoords.lat, gcjCoords.lng, poi.lat, poi.lng) : Infinity;
            const inFence = dist <= GEOFENCE_RADIUS;
            const wgs = gcj02ToWgs84(poi.lat, poi.lng);
            return (
              <CircleMarker
                key={poi.id}
                center={[wgs.lat, wgs.lng]}
                radius={inFence ? 9 : 6}
                pathOptions={{
                  fillColor: inFence ? "#8b5cf6" : "#a78bfa",
                  fillOpacity: inFence ? 0.9 : 0.5,
                  color: "#ffffff",
                  weight: inFence ? 2 : 1,
                }}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-semibold text-purple-700 text-sm">{poi.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dist <= GEOFENCE_RADIUS ? "📍 您正在此景点范围内" : `距离约 ${Math.round(dist)} 米`}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          <MapController target={targetLocation} />
        </MapContainer>

        {/* 状态信息栏 */}
        <div className="absolute bottom-24 left-4 right-4 z-[400]">
          <div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", autoAnnounceEnabled ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              <div>
                <p className="text-xs font-medium text-foreground">
                  {autoAnnounceEnabled ? "地理围栏已开启" : "地理围栏已关闭"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isFetchingPois ? "正在搜索3km内景点..." : nearbyPois.length > 0
                    ? `${nearbyPois.length} 个景点 · ${GEOFENCE_RADIUS}m 进入自动播报`
                    : "等待位置信息..."}
                </p>
              </div>
            </div>
            {isAnnouncing && (
              <div className="flex items-center gap-1 text-primary">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">播报中</span>
              </div>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="absolute bottom-40 right-4 z-[400] flex flex-col gap-2">
          {/* 自动播报开关 */}
          <Button
            size="icon"
            className={cn(
              "rounded-full shadow-lg w-12 h-12",
              autoAnnounceEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground border border-border"
            )}
            onClick={toggleAutoAnnounce}
            data-testid="button-auto-announce"
            title={autoAnnounceEnabled ? "关闭自动讲解" : "开启自动讲解"}
          >
            {autoAnnounceEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </Button>

          {/* 定位按钮 */}
          <Button
            size="icon"
            variant="outline"
            className="rounded-full bg-card shadow-lg border-0 w-12 h-12"
            onClick={handleLocateMe}
            disabled={!coords}
            data-testid="button-locate-me"
            title="定位到当前位置"
          >
            <Navigation className={cn("w-5 h-5", coords ? "text-primary" : "text-muted-foreground")} />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
