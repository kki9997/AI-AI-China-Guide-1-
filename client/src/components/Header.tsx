import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Bell, ArrowLeft } from "lucide-react";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title, showBack }: HeaderProps) {
  const { toggleLanguage, language, t } = useLanguage();
  const [, setLocation] = useLocation();

  const handleSOS = () => {
    alert(t("Emergency services contacted!", "已联系紧急服务！"));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-10 h-10"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-xl font-bold text-foreground font-serif">
          {title || t("Slow Walk", "慢慢走")}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-card shadow-sm"
          onClick={handleSOS}
          data-testid="button-sos"
        >
          <ShieldAlert className="w-5 h-5 text-destructive" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-card shadow-sm"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-card shadow-sm"
          onClick={toggleLanguage}
          data-testid="button-language"
        >
          <span className="text-sm font-bold text-primary">
            {language === 'en' ? 'EN' : '中'}
          </span>
        </Button>
      </div>
    </header>
  );
}
