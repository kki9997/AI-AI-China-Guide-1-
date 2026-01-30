import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock, MapPin, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Booking, TourGuide } from "@shared/schema";

interface BookingWithGuide extends Booking {
  guide?: TourGuide;
}

export default function BookingSuccessPage() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [confirmed, setConfirmed] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("booking_id");

  const { data: booking, isLoading } = useQuery<BookingWithGuide>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (bookingId && !confirmed) {
      apiRequest("POST", `/api/bookings/${bookingId}/confirm`, {})
        .then(() => setConfirmed(true))
        .catch(console.error);
    }
  }, [bookingId, confirmed]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Booking Confirmed", "预约成功")} />
      
      <main className="pt-20 px-4 space-y-6 max-w-md mx-auto">
        {/* Success Icon */}
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("Booking Confirmed!", "预约成功！")}
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            {t("Your tour guide has been booked successfully.", "您的导游预约已成功确认。")}
          </p>
        </div>

        {/* Booking Details */}
        {booking && (
          <Card className="border-none shadow-md rounded-3xl">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold text-lg">
                {t("Booking Details", "预约详情")}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Guide", "导游")}</p>
                    <p className="font-medium">
                      {booking.guide ? (language === 'en' ? booking.guide.nameEn : booking.guide.nameZh) : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Date", "日期")}</p>
                    <p className="font-medium">
                      {new Date(booking.tourDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("Duration", "时长")}</p>
                    <p className="font-medium">{booking.hours} {t("hours", "小时")}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("Total Paid", "支付金额")}</span>
                  <span className="text-xl font-bold text-secondary">
                    ¥{booking.totalAmount?.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            className="w-full h-12 rounded-2xl"
            onClick={() => setLocation("/bookings")}
            data-testid="button-view-bookings"
          >
            {t("View My Bookings", "查看我的预约")}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl"
            onClick={() => setLocation("/guides")}
            data-testid="button-back-guides"
          >
            {t("Book Another Guide", "预约其他导游")}
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
