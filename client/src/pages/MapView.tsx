import { useEffect, useState, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Navigation, Volume2, VolumeX, Loader2, Mic, X, Clock, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { addCheckin } from "@/lib/checkins";

const AMAP_KEY = "181ca3f3351643cbbe03ccb4624f9416";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";

// ── Geo utilities ─────────────────────────────────────────────────────────────
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function wgs84ToGcj02(lat: number, lng: number) {
  const a = 6378245.0, ee = 0.00669342162296594323, PI = Math.PI;
  const dLat = (lat - 35) * PI / 180, dLng = (lng - 105) * PI / 180;
  let mLat = -100 + 2 * dLng + 3 * dLat + 0.2 * dLat ** 2 + 0.1 * dLng * dLat + 0.2 * Math.sqrt(Math.abs(dLng));
  mLat += ((20 * Math.sin(6 * dLng * PI) + 20 * Math.sin(2 * dLng * PI)) + (20 * Math.sin(dLat * PI) + 40 * Math.sin(dLat / 3 * PI)) + (160 * Math.sin(dLat / 12 * PI) + 320 * Math.sin(dLat * PI / 30))) * 2 / 3;
  let mLng = 300 + dLng + 2 * dLat + 0.1 * dLng ** 2 + 0.1 * dLng * dLat + 0.1 * Math.sqrt(Math.abs(dLng));
  mLng += ((20 * Math.sin(6 * dLng * PI) + 20 * Math.sin(2 * dLng * PI)) + (20 * Math.sin(dLng * PI) + 40 * Math.sin(dLng / 3 * PI)) + (150 * Math.sin(dLng / 12 * PI) + 300 * Math.sin(dLng / 30 * PI))) * 2 / 3;
  const radLat = lat / 180 * PI, magic = Math.sin(radLat), sqrtMagic = Math.sqrt(1 - ee * magic ** 2);
  return { lat: lat + mLat / ((a * (1 - ee)) / sqrtMagic ** 3 * PI / 180), lng: lng + mLng / (a / sqrtMagic * Math.cos(radLat) * PI / 180) };
}

function gcj02ToWgs84(lat: number, lng: number) {
  let wLat = lat, wLng = lng;
  for (let i = 0; i < 10; i++) { const g = wgs84ToGcj02(wLat, wLng); wLat -= g.lat - lat; wLng -= g.lng - lng; }
  return { lat: wLat, lng: wLng };
}

function isWebGLAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch { return false; }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface NearbyPoi { id: string; name: string; type: string; address: string; lat: number; lng: number; }
interface RouteDest { name: string; lat: number; lng: number; }
interface RouteInfo { time: number; distance: number; }
interface RoutePoints { positions: [number, number][]; arrows: { lat: number; lng: number; angle: number }[]; }

// ── Leaflet helpers ───────────────────────────────────────────────────────────
function LeafletFlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], 15, { duration: 1 }); }, [target, map]);
  return null;
}

function LeafletFitBounds({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [60, 50], animate: true, duration: 1.2, maxZoom: 16 });
  }, [bounds, map]);
  return null;
}

function makeArrowIcon(angle: number) {
  return L.divIcon({
    html: `<svg width="12" height="16" viewBox="0 0 12 16" style="transform:rotate(${angle}deg)" fill="none"><path d="M6 0L12 16H6H0L6 0Z" fill="#f9a8d4" stroke="#f472b6" stroke-width="1"/></svg>`,
    className: "",
    iconSize: [12, 16],
    iconAnchor: [6, 8],
  });
}

function makePoiIcon(name: string) {
  const label = name.slice(0, 8) + (name.length > 8 ? "…" : "");
  return L.divIcon({
    html: `<div style="background:white;border:2px solid #5eead4;border-radius:10px;padding:2px 8px;font-size:11px;color:#374151;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.10);white-space:nowrap;cursor:pointer;">${label}</div>`,
    className: "",
    iconAnchor: [0, 32],
  });
}

