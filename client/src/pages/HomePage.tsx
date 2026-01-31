import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sun, Cloud, CloudRain, User, Bell, Mountain, TreePine, Compass } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import heroTravelImage from "@/assets/images/hero-travel.png";
import logoImage from "@/assets/logo.png";
import { BottomNav } from "@/components/BottomNav";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  city: string;
}

export default function HomePage() {
  const [, setLocation] = useLocation();

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    staleTime: 1000 * 60 * 10,
  });

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return Sun;
    if (code >= 2 && code <= 3) return Cloud;
    return CloudRain;
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;

  const categoryButtons = [
    { 
      id: 'mountains', 
      icon: Mountain, 
      label: '山脉',
      color: 'bg-orange-500/15',
      iconColor: 'text-orange-600',
      path: '/map?category=mountains'
    },
    { 
      id: 'forests', 
      icon: TreePine, 
      label: '森林',
      color: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
      path: '/map?category=forests'
    },
    { 
      id: 'tours', 
      icon: Compass, 
      label: '导览',
      color: 'bg-sky-500/15',
      iconColor: 'text-sky-600',
      path: '/guides'
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
          data-testid="weather-display"
        >
          {weather && (
            <>
              <WeatherIcon className="w-6 h-6 text-primary" />
              <span className="text-2xl font-bold text-foreground">{Math.round(weather.temperature)}°</span>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/reminders")}
            className="rounded-xl bg-card shadow-sm relative"
            data-testid="button-reminders"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/profile")}
            className="rounded-xl bg-card shadow-sm"
            data-testid="button-profile"
          >
            <User className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center px-6 pt-16 pb-28 overflow-y-auto"
      >
        <div className="flex flex-col items-center mb-6">
          <motion.img
            src={logoImage}
            alt="慢慢走"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 h-16 rounded-full object-cover shadow-md mb-3"
          />
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-bold text-foreground mb-1 font-serif"
          >
            慢慢走
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-sm"
          >
            AI智能导游助手
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-md mb-6"
        >
          <Card 
            className="overflow-hidden cursor-pointer hover-elevate active-elevate-2 transition-all"
            onClick={() => setLocation("/map")}
            data-testid="card-hero-map"
          >
            <div className="relative">
              <img 
                src={heroTravelImage} 
                alt="探索中国" 
                className="w-full h-44 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <h3 className="font-bold text-lg font-serif">
                  点击进入地图
                </h3>
                <p className="text-sm opacity-90">
                  AI智能位置播报
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="flex flex-wrap gap-3 justify-center">
            {categoryButtons.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setLocation(cat.path)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${cat.color} border border-border/30 hover-elevate active-elevate-2 transition-all`}
                data-testid={`category-${cat.id}`}
              >
                <cat.icon className={`w-4 h-4 ${cat.iconColor}`} />
                <span className="text-sm font-medium text-foreground">{cat.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <BottomNav />
    </div>
  );
}
