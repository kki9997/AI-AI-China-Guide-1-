import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Bell, Bookmark, Star, MapPin, Navigation, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import img1 from "@/assets/images/50978d0b34620578897abed13911cbab7d5fbbf3.png";
import img2 from "@/assets/images/7af4a2b678c87e1f207534192b35d84c06243e16.png";

interface WeatherData { temperature: number; weatherCode: number; city: string }
interface Guide { id: number; nameZh: string; city: string; rating: number; photoUrl: string; specialties: string[] }

const CATEGORIES = [
  { id: "mountains", label: "山脉", color: "bg-green-100 text-green-700", path: "/map?category=mountains" },
  { id: "forests",   label: "森林", color: "bg-emerald-100 text-emerald-700", path: "/map?category=forests" },
  { id: "tours",     label: "导览", color: "bg-blue-100 text-blue-700", path: "/guides" },
  { id: "flights",   label: "路线", color: "bg-rose-100 text-rose-600", path: "/routes" },
];

const STATIC_SPOTS = [
  { id: "s1", name: "珠海渔女雕像", city: "珠海", rating: 4.8, img: img1, tag: "海滨" },
  { id: "s2", name: "万山群岛", city: "珠海", rating: 4.9, img: img2, tag: "岛屿" },
];

function DestCard({
  name, city, rating, img, tag, saved, onSave, onClick,
}: {
  name: string; city: string; rating: number; img: string; tag?: string;
  saved?: boolean; onSave?: () => void; onClick?: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex-shrink-0 w-52 rounded-2xl bg-white shadow-sm overflow-hidden cursor-pointer"
    >
      <div className="relative h-32">
        <img src={img} alt={name} className="w-full h-full object-cover" />
        {tag && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 text-gray-700">
            {tag}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSave?.(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center"
          data-testid={`btn-save-${name}`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-primary text-primary" : "text-gray-500"}`} />
        </button>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-semibold text-gray-700">{rating}</span>
        </div>
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-900 leading-tight">{name}</p>
        <div className="flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span className="text-[11px] text-gray-500">{city}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    staleTime: 1000 * 60 * 10,
  });

  const { data: guides = [] } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
    staleTime: 1000 * 60 * 5,
  });

  const today = new Date();
  const dateStr = today.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });

  const toggleSave = (id: string) =>
    setSaved((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 overflow-y-auto">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-12 pb-4 bg-background">
        <div>
          <p className="text-xs text-muted-foreground font-medium">
            {weather ? `${weather.city} · ${Math.round(weather.temperature)}°` : "荡游者"}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">出发旅行</h1>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">荡游者 🌿</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/reminders")}
            className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center relative"
            data-testid="button-reminders"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-400 rounded-full" />
          </button>
          <button
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center"
            data-testid="button-profile"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-6">

        {/* ── Date pill ── */}
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setLocation("/reminders")}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-white/60 text-sm font-medium text-gray-700"
          data-testid="button-date"
        >
          <CalendarDays className="w-4 h-4 text-primary" />
          {dateStr}
          <span className="text-gray-400 text-xs">▾</span>
        </motion.button>

        {/* ── Category pills ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setLocation(cat.path)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold ${cat.color} shadow-sm`}
              data-testid={`category-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        {/* ── Map card ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setLocation("/map")}
          className="rounded-2xl bg-white shadow-sm overflow-hidden cursor-pointer"
          data-testid="card-hero-map"
        >
          <div className="h-40 bg-gradient-to-br from-blue-100 to-teal-50 relative flex items-center justify-center">
            <div className="text-center">
              <Navigation className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">进入地图导览</p>
              <p className="text-xs text-gray-500 mt-0.5">AI 智能位置播报 · 景点自动讲解</p>
            </div>
          </div>
        </motion.div>

        {/* ── Recommended spots ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">推荐目的地</h3>
            <button onClick={() => setLocation("/guides")} className="text-xs text-primary font-medium">查看全部</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {STATIC_SPOTS.map((spot) => (
              <DestCard
                key={spot.id}
                name={spot.name}
                city={spot.city}
                rating={spot.rating}
                img={spot.img}
                tag={spot.tag}
                saved={saved.has(spot.id)}
                onSave={() => toggleSave(spot.id)}
                onClick={() => setLocation("/map")}
              />
            ))}
            {guides.slice(0, 3).map((g) => (
              <DestCard
                key={g.id}
                name={g.city + " · " + (g.specialties?.[0] || "探索")}
                city={g.city}
                rating={g.rating}
                img={g.photoUrl}
                saved={saved.has(String(g.id))}
                onSave={() => toggleSave(String(g.id))}
                onClick={() => setLocation(`/book/${g.id}`)}
              />
            ))}
          </div>
        </div>

        {/* ── Checkin entry ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => setLocation("/checkin")}
          className="rounded-2xl bg-white shadow-sm p-4 flex items-center gap-4 cursor-pointer"
          data-testid="card-checkin"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">景点打卡</p>
            <p className="text-xs text-gray-500 mt-0.5">记录你走过的每一处风景</p>
          </div>
          <span className="ml-auto text-gray-300 text-lg">›</span>
        </motion.div>

      </div>

      <BottomNav />
    </div>
  );
}
