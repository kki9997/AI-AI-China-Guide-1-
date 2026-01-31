import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Sun, Cloud, CloudRain, User, Bell } from "lucide-react";
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
            className="w-10 h-10 rounded-xl bg-card shadow-sm relative"
            data-testid="button-reminders"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/profile")}
            className="w-10 h-10 rounded-xl bg-card shadow-sm"
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

        {/* Main Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-md mb-4"
        >
          <Card className="overflow-hidden">
            <img 
              src={heroTravelImage} 
              alt={t("Explore China", "探索中国")} 
              className="w-full h-36 object-cover"
            />
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground mb-1 font-serif">
                {t("Your AI Travel Companion", "您的AI旅行伴侣")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Explore China's rich culture, history, and natural beauty with personalized AI guidance and local expert connections.",
                  "在个性化AI指导和本地专家的帮助下，探索中国丰富的文化、历史和自然美景。"
                )}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="w-full max-w-md space-y-3"
        >
          <Button
            size="lg"
            className="w-full h-12 text-lg"
            onClick={() => setLocation("/map")}
            data-testid="button-start-exploring"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {t("Start Exploring", "开始探索")}
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            {t("Discover the beauty of China at your own pace", "以您自己的节奏探索中国之美")}
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
