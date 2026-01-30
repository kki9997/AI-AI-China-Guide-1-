import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Map, MessageCircle, Users, Shield, Sparkles, Sun, Cloud, CloudRain, MapPin, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import heroTravelImage from "@/assets/images/hero-travel.png";
import airplaneImage from "@/assets/images/airplane.png";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  city: string;
}

export default function HomePage() {
  const { t, language, toggleLanguage } = useLanguage();
  const [, setLocation] = useLocation();
  const { speak, stop, isSpeaking, isLoading } = useTextToSpeech();

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    staleTime: 1000 * 60 * 10,
  });

  const getWeatherIcon = (code: number) => {
    if (code === 0 || code === 1) return Sun;
    if (code >= 2 && code <= 3) return Cloud;
    return CloudRain;
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return { en: "clear sky", zh: "晴朗" };
    if (code === 1) return { en: "mainly clear", zh: "晴" };
    if (code === 2) return { en: "partly cloudy", zh: "多云" };
    if (code === 3) return { en: "overcast", zh: "阴天" };
    if (code >= 45 && code <= 48) return { en: "foggy", zh: "有雾" };
    if (code >= 51 && code <= 67) return { en: "rainy", zh: "下雨" };
    if (code >= 71 && code <= 77) return { en: "snowy", zh: "下雪" };
    return { en: "cloudy", zh: "多云" };
  };

  const handleBroadcast = () => {
    if (isSpeaking) {
      stop();
      return;
    }

    const temp = weather ? Math.round(weather.temperature) : 20;
    const weatherDesc = weather ? getWeatherDescription(weather.weatherCode) : { en: "nice", zh: "很好" };
    const city = weather?.city || "Zhuhai";

    const message = language === "zh"
      ? `欢迎使用慢慢走！今天${city}天气${weatherDesc.zh}，温度${temp}度。祝您旅途愉快！`
      : `Welcome to Slow Walk! Today in ${city}, the weather is ${weatherDesc.en} with a temperature of ${temp} degrees. Have a wonderful journey!`;

    speak(message, language === "zh" ? "zh" : "en");
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;

  const features = [
    {
      icon: Map,
      titleEn: "Interactive Map",
      titleZh: "互动地图",
      descEn: "Explore China's famous landmarks",
      descZh: "探索中国著名地标"
    },
    {
      icon: MessageCircle,
      titleEn: "AI Guide",
      titleZh: "AI导游",
      descEn: "Get personalized travel advice",
      descZh: "获取个性化旅行建议"
    },
    {
      icon: Users,
      titleEn: "Local Guides",
      titleZh: "本地导游",
      descEn: "Connect with expert tour guides",
      descZh: "联系专业导游"
    },
    {
      icon: Shield,
      titleEn: "Safety First",
      titleZh: "安全第一",
      descEn: "SOS button for emergencies",
      descZh: "紧急求助按钮"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
        {weather && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur-sm rounded-full shadow-sm"
            data-testid="weather-display"
          >
            <WeatherIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">{Math.round(weather.temperature)}°C</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {weather.city}
            </span>
          </motion.div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBroadcast}
            disabled={isLoading}
            className="bg-background/80 backdrop-blur-sm rounded-full w-9 h-9"
            data-testid="button-broadcast"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSpeaking ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="bg-background/80 backdrop-blur-sm"
            data-testid="button-language-toggle"
          >
            {language === "en" ? "中文" : "EN"}
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
      >
        <div className="text-center mb-6 relative">
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="absolute -right-4 top-0 w-24 h-24"
          >
            <img src={airplaneImage} alt="" className="w-full h-full object-contain" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-3xl font-bold text-foreground mb-1"
          >
            {t("Let's travel", "一起旅行")}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold text-primary"
          >
            {t("Slow Walk", "慢慢走")}
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-md mb-6"
        >
          <Card className="overflow-hidden">
            <img 
              src={heroTravelImage} 
              alt={t("Explore China", "探索中国")} 
              className="w-full h-40 object-cover"
            />
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                {t("Your AI Travel Companion in China", "您的中国AI旅行伴侣")}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.titleEn}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
            >
              <Card className="h-full hover-elevate">
                <CardContent className="p-4 text-center">
                  <feature.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">
                    {t(feature.titleEn, feature.titleZh)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(feature.descEn, feature.descZh)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

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

      <footer className="py-4 text-center text-xs text-muted-foreground">
        <p>{t("© 2026 Slow Walk. All rights reserved.", "© 2026 慢慢走. 保留所有权利.")}</p>
      </footer>
    </div>
  );
}
