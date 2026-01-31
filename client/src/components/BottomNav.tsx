import { Link, useLocation } from "wouter";
import { Home, Map, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home },
    { href: "/map", icon: Map },
    { href: "/guides", icon: Users },
    { href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 bg-card rounded-3xl shadow-lg border border-border/30 z-50 max-w-md mx-auto">
      <div className="flex justify-around items-center h-14 px-4">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground"
              )}
              data-testid={`nav-${item.href.replace('/', '') || 'home'}`}
            >
              <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
