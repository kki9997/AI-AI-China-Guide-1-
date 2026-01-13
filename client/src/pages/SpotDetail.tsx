import { useSpot } from "@/hooks/use-spots";
import { useLanguage } from "@/hooks/use-language";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useRoute } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { PlayCircle, PauseCircle, ChevronLeft, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function SpotDetail() {
  const [, params] = useRoute("/spots/:id");
  const id = parseInt(params?.id || "0");
  const { data: spot, isLoading } = useSpot(id);
  const { t, language } = useLanguage();
  const { speak, stop, isSpeaking } = useTextToSpeech();

  if (isLoading || !spot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const name = language === 'en' ? spot.nameEn : spot.nameZh;
  const description = language === 'en' ? spot.descriptionEn : spot.descriptionZh;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="fixed top-0 left-0 right-0 z-50 p-4">
        <Link href="/spots">
          <Button variant="secondary" size="icon" className="rounded-full shadow-lg bg-white/90 hover:bg-white backdrop-blur-md">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </Button>
        </Link>
      </div>

      {/* Hero Image */}
      <div className="h-[45vh] w-full relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-background z-10" />
        {/* china ancient architecture detail */}
        <img 
          src={spot.imageUrl || "https://images.unsplash.com/photo-1543159981-b5413f2747d9?w=800&auto=format&fit=crop"} 
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>

      <main className="px-6 -mt-10 relative z-20 space-y-6">
        <div className="bg-card rounded-3xl p-6 shadow-xl shadow-black/5 border border-border/50">
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="inline-block px-3 py-1 bg-secondary/10 text-secondary-foreground text-xs font-bold rounded-full mb-2 uppercase tracking-wider">
                {spot.category}
              </span>
              <h1 className="font-display font-bold text-3xl text-primary leading-tight">
                {name}
              </h1>
            </div>
          </div>

          <div className="flex items-center text-muted-foreground text-sm mt-2 mb-6">
             <MapPin className="w-4 h-4 mr-1 text-primary/60" />
             <span>{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</span>
          </div>

          <div className="prose prose-stone prose-p:text-muted-foreground prose-headings:font-display max-w-none">
            <p className="leading-relaxed text-lg">
              {description}
            </p>
          </div>

          <div className="mt-8">
            <Button 
              size="lg" 
              className="w-full rounded-2xl h-14 text-lg shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-primary/90 hover:to-primary"
              onClick={() => isSpeaking ? stop() : speak(description, language)}
            >
              {isSpeaking ? (
                <>
                  <PauseCircle className="w-6 h-6 mr-2" />
                  {t("Stop Audio Guide", "停止讲解")}
                </>
              ) : (
                <>
                  <PlayCircle className="w-6 h-6 mr-2" />
                  {t("Play Audio Guide", "播放语音讲解")}
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