const GEOFENCE_RADIUS = 50;
const ANNOUNCE_COOLDOWN_MS = 10 * 60 * 1000;
const FETCH_DISTANCE_THRESHOLD = 300;

export default function MapView() {
  const { data: spots } = useSpots();
  const { coords, loading: isLoadingLocation } = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [webgl, setWebgl] = useState(() => isWebGLAvailable());

  const [autoAnnounceEnabled, setAutoAnnounceEnabled] = useState(
    () => localStorage.getItem("map_auto_announce") !== "false"
  );
  const [nearbyPois, setNearbyPois] = useState<NearbyPoi[]>([]);
  const [isFetchingPois, setIsFetchingPois] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentPoi, setCurrentPoi] = useState<string | null>(null);
  const [routeDest, setRouteDest] = useState<RouteDest | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoints | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [leafletFitBounds, setLeafletFitBounds] = useState<[[number, number], [number, number]] | null>(null);

  const announcedRef = useRef<Map<string, number>>(new Map());
  const routeLineCoordsRef = useRef<[number, number][]>([]); // [lng, lat][] for MapLibre bounds
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFetchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const isSpeakingRef = useRef(false);

  // MapLibre refs (3D mode)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeMarkersRef = useRef<maplibregl.Marker[]>([]);

  // ── OSRM route planning (shared logic) ───────────────────────────────────────
  const clearRoute = useCallback(() => {
    setRoutePoints(null);
    setRouteInfo(null);
    if (mapRef.current) {
      routeMarkersRef.current.forEach((m) => m.remove());
      routeMarkersRef.current = [];
      try { mapRef.current.removeLayer("route-line"); } catch (_) {}
      try { mapRef.current.removeLayer("route-line-casing"); } catch (_) {}
      try { mapRef.current.removeSource("route"); } catch (_) {}
    }
    routeLineCoordsRef.current = [];
  }, []);

  useEffect(() => {
    if (!routeDest || !coords) { clearRoute(); return; }

    (async () => {
      try {
        const url = `${OSRM_BASE}/${coords.lng},${coords.lat};${routeDest.lng},${routeDest.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        const route = data.routes?.[0];
        if (!route) return;

        setRouteInfo({ time: route.duration, distance: route.distance });

        const lineCoords: [number, number][] = route.geometry.coordinates; // [lng, lat]
        routeLineCoordsRef.current = lineCoords; // store for handleDepart

        // For Leaflet (needs [lat, lng])
        const positions: [number, number][] = lineCoords.map(([lng, lat]) => [lat, lng]);

        // Arrows
        const total = lineCoords.length;
        const step = Math.max(1, Math.floor(total / 7));
        const arrows: { lat: number; lng: number; angle: number }[] = [];
        for (let i = step; i < total - 1; i += step) {
          const [lng1, lat1] = lineCoords[i];
          const [lng2, lat2] = lineCoords[Math.min(i + 1, total - 1)];
          const angle = Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI;
          arrows.push({ lat: lat1, lng: lng1, angle });
        }
        setRoutePoints({ positions, arrows });

        // ── MapLibre route drawing ──────────────────────────────────────
        if (mapRef.current) {
          routeMarkersRef.current.forEach((m) => m.remove());
          routeMarkersRef.current = [];
          try { mapRef.current.removeLayer("route-line"); } catch (_) {}
          try { mapRef.current.removeSource("route"); } catch (_) {}

          mapRef.current.addSource("route", { type: "geojson", data: { type: "Feature", geometry: route.geometry, properties: {} } });
          // White underline for contrast against dark map backgrounds
          mapRef.current.addLayer({
            id: "route-line-casing", type: "line", source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.6 },
          });
          // Black dashed route line
          mapRef.current.addLayer({
            id: "route-line", type: "line", source: "route",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-color": "#1e293b", "line-width": 4, "line-dasharray": [2, 1.8], "line-opacity": 0.95 },
          });

          arrows.forEach(({ lat, lng, angle }) => {
            const el = document.createElement("div");
            el.style.cssText = "width:20px;height:20px;display:flex;align-items:center;justify-content:center;pointer-events:none;";
            el.innerHTML = `<svg width="11" height="15" viewBox="0 0 11 15" style="transform:rotate(${angle}deg)" fill="none"><path d="M5.5 0L11 15H5.5H0L5.5 0Z" fill="#f9a8d4" stroke="#f472b6" stroke-width="0.8"/></svg>`;
            const m = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(mapRef.current!);
            routeMarkersRef.current.push(m);
          });

          // Fit bounds to route
          const lngs = lineCoords.map((c) => c[0]);
          const lats = lineCoords.map((c) => c[1]);
          mapRef.current.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: { top: 80, bottom: 220, left: 40, right: 40 }, duration: 800 });
        }
      } catch (err) {
        console.error("路线规划失败:", err);
      }
    })();
  }, [routeDest, coords, clearRoute]);

  // ── MapLibre 3D init (WebGL path) ─────────────────────────────────────────
  useEffect(() => {
    if (!webgl || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [113.55, 22.22],
      zoom: 15,
      pitch: 45,
      bearing: -15,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      try {
        const style = map.getStyle();
        const srcName = Object.keys(style.sources ?? {}).find((k) => (style.sources![k] as any).type === "vector");
        if (srcName) {
          map.addLayer({
            id: "3d-buildings",
            source: srcName,
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 13,
            paint: {
              "fill-extrusion-color": ["interpolate", ["linear"], ["get", "render_height"], 0, "#f0faf9", 20, "#fef4f9", 50, "#e0f7f4"],
              "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
              "fill-extrusion-opacity": 0.82,
            },
          }, style.layers?.find((l) => l.type === "symbol")?.id);
        }
      } catch (_) {}
    });

    map.on("error", (e: any) => {
      const msg = e?.error?.message ?? "";
      if (msg.includes("WebGL") || msg.includes("Failed to initialize") || msg.includes("webgl")) {
        setWebgl(false);
        map.remove();
        mapRef.current = null;
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current === map) {
        map.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        poiMarkersRef.current = [];
        routeMarkersRef.current = [];
      }
    };
  }, [webgl]);

  // ── MapLibre user location marker ─────────────────────────────────────────
  useEffect(() => {
    if (!webgl || !mapRef.current || !coords) return;
    const el = document.createElement("div");
    el.style.cssText = "width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#2dd4bf,#f472b6);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.28);";
    if (userMarkerRef.current) { userMarkerRef.current.setLngLat([coords.lng, coords.lat]); }
    else { userMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([coords.lng, coords.lat]).addTo(mapRef.current); }
  }, [coords, webgl]);

  // ── MapLibre POI markers ───────────────────────────────────────────────────
  useEffect(() => {
    if (!webgl || !mapRef.current) return;
    poiMarkersRef.current.forEach((m) => m.remove());
    poiMarkersRef.current = [];
    nearbyPois.forEach((poi) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:white;border:2px solid #5eead4;border-radius:10px;padding:3px 9px;font-size:11px;color:#374151;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.10);cursor:pointer;white-space:nowrap;">${poi.name.slice(0, 8)}${poi.name.length > 8 ? "…" : ""}</div>`;
      el.onclick = () => setRouteDest({ name: poi.name, lng: poi.lng, lat: poi.lat });
      const m = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([poi.lng, poi.lat]).addTo(mapRef.current!);
      poiMarkersRef.current.push(m);
    });
  }, [nearbyPois, webgl]);

  // ── Fetch nearby POIs ─────────────────────────────────────────────────────
  const fetchPois = useCallback(async (lat: number, lng: number) => {
    setIsFetchingPois(true);
    try {
      const gcj = wgs84ToGcj02(lat, lng);
      const base = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${gcj.lng},${gcj.lat}&radius=3000&types=110000&offset=25&output=json`;
      const [r1, r2] = await Promise.all([fetch(`${base}&page=1`).then((r) => r.json()), fetch(`${base}&page=2`).then((r) => r.json())]);
      const raw = [...((r1.status === "1" && r1.pois) ? r1.pois : []), ...((r2.status === "1" && r2.pois) ? r2.pois : [])];
      if (raw.length > 0) {
        const seen = new Set<string>();
        const pois: NearbyPoi[] = raw
          .filter((p: any) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
          .map((p: any) => {
            const [pLng, pLat] = p.location.split(",");
            const wgs = gcj02ToWgs84(parseFloat(pLat), parseFloat(pLng));
            return { id: p.id, name: p.name, type: p.type, address: p.address || "", lat: wgs.lat, lng: wgs.lng };
          });
        setNearbyPois(pois);
        lastFetchCoordsRef.current = { lat, lng };
        console.log(`已加载 ${pois.length} 个周边景点`);
      }
    } catch (err) { console.error("高德 POI 获取失败:", err); }
    finally { setIsFetchingPois(false); }
  }, []);

  useEffect(() => {
    if (!coords) return;
    const last = lastFetchCoordsRef.current;
    if (!last || getDistance(coords.lat, coords.lng, last.lat, last.lng) > FETCH_DISTANCE_THRESHOLD)
      if (!isFetchingPois) fetchPois(coords.lat, coords.lng);
  }, [coords, fetchPois, isFetchingPois]);

  // ── Voice announcement ────────────────────────────────────────────────────
  const triggerAnnouncement = useCallback(async (poi: NearbyPoi) => {
    if (isSpeakingRef.current || !autoAnnounceEnabled) return;
    const now = Date.now();
    if ((announcedRef.current.get(poi.id) ?? 0) > now - ANNOUNCE_COOLDOWN_MS) return;
    isSpeakingRef.current = true;
    announcedRef.current.set(poi.id, now);
    setIsAnnouncing(true); setCurrentPoi(poi.name);
    addCheckin({ poiName: poi.name, address: poi.address || "", timestamp: now, lat: poi.lat, lng: poi.lng });
    try {
      const descRes = await fetch("/api/doubao/describe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: poi.name, type: poi.type, address: poi.address }) });
      const descData = await descRes.json();
      const text = descData.long || descData.short || `欢迎来到${poi.name}！`;
      const ttsRes = await fetch("/api/doubao/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!ttsRes.ok) throw new Error("TTS failed");
      const url = URL.createObjectURL(await ttsRes.blob());
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(url);
      audioRef.current = audio;
      const done = () => { isSpeakingRef.current = false; setIsAnnouncing(false); setCurrentPoi(null); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onended = done; audio.onerror = done;
      await audio.play();
      toast({ title: `🎙️ ${poi.name}`, description: text.slice(0, 50) + (text.length > 50 ? "..." : "") });
    } catch { isSpeakingRef.current = false; setIsAnnouncing(false); setCurrentPoi(null); }
  }, [autoAnnounceEnabled, toast]);

  useEffect(() => {
    if (!coords || !autoAnnounceEnabled || nearbyPois.length === 0) return;
    const gcj = wgs84ToGcj02(coords.lat, coords.lng);
    for (const poi of nearbyPois) {
      const pg = wgs84ToGcj02(poi.lat, poi.lng);
      if (getDistance(gcj.lat, gcj.lng, pg.lat, pg.lng) <= GEOFENCE_RADIUS) { triggerAnnouncement(poi); break; }
    }
  }, [coords, nearbyPois, autoAnnounceEnabled, triggerAnnouncement]);

  const stopAnnouncement = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    isSpeakingRef.current = false; setIsAnnouncing(false); setCurrentPoi(null);
  }, []);

  const toggleAutoAnnounce = useCallback(() => {
    setAutoAnnounceEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("map_auto_announce", String(next));
      if (!next) stopAnnouncement();
      toast({ title: next ? "自动讲解已开启" : "自动讲解已关闭", description: next ? `进入景点 ${GEOFENCE_RADIUS}m 内自动播报` : "已停止" });
      return next;
    });
  }, [stopAnnouncement, toast]);

  const handleLocateMe = () => {
    if (!coords) return;
    if (mapRef.current) mapRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 15, pitch: 45, bearing: -15, duration: 1200 });
    else setFlyTarget({ lat: coords.lat, lng: coords.lng });
  };

  // ── 出发：route-adaptive camera centering ────────────────────────────────
  const handleDepart = useCallback(() => {
    const lineCoords = routeLineCoordsRef.current;
    const dest = routeDest;
    if (!lineCoords.length && !dest) return;

    // Collect all relevant [lng, lat] points
    const pts: [number, number][] = [...lineCoords];
    if (coords) pts.push([coords.lng, coords.lat]);
    if (dest) pts.push([dest.lng, dest.lat]);
    // Add nearby POIs that fall within the route bounding box
    if (pts.length < 2) return;

    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    if (mapRef.current) {
      // MapLibre: fitBounds with 40° pitch for comfortable overview
      mapRef.current.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        {
          pitch: 40,
          bearing: -15,
          padding: { top: 100, bottom: 260, left: 50, right: 50 },
          duration: 1500,
          essential: true,
        }
      );
    } else {
      // Leaflet fallback: fitBounds via state
      setLeafletFitBounds([[minLat, minLng], [maxLat, maxLng]]);
    }
  }, [coords, routeDest]);

  const center: [number, number] = coords ? [coords.lat, coords.lng] : [22.22, 113.55];
  const routeMinutes = routeInfo ? Math.ceil(routeInfo.time / 60) : null;
  const routeMeters = routeInfo?.distance ?? null;

  // ── Shared overlay UI ──────────────────────────────────────────────────────
  const overlays = (
    <>
      {/* Top gradient + title */}
      <div className="absolute top-0 left-0 right-0 z-[600] bg-gradient-to-b from-background/95 to-transparent pt-3 pb-8 px-4 pointer-events-none">
        <h1 className="text-xl font-bold text-center text-foreground font-serif tracking-wide">荡游者</h1>
      </div>

      {/* Voice announcing bar */}
      {isAnnouncing && currentPoi && (
        <div className="absolute top-14 left-4 right-4 z-[600] bg-primary text-primary-foreground rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0"><Mic className="w-4 h-4 animate-pulse" /><span className="text-xs font-medium">语音讲解中</span></div>
          <p className="text-sm font-semibold flex-1 truncate">{currentPoi}</p>
          <Button size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20 h-7 px-2 shrink-0" onClick={stopAnnouncement} data-testid="button-stop-announce">停止</Button>
        </div>
      )}

      {/* Route destination panel */}
      {routeDest && (
        <div className="absolute bottom-24 left-4 right-4 z-[500] flex flex-col gap-2.5">
          {/* Info card */}
          <div className="bg-white/96 backdrop-blur-md rounded-2xl shadow-xl border border-white/70 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-100 to-pink-100 flex items-center justify-center flex-shrink-0">
              <Footprints className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{routeDest.name}</p>
              {routeInfo ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-teal-500" />
                  <span className="text-xs text-teal-600 font-medium">
                    步行约 {routeMinutes} 分钟{routeMeters !== null ? routeMeters >= 1000 ? `（${(routeMeters / 1000).toFixed(1)} km）` : `（${Math.round(routeMeters)} m）` : ""}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5"><Loader2 className="w-3 h-3 text-muted-foreground animate-spin" /><span className="text-xs text-muted-foreground">规划路线中…</span></div>
              )}
            </div>
            <button onClick={() => { setRouteDest(null); clearRoute(); setLeafletFitBounds(null); }} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0" data-testid="button-cancel-route">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>

          {/* 出发 CTA button — shows once route is ready */}
          {routeInfo && (
            <button
              onClick={handleDepart}
              data-testid="button-depart"
              className="w-full rounded-2xl py-3.5 font-bold text-base text-white shadow-lg active:scale-[0.97] transition-transform duration-100"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
            >
              出发
            </button>
          )}
        </div>
      )}

      {/* Status bar */}
      {!routeDest && (
        <div className="absolute bottom-24 left-4 right-4 z-[400]">
          <div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0", autoAnnounceEnabled ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              <div>
                <p className="text-xs font-medium text-foreground">{autoAnnounceEnabled ? "地理围栏已开启" : "地理围栏已关闭"}</p>
                <p className="text-xs text-muted-foreground">{isFetchingPois ? "正在搜索 3km 内景点…" : nearbyPois.length > 0 ? `${nearbyPois.length} 个景点 · 点击标签规划路线` : isLoadingLocation ? "定位中…" : "等待位置信息…"}</p>
              </div>
            </div>
            {isAnnouncing && <div className="flex items-center gap-1 text-primary"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">播报中</span></div>}
          </div>
        </div>
      )}

      {/* Control buttons */}
      <div className="absolute bottom-40 right-4 z-[400] flex flex-col gap-2">
        <Button size="icon"
          className={cn("rounded-full shadow-lg w-12 h-12", autoAnnounceEnabled ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border")}
          onClick={toggleAutoAnnounce} data-testid="button-auto-announce">
          {autoAnnounceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>
        <Button size="icon" variant="outline" className="rounded-full bg-card shadow-lg border-0 w-12 h-12"
          onClick={handleLocateMe} disabled={!coords} data-testid="button-locate-me">
          <Navigation className={cn("w-5 h-5", coords ? "text-primary" : "text-muted-foreground")} />
        </Button>
      </div>
    </>
  );

  // ══ WebGL path: MapLibre 3D ═══════════════════════════════════════════════
  if (webgl) {
    return (
      <div className="h-screen w-full relative bg-background overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />
        {overlays}
        <BottomNav />
      </div>
    );
  }

  // ══ Fallback: Leaflet + CSS perspective tilt ══════════════════════════════
  return (
    <div className="h-screen w-full flex flex-col relative bg-background overflow-hidden">
      {/* 3D tilt wrapper using CSS perspective */}
      <div className="flex-1 relative z-0" style={{ perspective: "700px", perspectiveOrigin: "50% 100%", overflow: "hidden" }}>
        <div style={{ transform: "rotateX(20deg)", transformOrigin: "50% 100%", height: "115%", width: "100%", marginTop: "-5%" }}>
          <MapContainer center={center} zoom={15} scrollWheelZoom={true} className="w-full h-full" zoomControl={false} style={{ background: "#f8f9f5" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* User location */}
            {coords && (
              <Marker
                position={[coords.lat, coords.lng]}
                icon={L.divIcon({
                  html: `<div style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#2dd4bf,#f472b6);border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.28);"></div>`,
                  className: "", iconSize: [18, 18], iconAnchor: [9, 9],
                })}
              />
            )}

            {/* POI label markers */}
            {nearbyPois.map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lng]}
                icon={makePoiIcon(poi.name)}
                eventHandlers={{ click: () => setRouteDest({ name: poi.name, lat: poi.lat, lng: poi.lng }) }}
              />
            ))}

            {/* Route: black dashed line with white outline for contrast */}
            {routePoints && (<>
              <Polyline
                positions={routePoints.positions}
                pathOptions={{ color: "#ffffff", weight: 7, lineCap: "round", lineJoin: "round", opacity: 0.55 }}
              />
              <Polyline
                positions={routePoints.positions}
                pathOptions={{ color: "#1e293b", weight: 4, dashArray: "14, 7", lineCap: "round", lineJoin: "round", opacity: 0.95 }}
              />
            </>)}

            {/* Route: pink direction arrows */}
            {routePoints?.arrows.map((a, i) => (
              <Marker key={i} position={[a.lat, a.lng]} icon={makeArrowIcon(a.angle)} />
            ))}

            <LeafletFlyTo target={flyTarget} />
            <LeafletFitBounds bounds={leafletFitBounds} />
          </MapContainer>
        </div>
      </div>

      {overlays}
      <BottomNav />
    </div>
  );
}
