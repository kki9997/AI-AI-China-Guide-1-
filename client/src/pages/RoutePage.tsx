import { useLocation } from "wouter";
import { MapPin, Clock, Star, ChevronRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import img1 from "@/assets/images/50978d0b34620578897abed13911cbab7d5fbbf3.png";
import img2 from "@/assets/images/7af4a2b678c87e1f207534192b35d84c06243e16.png";

interface Route {
  id: string;
  name: string;
  subtitle: string;
  distance: string;
  duration: string;
  spots: number;
  rating: number;
  img: string;
  tags: string[];
  pois: string[];
}

const ROUTES: Route[] = [
  {
    id: "r1",
    name: "珠海海滨经典线",
    subtitle: "沿情侣路漫步，感受海风与城市",
    distance: "12 km",
    duration: "1 天",
    spots: 4,
    rating: 4.9,
    img: img1,
    tags: ["海滨", "网红"],
    pois: ["珠海渔女雕像", "情侣路", "珠海海滨公园", "野狸岛"],
  },
  {
    id: "r2",
    name: "万山群岛跳岛游",
    subtitle: "深蓝海域，探寻南海珍珠群岛",
    distance: "30 km",
    duration: "2 天",
    spots: 3,
    rating: 4.8,
    img: img2,
    tags: ["岛屿", "小众"],
    pois: ["万山岛", "担杆岛", "桂山岛"],
  },
  {
    id: "r3",
    name: "珠海历史文化游",
    subtitle: "探秘南屏古镇与国学书院",
    distance: "8 km",
    duration: "半天",
    spots: 4,
    rating: 4.7,
    img: img1,
    tags: ["文化", "历史"],
    pois: ["珠海博物馆", "南屏古镇", "中珠国学书院", "唐家湾古街"],
  },
  {
    id: "r4",
    name: "珠澳边境口岸游",
    subtitle: "连通澳门，体验双城文化魅力",
    distance: "5 km",
    duration: "半天",
    spots: 3,
    rating: 4.6,
    img: img2,
    tags: ["边境", "美食"],
    pois: ["拱北口岸", "珠海免税城", "莲花路美食街"],
  },
];

export default function RoutePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background px-5 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">旅行路线</h1>
          <p className="text-xs text-gray-500">{ROUTES.length} 条精选路线</p>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {ROUTES.map((route, i) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => setLocation("/map")}
            className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer"
            data-testid={`route-card-${route.id}`}
          >
            {/* Photo */}
            <div className="relative h-40">
              <img
                src={route.img}
                alt={route.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              {/* Tags */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {route.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/85 text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {/* Rating */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 rounded-full px-2.5 py-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-bold text-gray-800">{route.rating}</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-bold text-gray-900">{route.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{route.subtitle}</p>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>{route.spots} 个景点</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{route.duration}</span>
                </div>
                <span className="text-xs text-gray-400">{route.distance}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </div>

              {/* POI list */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {route.pois.map((poi) => (
                  <span
                    key={poi}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                  >
                    {poi}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
