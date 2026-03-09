import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sun, Cloud, CloudRain, User, Bell, Mountain, TreePine, Compass, Map, CalendarDays, Menu, Navigation } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import { useLocation as useGeoLocation } from "@/hooks/use-location";
import { BottomNav } from "@/components/BottomNav";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  city: string;
}

function AirplaneSvg() {
  return (
    <svg viewBox="0 0 120 100" className="w-28 h-28 opacity-20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 50 L80 20 L95 30 L60 50 L95 70 L80 80 Z" />
      <path d="M30 50 L45 65 L60 50" />
      <path d="M55 42 L65 28" />
      <path d="M55 58 L65 72" />
    </svg>
  );
}

export default function HomePage() {
  const [, setLocation] = useLocation();

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    staleTime: 1000 * 60 * 10,
  });

  const { coords } = useGeoLocation();
  const mapCenter: [number, number] = coords ? [coords.lat, coords.lng] : [22.22, 113.55];

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return Sun;
    if (code >= 2 && code <= 3) return Cloud;
    return CloudRain;
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;

  const today = new Date();
  const dateStr = today.toLocaleDateString("zh-CN", { month: "long", day: "numeric" });

  const categoryButtons = [
    {
      id: "map",
      icon: Map,
      label: "探索地图",
      color: "bg-primary/10",
      iconColor: "text-primary",
      path: "/map",
    },
    {
      id: "mountains",
      icon: Mountain,
      label: "山脉",
      color: "bg-orange-500/10",
      iconColor: "text-orange-600",
      path: "/map?category=mountains",
    },
    {
      id: "forests",
      icon: TreePine,
      label: "森林",
      color: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      path: "/map?category=forests",
    },
    {
      id: "tours",
      icon: Compass,
      label: "导览",
      color: "bg-sky-500/10",
      iconColor: "text-sky-600",
      path: "/guides",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── 顶部 Hero 区域（薄荷绿卡片） ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-b-[2.5rem] bg-primary/15 px-5 pt-12 pb-8 mx-0"
      >
        {/* 顶部导航栏 */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/spots")}
            className="rounded-2xl bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-sm"
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/reminders")}
              className="rounded-2xl bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-sm relative"
              data-testid="button-reminders"
            >
              <Bell className="w-5 h-5 text-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/profile")}
              className="rounded-2xl bg-white/50 dark:bg-white/10 backdrop-blur-sm shadow-sm"
              data-testid="button-profile"
            >
              <User className="w-5 h-5 text-foreground" />
            </Button>
          </div>
        </div>

        {/* 主标题 + 飞机装饰 */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm text-primary font-medium mb-1"
            >
              {weather ? `${weather.city} · ${Math.round(weather.temperature)}°` : "准备出发"}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-foreground font-serif leading-tight mb-1"
            >
              出发旅行
            </motion.h1>
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="text-3xl font-bold text-foreground font-serif leading-tight mb-4"
            >
              荡游者
            </motion.h2>

            {/* 日期按钮 */}
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={() => setLocation("/reminders")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-sm shadow-sm border border-white/40 text-sm font-medium text-foreground"
              data-testid="button-date"
            >
              <CalendarDays className="w-4 h-4 text-primary" />
              {dateStr}
            </motion.button>
          </div>

          {/* 装饰飞机 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-primary mt-2"
          >
            <AirplaneSvg />
          </motion.div>
        </div>

        {/* 天气图标（右下角小装饰） */}
        {weather && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-4 right-5 flex items-center gap-1 text-primary/60"
          >
            <WeatherIcon className="w-4 h-4" />
          </motion.div>
        )}
      </motion.div>

      {/* ── 主内容区域 ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex-1 flex flex-col px-5 pt-5 pb-28 overflow-y-auto gap-4"
      >
        {/* 地图入口大卡 */}
        <Card
          className="overflow-hidden cursor-pointer hover-elevate active-elevate-2 transition-all rounded-3xl"
          onClick={() => setLocation("/map")}
          data-testid="card-hero-map"
        >
          <div className="relative h-52">
            {/* 真实地图预览（禁用所有交互） */}
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
              dragging={false}
              touchZoom={false}
              doubleClickZoom={false}
              scrollWheelZoom={false}
              keyboard={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {coords && (
                <CircleMarker
                  center={[coords.lat, coords.lng]}
                  radius={9}
                  pathOptions={{ color: "#fff", fillColor: "#3b82f6", fillOpacity: 1, weight: 2 }}
                />
              )}
            </MapContainer>

            {/* 透明点击拦截层 */}
            <div className="absolute inset-0 z-[400]" />

            {/* 渐变遮罩 + 文字 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-[401] pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 z-[402] text-white pointer-events-none">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Navigation className="w-4 h-4" />
                <h3 className="font-bold text-lg font-serif">进入地图导览</h3>
              </div>
              <p className="text-xs opacity-80">AI 智能位置播报 · 景点自动讲解</p>
            </div>
          </div>
        </Card>

        {/* 分类快捷按钮 */}
        <div className="grid grid-cols-4 gap-2">
          {categoryButtons.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              onClick={() => setLocation(cat.path)}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl ${cat.color} hover-elevate active-elevate-2 transition-all`}
              data-testid={`category-${cat.id}`}
            >
              <cat.icon className={`w-5 h-5 ${cat.iconColor}`} />
              <span className="text-xs font-medium text-foreground">{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <BottomNav />
    </div>
  );
}
