import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Map, MessageCircle, Users, Shield, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroTravelImage from "@/assets/images/hero-travel.png";
import airplaneImage from "@/assets/images/airplane.png";

export default function HomePage() {
  const { t, language, toggleLanguage } = useLanguage();
  const [, setLocation] = useLocation();

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
      <div className="absolute top-4 right-4 z-10">
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
