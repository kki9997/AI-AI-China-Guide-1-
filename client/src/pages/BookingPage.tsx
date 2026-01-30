import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useGuide } from "@/hooks/use-guides";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Star, MapPin, User, CreditCard, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const PLATFORM_FEE_PERCENT = 0.05;

export default function BookingPage() {
  const [, params] = useRoute("/book/:id");
  const guideId = params?.id ? parseInt(params.id) : 0;
  const { data: guide, isLoading } = useGuide(guideId);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [selectedDate, setSelectedDate] = useState("");
  const [hours, setHours] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Header title={t("Book Guide", "预约导游")} showBack />
        <div className="pt-20 px-4 text-center">
          <p className="text-muted-foreground">{t("Guide not found", "导游未找到")}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const guideRate = guide.hourlyRate * hours;
  const platformFee = Math.round(guideRate * PLATFORM_FEE_PERCENT * 100) / 100;
  const totalAmount = guideRate + platformFee;

  const handleBooking = async () => {
    if (!selectedDate || !hours) return;
    
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/bookings/checkout", {
        guideId: guide.id,
        tourDate: selectedDate,
        hours,
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert(t("Failed to create booking", "创建预约失败"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Book Guide", "预约导游")} showBack />
      
      <main className="pt-20 px-4 space-y-4 max-w-md mx-auto">
        {/* Guide Info Card */}
        <Card className="border-none shadow-md rounded-3xl">
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <Avatar className="w-16 h-16 rounded-2xl">
                <AvatarImage src={guide.photoUrl || undefined} className="object-cover" />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-bold text-lg">
                  {language === 'en' ? guide.nameEn : guide.nameZh}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{guide.city}</span>
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span>{guide.rating}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Selection */}
        <Card className="border-none shadow-md rounded-3xl">
          <CardContent className="p-4 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                {t("Tour Date", "游览日期")}
              </label>
              <input
                type="date"
                min={minDateStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground"
                data-testid="input-tour-date"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Clock className="w-4 h-4 text-primary" />
                {t("Duration (hours)", "时长（小时）")}
              </label>
              <div className="flex gap-2">
                {[2, 4, 6, 8].map((h) => (
                  <Button
                    key={h}
                    variant={hours === h ? "default" : "outline"}
                    size="sm"
                    onClick={() => setHours(h)}
                    className="flex-1 rounded-xl"
                    data-testid={`button-hours-${h}`}
                  >
                    {h}h
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Price Breakdown */}
        <Card className="border-none shadow-md rounded-3xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              {t("Price Breakdown", "费用明细")}
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("Guide fee", "导游费")} (¥{guide.hourlyRate} × {hours}h)
                </span>
                <span>¥{guideRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t("Service fee", "服务费")} (5%)
                </span>
                <span>¥{platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>{t("Total", "总计")}</span>
                <span className="text-secondary text-lg">¥{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Book Button */}
        <Button
          className="w-full h-14 rounded-2xl text-lg font-bold"
          disabled={!selectedDate || isSubmitting}
          onClick={handleBooking}
          data-testid="button-confirm-booking"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t("Processing...", "处理中...")}
            </>
          ) : (
            t("Confirm & Pay", "确认并支付")
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          {t("Secure payment powered by Stripe", "安全支付由 Stripe 提供")}
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
