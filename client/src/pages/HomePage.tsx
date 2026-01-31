import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sun, Cloud, CloudRain, User, Bell, MapPin, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import heroTravelImage from "@/assets/images/hero-travel.png";
import { BottomNav } from "@/components/BottomNav";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  city: string;
}

export default function HomePage() {
  const { t } = useLanguage();
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar - Temperature left, Profile right */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        {/* Left: Temperature */}
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

        {/* Right: Bell and Profile Icons */}
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
        <div className="text-center mb-6">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl font-bold text-foreground mb-1 font-serif"
          >
            {t("Let's travel", "一起旅行")}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold text-primary font-serif"
          >
            {t("Slow Walk", "慢慢走")}
          </motion.h2>
        </div>

        {/* Main Hero Card - Clickable to enter map */}
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
                alt={t("Explore China", "探索中国")} 
                className="w-full h-44 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <h3 className="font-bold text-lg font-serif">
                  {t("Tap to Explore Map", "点击进入地图")}
                </h3>
                <p className="text-sm opacity-90">
                  {t("AI-powered location announcements", "AI智能位置播报")}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="w-full max-w-md space-y-3"
        >
          <h3 className="font-semibold text-foreground font-serif px-1">
            {t("Quick Actions", "快捷任务")}
          </h3>
          
          {/* Task 1: Explore Spots */}
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation("/spots")}
            data-testid="task-spots"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">
                  {t("Browse Attractions", "浏览景点")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("Discover local tourist spots", "发现本地旅游景点")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Task 2: Find Guides */}
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation("/guides")}
            data-testid="task-guides"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">
                  {t("Find Tour Guides", "寻找导游")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("Connect with local experts", "与本地专家联系")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Task 3: Set Reminders */}
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation("/reminders")}
            data-testid="task-reminders"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-rose-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground">
                  {t("Schedule Reminders", "设置提醒")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("Auto-announce at locations", "到达位置自动播报")}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
