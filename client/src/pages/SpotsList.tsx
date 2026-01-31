import { useState } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MapPin, Compass, Building2, TreePine, Sparkles, Star, Heart } from "lucide-react";

const categories = [
  { id: "all", icon: Sparkles, labelEn: "All", labelZh: "全部" },
  { id: "historical", icon: Building2, labelEn: "Historical", labelZh: "历史" },
  { id: "nature", icon: TreePine, labelEn: "Nature", labelZh: "自然" },
  { id: "landmark", icon: MapPin, labelEn: "Landmarks", labelZh: "地标" },
  { id: "entertainment", icon: Compass, labelEn: "Fun", labelZh: "娱乐" },
];

export default function SpotsList() {
  const { data: spots, isLoading } = useSpots();
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredSpots = spots?.filter(spot => 
    activeCategory === "all" || spot.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Destinations", "热门景点")} />
      
      <main className="pt-20 px-4 space-y-4 max-w-md mx-auto">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`rounded-full flex items-center gap-2 whitespace-nowrap ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "bg-card border-none shadow-sm hover:bg-card/80"
                }`}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`button-category-${cat.id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{language === 'en' ? cat.labelEn : cat.labelZh}</span>
              </Button>
            );
          })}
        </div>

        {/* Spots Grid */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-card rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSpots?.map((spot) => (
              <Link key={spot.id} href={`/spots/${spot.id}`} className="block group" data-testid={`card-spot-${spot.id}`}>
                <Card className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-3xl">
                  <div className="h-40 w-full overflow-hidden relative">
                    <img 
                      src={spot.imageUrl || "https://images.unsplash.com/photo-1526495124232-a04e1849168c?w=800&auto=format&fit=crop"} 
                      alt={spot.nameEn}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
                      <span className="text-sm font-bold text-foreground">4.{Math.floor(Math.random() * 4) + 5}</span>
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    </div>
                    
                    {/* Bookmark */}
                    <div className="absolute top-3 right-3 w-9 h-9 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                      <Heart className="w-4 h-4 text-foreground/60" />
                    </div>
                  </div>
                  
                  <CardContent className="p-4 bg-card">
                    <h3 className="font-bold text-lg text-foreground leading-tight font-serif">
                      {language === 'en' ? spot.nameEn : spot.nameZh}
                    </h3>
                    <div className="flex items-center text-muted-foreground text-sm mt-1.5">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      <span className="capitalize">{spot.category}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
