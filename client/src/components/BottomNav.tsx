import { Link, useLocation } from "wouter";
import { Home, Map, Users, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_ITEMS = [
  { href: "/", icon: Home, label: "首页" },
  { href: "/community", icon: MessageCircle, label: "社区" },
];

const RIGHT_ITEMS = [
  { href: "/guides", icon: Users, label: "导游" },
  { href: "/profile", icon: User, label: "个人" },
];

export function BottomNav() {
  const [location] = useLocation();

  function isActive(href: string) {
    return location === href || (href !== "/" && location.startsWith(href));
  }

  function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 h-14 rounded-2xl transition-all duration-200",
          active ? "text-primary" : "text-gray-400"
        )}
        data-testid={`nav-${href.replace("/", "") || "home"}`}
      >
        <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
        <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-gray-400")}>
          {label}
        </span>
      </Link>
    );
  }

  const mapActive = isActive("/map");

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      {/* Floating center map button */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
        <Link
          href="/map"
          className={cn(
            "w-[58px] h-[58px] rounded-full shadow-xl flex items-center justify-center transition-transform duration-200 active:scale-95",
            mapActive
              ? "bg-gradient-to-br from-teal-400 to-pink-300 ring-4 ring-white"
              : "bg-gradient-to-br from-teal-400 to-pink-300 ring-4 ring-white/80"
          )}
          data-testid="nav-map"
        >
          <Map className="w-6 h-6 text-white" strokeWidth={2.2} />
        </Link>
      </div>

      {/* Nav bar */}
      <div className="bg-white/92 backdrop-blur-md rounded-3xl shadow-lg border border-white/70 flex items-center h-16 px-1">
        {LEFT_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Center spacer for the floating map button */}
        <div className="w-16 flex-shrink-0" />

        {RIGHT_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
