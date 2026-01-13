import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, User, Heart, Settings, History } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const menuItems = [
    { icon: Heart, label: t("Favorites", "我的收藏"), color: "text-red-500" },
    { icon: History, label: t("History", "游览历史"), color: "text-blue-500" },
    { icon: Settings, label: t("Settings", "设置"), color: "text-gray-500" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Profile", "个人中心")} />
      
      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary to-secondary rounded-full opacity-75 blur-sm" />
            <Avatar className="w-24 h-24 border-4 border-background relative">
              <AvatarImage src={user?.profileImageUrl} />
              <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                {user?.firstName?.[0] || <User />}
              </AvatarFallback>
            </Avatar>
          </div>
          <h2 className="mt-4 text-2xl font-display font-bold text-foreground">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground text-sm">
            {user?.email}
          </p>
        </div>

        <div className="grid gap-4">
          {menuItems.map((item, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center p-4">
                <div className={`p-3 rounded-full bg-background border border-border shadow-sm mr-4 ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive mt-8"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t("Log Out", "退出登录")}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
