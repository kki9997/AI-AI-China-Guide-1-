import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { MapPin, Compass, Sparkles, Star, Heart } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between p-6 pb-12">
      {/* Header with user avatar placeholder */}
      <div className="w-full flex justify-between items-center">
        <Button variant="ghost" size="icon" className="rounded-full">
          <span className="sr-only">Menu</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <Compass className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex-1 flex flex-col justify-center"
      >
        {/* Title with illustration */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            {t("Let's travel", "开始旅行")}
          </h1>
          <h2 className="text-4xl font-bold text-secondary">
            {t("China", "中国")}
          </h2>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm">
            <MapPin className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">{t("Historical", "历史")}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm">
            <Compass className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{t("Nature", "自然")}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">{t("Culture", "文化")}</span>
          </div>
        </div>

        {/* Featured Card */}
        <Card className="overflow-hidden border-none shadow-lg rounded-3xl relative">
          <div className="h-48 w-full overflow-hidden relative">
            <img 
              src="https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&auto=format&fit=crop" 
              alt="Great Wall"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            
            {/* Rating Badge */}
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
              <span className="text-sm font-bold">4.9</span>
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </div>
            
            {/* Bookmark */}
            <div className="absolute top-4 right-4 w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          
          <CardContent className="p-4 bg-card">
            <h3 className="font-bold text-lg text-foreground">
              {t("Explore Ancient Wonders", "探索古老奇迹")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("10+ amazing destinations", "10+精彩目的地")}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Navigation / CTA */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm mt-8"
      >
        <Button 
          size="lg" 
          className="w-full text-lg font-semibold h-14 rounded-2xl shadow-lg bg-primary hover:bg-primary/90"
          onClick={handleLogin}
          data-testid="button-login"
        >
          {t("Start Your Journey", "开始旅程")}
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          {t("Secure access powered by Replit Auth", "由 Replit Auth 提供安全访问")}
        </p>
      </motion.div>
    </div>
  );
}
