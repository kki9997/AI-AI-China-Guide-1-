import { useEffect } from "react";
import { useSpots } from "@/hooks/use-spots";
import { useLocation } from "@/hooks/use-location";
import { useLanguage } from "@/hooks/use-language";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { PlayCircle, Navigation, Info } from "lucide-react";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Link } from "wouter";

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
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

  // Initial center - Beijing fallback
  const center = coords || { lat: 39.9042, lng: 116.4074 };

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
      <Header />
      
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={13} 
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

          {spots?.map((spot) => (
            <Marker 
              key={spot.id} 
              position={[spot.lat, spot.lng]} 
              icon={spotIcon}
            >
              <Popup className="min-w-[200px]">
                <div className="p-1 space-y-2">
                  <h3 className="font-display font-bold text-lg text-primary">
                    {language === 'en' ? spot.nameEn : spot.nameZh}
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
                        <><PlayCircle className="w-3 h-3 mr-1" /> Audio</>
                      )}
                    </Button>
                    <Link href={`/spots/${spot.id}`}>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs border-primary/20 text-primary hover:bg-primary/5">
                        <Info className="w-3 h-3 mr-1" /> Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {coords && <MapRecenter lat={coords.lat} lng={coords.lng} />}
        </MapContainer>

        {/* Floating location indicator */}
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs font-medium shadow-md border border-border/50 text-muted-foreground flex items-center gap-2">
          <Navigation className="w-3 h-3 text-primary" />
          {coords ? t("GPS Active", "定位正常") : t("Using default location", "使用默认位置")}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
