import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Globe, ShieldAlert, Bell } from "lucide-react";

export function Header({ title }: { title?: string }) {
  const { toggleLanguage, language, t } = useLanguage();

  const handleSOS = () => {
    alert(t("Emergency services contacted!", "已联系紧急服务！"));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-foreground">
          {title || t("Dragon Tour", "龙游中国")}
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
