import { Link, useLocation } from "wouter";
import { Map, Compass, MessageSquare, User, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", icon: Map, label: t("Map", "地图") },
    { href: "/spots", icon: Compass, label: t("Spots", "景点") },
    { href: "/guides", icon: Users, label: t("Guides", "导游") },
    { href: "/chat", icon: MessageSquare, label: t("AI", "AI") },
    { href: "/profile", icon: User, label: t("Me", "我的") },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 bg-card rounded-3xl shadow-lg border border-border/30 z-50 max-w-md mx-auto">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              data-testid={`nav-${item.href.replace('/', '') || 'map'}`}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-2xl transition-all",
                isActive && "bg-primary/10"
              )}>
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
