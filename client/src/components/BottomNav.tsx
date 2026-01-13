import { Link, useLocation } from "wouter";
import { Map, List, MessageSquare, User } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { href: "/", icon: Map, label: t("Map", "地图") },
    { href: "/spots", icon: List, label: t("Spots", "景点") },
    { href: "/chat", icon: MessageSquare, label: t("AI Guide", "AI导游") },
    { href: "/profile", icon: User, label: t("Profile", "我的") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border z-50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current/10")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
