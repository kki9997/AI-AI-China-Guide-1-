import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut, User, Heart, Settings, History, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const menuItems = [
    { icon: Heart, label: t("Favorites", "我的收藏"), color: "text-secondary" },
    { icon: History, label: t("History", "游览历史"), color: "text-primary" },
    { icon: Settings, label: t("Settings", "设置"), color: "text-muted-foreground" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Profile", "个人中心")} />
      
      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {/* Profile Card */}
        <Card className="border-none shadow-lg rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-background shadow-md">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {user?.firstName?.[0] || <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground font-serif">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-muted-foreground text-sm">
                {user?.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl cursor-pointer">
              <CardContent className="flex items-center p-4">
                <div className={`w-10 h-10 rounded-xl bg-background flex items-center justify-center mr-4 ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-foreground flex-1">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Logout Button */}
        <Button 
          variant="outline" 
          className="w-full h-14 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5 hover:text-destructive mt-6 shadow-sm"
          onClick={() => logout()}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5 mr-2" />
          {t("Log Out", "退出登录")}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
