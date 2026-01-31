import { useEffect, useState, useRef } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, Info, Search, MapPin, Navigation, X } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { TourSpot } from "@shared/schema";

const categories = [
  { id: 'all', labelEn: 'All', labelZh: '全部', emoji: '🌈' },
  { id: 'hengqin', labelEn: 'Hengqin', labelZh: '横琴', emoji: '🏝️' },
  { id: 'historical', labelEn: 'Historical', labelZh: '景点', emoji: '🏯' },
  { id: 'nature', labelEn: 'Nature', labelZh: '自然', emoji: '🌸' },
  { id: 'entertainment', labelEn: 'Fun', labelZh: '娱乐', emoji: '🎡' },
  { id: 'landmark', labelEn: 'Landmark', labelZh: '地标', emoji: '⭐' },
];

// Hengqin area bounding box (approximate)
const HENGQIN_BOUNDS = {
  minLat: 22.05,
  maxLat: 22.15,
  minLng: 113.48,
  maxLng: 113.58
};

function isInHengqin(lat: number, lng: number) {
  return lat >= HENGQIN_BOUNDS.minLat && 
         lat <= HENGQIN_BOUNDS.maxLat && 
         lng >= HENGQIN_BOUNDS.minLng && 
         lng <= HENGQIN_BOUNDS.maxLng;
}

// Component to fly to a location
function MapController({ targetLocation, zoom }: { targetLocation: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (targetLocation) {
      map.flyTo([targetLocation.lat, targetLocation.lng], zoom || 14, { duration: 1 });
    }
  }, [targetLocation, zoom, map]);
  return null;
}

export default function MapView() {
  const { data: spots, isLoading: isLoadingSpots } = useSpots();
  const { coords, loading: isLoadingLocation } = useLocation();
  const { t, language } = useLanguage();
  const { speak, isSpeaking, stop, isLoading: isLoadingAudio } = useTextToSpeech();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Initial center - Zhuhai fallback (Gongbei area)
  const center = { lat: 22.22, lng: 113.55 };

  // Search results for dropdown
  const searchResults = searchQuery.length > 0 ? spots?.filter(spot => {
    const name = language === 'en' ? spot.nameEn : spot.nameZh;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }).slice(0, 5) : [];

  // Handle clicking on a search result
  const handleSelectSpot = (spot: TourSpot) => {
    setTargetLocation({ lat: spot.lat, lng: spot.lng });
    setSearchQuery(language === 'en' ? spot.nameEn : spot.nameZh);
    setShowSearchResults(false);
  };

  // Handle locate me button
  const handleLocateMe = () => {
    if (coords) {
      setTargetLocation({ lat: coords.lat, lng: coords.lng });
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSearchResults(false);
  };

  // Filter spots by category and search
  const filteredSpots = spots?.filter(spot => {
    let matchesCategory = selectedCategory === 'all' || spot.category === selectedCategory;
    // Special handling for Hengqin filter - show spots within Hengqin area
    if (selectedCategory === 'hengqin') {
      matchesCategory = isInHengqin(spot.lat, spot.lng);
    }
    const name = language === 'en' ? spot.nameEn : spot.nameZh;
    const matchesSearch = !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoadingSpots || isLoadingLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">{t("Locating...", "定位中...")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col relative bg-background">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[500] space-y-3" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t("Search places or enter location", "搜索地点或输入位置")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="pl-10 pr-10 h-12 rounded-full bg-card shadow-lg border-0"
            data-testid="input-search"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
              onClick={handleClearSearch}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-lg overflow-hidden">
              {searchResults.map((spot) => (
                <button
                  key={spot.id}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                  onClick={() => handleSelectSpot(spot)}
                  data-testid={`search-result-${spot.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground font-serif">
                      {language === 'en' ? spot.nameEn : spot.nameZh}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{spot.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Button
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "rounded-full whitespace-nowrap gap-1.5 shrink-0 px-4",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-card shadow-sm"
                )}
                data-testid={`filter-${cat.id}`}
              >
                <span className="text-base">{cat.emoji}</span>
                {language === 'en' ? cat.labelEn : cat.labelZh}
              </Button>
            );
          })}
        </div>
      </div>
      
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={12} 
          scrollWheelZoom={true} 
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            className="warm-map"
          />

          {coords && (
            <CircleMarker 
              center={[coords.lat, coords.lng]} 
              radius={10}
              pathOptions={{ 
                fillColor: '#3b82f6', 
                fillOpacity: 0.9, 
                color: '#ffffff', 
                weight: 3 
              }}
            >
              <Popup className="font-sans">
                <div className="text-center p-1">
                  <p className="font-bold text-primary">{t("You are here", "您的位置")}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {filteredSpots?.map((spot) => {
            const spotName = language === 'en' ? spot.nameEn : spot.nameZh;
            return (
              <CircleMarker 
                key={spot.id} 
                center={[spot.lat, spot.lng]} 
                radius={8}
                pathOptions={{ 
                  fillColor: '#4d9f6f', 
                  fillOpacity: 0.9, 
                  color: '#ffffff', 
                  weight: 2 
                }}
              >
                <Popup className="min-w-[220px]">
                  <div className="p-1 space-y-2">
                    <h3 className="font-display font-bold text-lg text-primary">
                      {spotName}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {language === 'en' ? spot.descriptionEn : spot.descriptionZh}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90"
                        disabled={isLoadingAudio}
                        onClick={() => {
                          const text = language === 'en' ? spot.descriptionEn : spot.descriptionZh;
                          isSpeaking ? stop() : speak(text, language);
                        }}
                      >
                        {isLoadingAudio ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isSpeaking ? (
                          <>Stop</>
                        ) : (
                          <><PlayCircle className="w-3 h-3 mr-1" /> {t("Listen", "收听")}</>
                        )}
                      </Button>
                      <Link href={`/spots/${spot.id}`}>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/5">
                          <Info className="w-3 h-3 mr-1" /> {t("Details", "详情")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          
          <MapController targetLocation={targetLocation} />
        </MapContainer>

        {/* Bottom explore button */}
        <div className="absolute bottom-24 left-4 right-4 z-[400]">
          <Button 
            className="w-full h-12 rounded-full bg-card text-foreground shadow-lg hover:bg-card/90 border-0"
            variant="outline"
            onClick={() => {
              const message = language === 'zh' 
                ? `发现${filteredSpots?.length || 0}个景点，点击地图上的标签查看详情。`
                : `Found ${filteredSpots?.length || 0} spots. Tap labels on the map for details.`;
              speak(message, language === 'zh' ? 'zh' : 'en');
            }}
            data-testid="button-explore"
          >
            <span className="mr-2">👀</span>
            {t("Explore this area", "探索此区域")}
            <span className="ml-2 text-muted-foreground">
              ({filteredSpots?.length || 0})
            </span>
          </Button>
        </div>

        {/* Locate Me Button */}
        <div className="absolute bottom-40 right-4 z-[400] flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full bg-card shadow-lg border-0"
            onClick={handleLocateMe}
            disabled={!coords}
            data-testid="button-locate-me"
          >
            <Navigation className={cn("w-5 h-5", coords ? "text-primary" : "text-muted-foreground")} />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
