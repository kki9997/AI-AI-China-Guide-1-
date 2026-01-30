import { useSpot } from "@/hooks/use-spots";
import { useLanguage } from "@/hooks/use-language";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useRoute } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlayCircle, PauseCircle, ChevronLeft, MapPin, Heart, Share2, Star } from "lucide-react";
import { Link } from "wouter";

export default function SpotDetail() {
  const [, params] = useRoute("/spots/:id");
  const id = parseInt(params?.id || "0");
  const { data: spot, isLoading: isLoadingSpot } = useSpot(id);
  const { t, language } = useLanguage();
  const { speak, stop, isSpeaking, isLoading: isLoadingAudio } = useTextToSpeech();

  if (isLoadingSpot || !spot) {
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
      {/* Header with back button */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center">
        <Link href="/spots">
          <Button variant="ghost" size="icon" className="rounded-2xl w-12 h-12 bg-card/90 backdrop-blur-sm shadow-lg">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="rounded-2xl w-12 h-12 bg-card/90 backdrop-blur-sm shadow-lg">
            <Heart className="w-5 h-5 text-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-2xl w-12 h-12 bg-card/90 backdrop-blur-sm shadow-lg">
            <Share2 className="w-5 h-5 text-foreground" />
          </Button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="h-[50vh] w-full relative">
        <img 
          src={spot.imageUrl || "https://images.unsplash.com/photo-1543159981-b5413f2747d9?w=800&auto=format&fit=crop"} 
          alt={name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        
        {/* Rating Badge */}
        <div className="absolute bottom-20 left-6 bg-card/90 backdrop-blur-sm rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg">
          <span className="text-lg font-bold text-foreground">4.{Math.floor(Math.random() * 4) + 5}</span>
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </div>
      </div>

      {/* Content Card */}
      <main className="px-4 -mt-12 relative z-20 space-y-4">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <CardContent className="p-6">
            {/* Category Tag */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full capitalize">
                {spot.category}
              </span>
            </div>
            
            {/* Title */}
            <h1 className="font-bold text-2xl text-foreground leading-tight mb-2">
              {name}
            </h1>

            {/* Location */}
            <div className="flex items-center text-muted-foreground text-sm mb-6">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{spot.lat.toFixed(2)}°N, {spot.lng.toFixed(2)}°E</span>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {description}
            </p>
          </CardContent>
        </Card>

        {/* Audio Guide Button */}
        <Button 
          size="lg" 
          className="w-full rounded-2xl h-14 text-base shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => isSpeaking ? stop() : speak(description, language)}
          disabled={isLoadingAudio}
          data-testid="button-audio-guide"
        >
          {isLoadingAudio ? (
            <>
              <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t("Loading...", "加载中...")}
            </>
          ) : isSpeaking ? (
            <>
              <PauseCircle className="w-6 h-6 mr-2" />
              {t("Stop Audio", "停止播放")}
            </>
          ) : (
            <>
              <PlayCircle className="w-6 h-6 mr-2" />
              {t("Play Audio Guide", "播放语音讲解")}
            </>
          )}
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
