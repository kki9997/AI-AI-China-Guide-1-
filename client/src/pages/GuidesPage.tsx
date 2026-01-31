import { useGuides } from "@/hooks/use-guides";
import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Star, MapPin, Languages, User, CalendarCheck } from "lucide-react";

export default function GuidesPage() {
  const { data: guides, isLoading } = useGuides();
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Tour Guides", "兼职导游")} />
      
      <main className="pt-20 px-4 space-y-4 max-w-md mx-auto">
        {/* Intro Section */}
        <Card className="border-none shadow-md rounded-3xl bg-primary/5">
          <CardContent className="p-4">
            <h2 className="font-bold text-lg text-foreground mb-1 font-serif">
              {t("Find a Local Guide", "找个本地向导")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("Connect with experienced local guides for personalized tours", "联系经验丰富的本地导游，获得个性化旅游体验")}
            </p>
          </CardContent>
        </Card>

        {/* Guides List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-card rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {guides?.map((guide) => (
              <Card 
                key={guide.id} 
                className="border-none shadow-md rounded-3xl overflow-hidden"
                data-testid={`card-guide-${guide.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <Avatar className="w-20 h-20 rounded-2xl">
                      <AvatarImage src={guide.photoUrl || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-xl">
                        <User className="w-8 h-8" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-lg text-foreground font-serif">
                            {language === 'en' ? guide.nameEn : guide.nameZh}
                          </h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{guide.city}</span>
                          </div>
                        </div>
                        
                        {/* Rating */}
                        <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold text-foreground">{guide.rating}</span>
                        </div>
                      </div>

                      {/* Languages */}
                      <div className="flex items-center gap-1 mt-2">
                        <Languages className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs text-muted-foreground">
                          {guide.languages?.join(", ")}
                        </span>
                      </div>

                      {/* Bio */}
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {language === 'en' ? guide.bioEn : guide.bioZh}
                      </p>
                    </div>
                  </div>

                  {/* Specialties */}
                  {guide.specialties && guide.specialties.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {guide.specialties.map((specialty, i) => (
                        <span 
                          key={i}
                          className="px-2.5 py-1 bg-accent text-accent-foreground text-xs rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Price and Book */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div>
                      <span className="text-xl font-bold text-secondary">
                        ¥{guide.hourlyRate}
                      </span>
                      <span className="text-sm text-muted-foreground">/{t("hour", "小时")}</span>
                    </div>
                    
                    <Button
                      className="rounded-xl bg-primary"
                      onClick={() => setLocation(`/book/${guide.id}`)}
                      data-testid={`button-book-${guide.id}`}
                    >
                      <CalendarCheck className="w-4 h-4 mr-1" />
                      {t("Book Now", "立即预约")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
