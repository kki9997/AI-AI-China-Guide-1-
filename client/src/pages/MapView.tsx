import { useEffect, useState } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import { Icon, DivIcon } from "leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, Info, Search, MapPin } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// --- Custom Marker Icons ---
const userIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const spotIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Get cute emoji based on category
function getCategoryEmoji(category: string) {
  switch (category) {
    case 'historical': return '🏯';
    case 'nature': return '🌸';
    case 'entertainment': return '🎡';
    case 'landmark': return '⭐';
    default: return '🌈';
  }
}

// Get cute color based on category
function getCategoryColor(category: string) {
  switch (category) {
    case 'historical': return { bg: '#ff9a9e', shadow: 'rgba(255, 154, 158, 0.5)' };
    case 'nature': return { bg: '#a8edea', shadow: 'rgba(168, 237, 234, 0.5)' };
    case 'entertainment': return { bg: '#ffecd2', shadow: 'rgba(255, 236, 210, 0.5)' };
    case 'landmark': return { bg: '#d299c2', shadow: 'rgba(210, 153, 194, 0.5)' };
    default: return { bg: '#89f7fe', shadow: 'rgba(137, 247, 254, 0.5)' };
  }
}

// Create custom cute label marker
function createLabelIcon(name: string, category: string) {
  const emoji = getCategoryEmoji(category);
  const colors = getCategoryColor(category);
  
  return new DivIcon({
    className: 'custom-label-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translateX(-50%);
        animation: bounce 2s ease-in-out infinite;
      ">
        <div style="
          background: linear-gradient(135deg, ${colors.bg} 0%, white 100%);
          color: #333;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 12px ${colors.shadow};
          border: 2px solid white;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span style="font-size: 16px;">${emoji}</span>
          ${name}
        </div>
        <div style="
          width: 12px;
          height: 12px;
          background: ${colors.bg};
          border-radius: 50%;
          margin-top: 4px;
          border: 2px solid white;
          box-shadow: 0 2px 6px ${colors.shadow};
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 50]
  });
}

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

// Component to recenter map
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function MapView() {
  const { data: spots, isLoading: isLoadingSpots } = useSpots();
  const { coords, loading: isLoadingLocation } = useLocation();
  const { t, language } = useLanguage();
  const { speak, isSpeaking, stop, isLoading: isLoadingAudio } = useTextToSpeech();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Initial center - Zhuhai fallback
  const center = coords || { lat: 22.27, lng: 113.58 };

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
      <div className="absolute top-4 left-4 right-4 z-[500] space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={t("Search nearby places", "搜索附近地点")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-12 rounded-full bg-card shadow-lg border-0"
            data-testid="input-search"
          />
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
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {coords && (
            <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
              <Popup className="font-sans">
                <div className="text-center p-1">
                  <p className="font-bold text-primary">{t("You are here", "您的位置")}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dotted path connecting spots */}
          {filteredSpots && filteredSpots.length > 1 && (
            <Polyline
              positions={filteredSpots.map(spot => [spot.lat, spot.lng] as [number, number])}
              pathOptions={{
                color: '#8B7355',
                weight: 3,
                opacity: 0.7,
                dashArray: '8, 12',
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {filteredSpots?.map((spot) => {
            const spotName = language === 'en' ? spot.nameEn : spot.nameZh;
            const labelIcon = createLabelIcon(spotName, spot.category);
            return (
              <Marker 
                key={spot.id} 
                position={[spot.lat, spot.lng]} 
                icon={labelIcon}
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
              </Marker>
            );
          })}
          
          {coords && <MapRecenter lat={coords.lat} lng={coords.lng} />}
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

        {/* GPS status indicator */}
        <div className="absolute bottom-40 right-4 z-[400]">
          <div className={cn(
            "w-10 h-10 rounded-full bg-card shadow-lg flex items-center justify-center",
            coords ? "text-green-500" : "text-yellow-500"
          )}>
            <MapPin className="w-5 h-5" />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
