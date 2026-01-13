import { useSpots } from "@/hooks/use-spots";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { MapPin } from "lucide-react";

export default function SpotsList() {
  const { data: spots, isLoading } = useSpots();
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Destinations", "热门景点")} />
      
      <main className="pt-20 px-4 space-y-4 max-w-md mx-auto">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-2xl animate-pulse" />
          ))
        ) : (
          spots?.map((spot) => (
            <Link key={spot.id} href={`/spots/${spot.id}`} className="block group">
              <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card rounded-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10 pointer-events-none" />
                
                {/* Unsplash image with fallback */}
                <div className="h-32 w-full overflow-hidden">
                   {/* scenic landscape china architecture */}
                  <img 
                    src={spot.imageUrl || "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=800&auto=format&fit=crop"} 
                    alt={spot.nameEn}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="absolute bottom-0 left-0 p-4 z-20 w-full">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-white font-display font-bold text-xl drop-shadow-md">
                        {language === 'en' ? spot.nameEn : spot.nameZh}
                      </h3>
                      <div className="flex items-center text-white/80 text-xs mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="capitalize">{spot.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
