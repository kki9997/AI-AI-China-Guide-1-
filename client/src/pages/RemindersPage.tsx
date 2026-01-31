import { useLanguage } from "@/hooks/use-language";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Bell, Calendar, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";

interface Reminder {
  id: number;
  titleEn: string;
  titleZh: string;
  descEn: string;
  descZh: string;
  time: string;
  location?: string;
  type: 'trip' | 'booking' | 'weather';
}

const mockReminders: Reminder[] = [
  {
    id: 1,
    titleEn: "Upcoming Tour",
    titleZh: "即将开始的行程",
    descEn: "Your tour with guide Li Wei starts tomorrow at 9:00 AM",
    descZh: "您与导游李伟的行程将于明天上午9:00开始",
    time: "2026-02-01 09:00",
    location: "Hengqin",
    type: 'booking'
  },
  {
    id: 2,
    titleEn: "Weather Alert",
    titleZh: "天气提醒",
    descEn: "Rain expected this afternoon in Zhuhai. Don't forget your umbrella!",
    descZh: "珠海今天下午预计有雨，别忘了带伞！",
    time: "Today 14:00",
    type: 'weather'
  }
];

export default function RemindersPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'weather': return Bell;
      default: return MapPin;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-blue-100 text-blue-600';
      case 'weather': return 'bg-orange-100 text-orange-600';
      default: return 'bg-green-100 text-green-600';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          {t("Reminders", "提醒")}
        </h1>
        <Bell className="w-5 h-5 text-primary ml-auto" />
      </div>

      {/* Reminders List */}
      <div className="flex-1 p-4 pb-28 space-y-3 overflow-y-auto">
        {mockReminders.map((reminder, index) => {
          const TypeIcon = getTypeIcon(reminder.type);
          return (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(reminder.type)}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {t(reminder.titleEn, reminder.titleZh)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t(reminder.descEn, reminder.descZh)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {reminder.time}
                        </span>
                        {reminder.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {reminder.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Empty state if no reminders */}
        {mockReminders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {t("No reminders yet", "暂无提醒")}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
