import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Loader2, Receipt } from "lucide-react";

export default function BookingsListPage() {
  const { t, language } = useLanguage();
  
  const { data: bookings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{t("Confirmed", "已确认")}</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{t("Pending", "待支付")}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{t("Cancelled", "已取消")}</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{t("Completed", "已完成")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t("My Bookings", "我的预约")} showBack />
      
      <main className="pt-20 px-4 space-y-4 max-w-md mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <Card className="border-none shadow-md rounded-3xl">
            <CardContent className="p-8 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-bold text-lg mb-2">
                {t("No Bookings Yet", "还没有预约")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("Your tour bookings will appear here", "您的导游预约将显示在这里")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card 
                key={booking.id} 
                className="border-none shadow-md rounded-3xl"
                data-testid={`card-booking-${booking.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg">
                        {booking.guide ? (language === 'en' ? booking.guide.nameEn : booking.guide.nameZh) : '-'}
                      </h3>
                      {booking.guide && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{booking.guide.city}</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="flex gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>{new Date(booking.tourDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{booking.hours}h</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      {t("Total", "总计")}
                    </span>
                    <span className="text-lg font-bold text-secondary">
                      ¥{booking.totalAmount?.toFixed(2)}
                    </span>
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
