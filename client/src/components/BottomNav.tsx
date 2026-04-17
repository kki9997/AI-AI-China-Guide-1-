import { Link, useLocation } from "wouter";
import { Home, Map, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "首页" },
  { href: "/map", icon: Map, label: "地图" },
  { href: "/guides", icon: Users, label: "导游" },
  { href: "/profile", icon: User, label: "个人" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-white/60 flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-12 rounded-2xl transition-all duration-200",
                isActive ? "text-primary" : "text-gray-400"
              )}
              data-testid={`nav-${item.href.replace("/", "") || "home"}`}
            >
              <item.icon
                className="w-5 h-5"
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-primary" : "text-gray-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
