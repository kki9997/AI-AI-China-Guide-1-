import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function BookingCancelPage() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [cancelled, setCancelled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get("booking_id");

  useEffect(() => {
    if (bookingId && !cancelled) {
      apiRequest("POST", `/api/bookings/${bookingId}/cancel`, {})
        .then(() => setCancelled(true))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [bookingId, cancelled]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("Booking Cancelled", "预约已取消")} />
      
      <main className="pt-20 px-4 space-y-6 max-w-md mx-auto">
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("Booking Cancelled", "预约已取消")}
          </h1>
          <p className="text-muted-foreground text-center mt-2">
            {t("Your booking has been cancelled. No payment was processed.", "您的预约已取消，未收取任何费用。")}
          </p>
        </div>

        <Card className="border-none shadow-md rounded-3xl">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {t("Would you like to try booking again?", "是否要重新预约？")}
            </p>
            <Button
              className="w-full h-12 rounded-2xl"
              onClick={() => setLocation("/guides")}
              data-testid="button-back-guides"
            >
              {t("Browse Guides", "浏览导游")}
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
