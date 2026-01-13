import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";

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
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=2076&auto=format&fit=crop')] bg-cover bg-center flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-none shadow-2xl bg-background/90 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pt-10">
            <div className="w-20 h-20 bg-primary rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/30 rotate-3">
              <span className="text-4xl">🐉</span>
            </div>
            <div>
              <CardTitle className="text-3xl font-display text-primary">
                {t("Dragon Tour", "龙游中国")}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {t("Your AI Companion for Ancient Wonders", "您的名胜古迹AI伴侣")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-10 px-8">
            <Button 
              size="lg" 
              className="w-full text-lg font-semibold h-14 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
              onClick={handleLogin}
            >
              {t("Start Your Journey", "开始旅程")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("Secure access powered by Replit Auth", "由 Replit Auth 提供安全访问")}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
