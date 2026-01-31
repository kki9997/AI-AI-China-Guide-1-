import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { SiWechat, SiApple, SiGoogle } from "react-icons/si";
import { Mail } from "lucide-react";
import logoImage from "@/assets/logo.png";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const authOptions = [
    { id: 'wechat', icon: SiWechat, label: '微信', color: 'bg-green-500', textColor: 'text-white' },
    { id: 'apple', icon: SiApple, label: '苹果', color: 'bg-black', textColor: 'text-white' },
    { id: 'email', icon: Mail, label: '邮箱', color: 'bg-blue-500', textColor: 'text-white' },
    { id: 'google', icon: SiGoogle, label: '谷歌', color: 'bg-white border border-border', textColor: 'text-foreground' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8"
        >
          <img 
            src={logoImage} 
            alt="慢慢走" 
            className="w-32 h-32 rounded-full object-cover shadow-lg"
          />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-foreground font-serif mb-2"
        >
          慢慢走
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground mb-10"
        >
          AI智能导游助手
        </motion.p>

        <Card className="w-full border-none shadow-lg rounded-3xl bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <p className="text-center text-sm text-muted-foreground mb-6">
              选择登录方式
            </p>
            
            <div className="flex justify-center gap-5">
              {authOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  onClick={handleLogin}
                  className={`flex flex-col items-center gap-2 group`}
                  data-testid={`button-auth-${option.id}`}
                >
                  <div 
                    className={`w-14 h-14 rounded-full ${option.color} flex items-center justify-center shadow-md hover-elevate active-elevate-2 transition-all`}
                  >
                    <option.icon className={`w-6 h-6 ${option.textColor}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          登录即表示您同意我们的服务条款
        </motion.p>
      </motion.div>
    </div>
  );
}
