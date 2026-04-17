import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MapPin, Clock, CheckCircle2, ArrowLeft, Navigation2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { getCheckins, addCheckin, formatTime, type Checkin } from "@/lib/checkins";
import { useToast } from "@/hooks/use-toast";

const AMAP_KEY = "181ca3f3351643cbbe03ccb4624f9416";

function wgs84ToGcj02(lat: number, lng: number) {
  const a = 6378245.0, ee = 0.00669342162296594323, PI = Math.PI;
  const dLat = (lat - 35) * PI / 180, dLng = (lng - 105) * PI / 180;
  let magicLat = 20.0 * Math.sin(6 * dLng * PI) + 20.0 * Math.sin(2 * dLng * PI);
  magicLat += 20.0 * Math.sin(dLat * PI) + 40.0 * Math.sin(dLat / 3 * PI);
  magicLat += 160.0 * Math.sin(dLat / 12 * PI) + 320 * Math.sin(dLat * PI / 30);
  magicLat *= 2 / 3;
  let magicLng = 300 + dLng + 2 * dLat + 0.1 * dLng * dLng;
  magicLng += 0.1 * dLng * Math.sqrt(Math.abs(dLat));
  magicLng += 0.2 * Math.sin(6 * dLat * PI) - 0.2 * Math.sin(2 * dLat * PI);
  magicLng += 20.0 * Math.sin(2 * dLng * PI) + 20.0 * Math.sin(dLng * PI);
  magicLng += 40.0 * Math.sin(dLng / 3 * PI) + 150.0 * Math.sin(dLng / 12 * PI);
  magicLng += 300.0 * Math.sin(dLng / 30 * PI);
  magicLng *= 2 / 3;
  const radLat = lat / 180 * PI;
  const magic = Math.sin(radLat);
  const sqrtMagic = Math.sqrt(1 - ee * magic * magic);
  return {
    lat: lat + magicLat / (a * (1 - ee) / (sqrtMagic * sqrtMagic * sqrtMagic) * PI / 180),
    lng: lng + magicLng / (a / sqrtMagic * Math.cos(radLat) * PI / 180),
  };
}

interface NearbyPoi { id: string; name: string; address: string; lat: number; lng: number; distance?: number }

export default function CheckinPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [nearby, setNearby] = useState<NearbyPoi[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [tab, setTab] = useState<"nearby" | "history">("nearby");

  useEffect(() => {
    setCheckins(getCheckins());
    fetchNearby();
  }, []);

  async function fetchNearby() {
    setLoadingNearby(true);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      ).catch(() => null);
      const lat = pos?.coords.latitude ?? 22.22;
      const lng = pos?.coords.longitude ?? 113.55;
      const gcj = wgs84ToGcj02(lat, lng);
      const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${gcj.lng},${gcj.lat}&radius=3000&types=110000&offset=20&page=1&output=json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "1" && data.pois?.length > 0) {
        setNearby(
          data.pois.map((p: any) => {
            const [pLng, pLat] = p.location.split(",");
            return { id: p.id, name: p.name, address: p.address || "", lat: parseFloat(pLat), lng: parseFloat(pLng) };
          })
        );
      }
    } catch {
      // silent
    } finally {
      setLoadingNearby(false);
    }
  }

  async function handleCheckin(poi: NearbyPoi) {
    setChecking(poi.id);
    await new Promise((r) => setTimeout(r, 600));
    const item = addCheckin({ poiName: poi.name, address: poi.address, timestamp: Date.now(), lat: poi.lat, lng: poi.lng });
    setCheckins((prev) => [item, ...prev]);
    toast({ title: "打卡成功 🎉", description: `已记录：${poi.name}` });
    setChecking(null);
    setTab("history");
  }

  const alreadyCheckedIds = new Set(
    checkins.filter((c) => Date.now() - c.timestamp < 24 * 60 * 60 * 1000).map((c) => c.poiName)
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">景点打卡</h1>
            <p className="text-xs text-gray-500">共打卡 {checkins.length} 处景点</p>
          </div>
          <button
            onClick={fetchNearby}
            className="ml-auto w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center"
            data-testid="button-refresh"
          >
            <Navigation2 className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setTab("nearby")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "nearby" ? "bg-primary text-white shadow-sm" : "text-gray-500"}`}
            data-testid="tab-nearby"
          >
            附近景点
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "history" ? "bg-primary text-white shadow-sm" : "text-gray-500"}`}
            data-testid="tab-history"
          >
            打卡记录 {checkins.length > 0 && `(${checkins.length})`}
          </button>
        </div>
      </div>

      <div className="px-5">
        <AnimatePresence mode="wait">
          {tab === "nearby" ? (
            <motion.div key="nearby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {loadingNearby ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : nearby.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">附近暂无景点</p>
                  <button onClick={fetchNearby} className="mt-2 text-primary text-sm font-medium">重新定位</button>
                </div>
              ) : (
                nearby.map((poi, i) => {
                  const done = alreadyCheckedIds.has(poi.name);
                  return (
                    <motion.div
                      key={poi.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
                      data-testid={`poi-item-${poi.id}`}
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${done ? "bg-green-50" : "bg-blue-50"}`}>
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <MapPin className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{poi.name}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{poi.address || "景区"}</p>
                      </div>
                      {done ? (
                        <span className="text-xs text-green-500 font-medium flex-shrink-0">已打卡</span>
                      ) : (
                        <button
                          onClick={() => handleCheckin(poi)}
                          disabled={checking === poi.id}
                          className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold disabled:opacity-60"
                          data-testid={`btn-checkin-${poi.id}`}
                        >
                          {checking === poi.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : "打卡"}
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {checkins.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">还没有打卡记录</p>
                  <p className="text-xs mt-1">去附近景点打卡吧！</p>
                </div>
              ) : (
                checkins.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
                    data-testid={`checkin-item-${c.id}`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.poiName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{formatTime(c.timestamp)}</span>
                      </div>
                    </div>
                    <span className="text-xs text-green-500 font-medium">✓</span>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
