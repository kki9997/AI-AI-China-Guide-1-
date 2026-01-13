import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Globe, ShieldAlert } from "lucide-react";

export function Header({ title }: { title?: string }) {
  const { toggleLanguage, language, t } = useLanguage();

  const handleSOS = () => {
    // In a real app, this would trigger a call or alert
    alert(t("Emergency services contacted!", "已联系紧急服务！"));
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 h-16 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-xl font-bold text-primary bg-clip-text">
          {title || t("Dragon Tour", "龙游中国")}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full shadow-lg shadow-destructive/20 w-8 h-8 hover:scale-105 transition-transform"
          onClick={handleSOS}
        >
          <ShieldAlert className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="rounded-full font-medium text-xs px-3 h-8 border-primary/20 hover:border-primary text-primary hover:bg-primary/5"
          onClick={toggleLanguage}
        >
          <Globe className="w-3 h-3 mr-1.5" />
          {language === 'en' ? 'EN' : '中'}
        </Button>
      </div>
    </header>
  );
}
