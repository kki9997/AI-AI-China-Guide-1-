import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useGuide } from "@/hooks/use-guides";
import { useLanguage } from "@/hooks/use-language";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Star, MapPin, User, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { SiWechat, SiAlipay, SiPaypal } from "react-icons/si";
import { apiRequest } from "@/lib/queryClient";
import { AuthModal } from "@/components/AuthModal";
import { useToast } from "@/hooks/use-toast";

const PLATFORM_FEE_PERCENT = 0.05;

type PayMethod = "card" | "wechat" | "alipay" | "paypal";

const PAY_METHODS: { id: PayMethod; label: string; icon: any; note?: string }[] = [
  { id: "card",    label: "银行卡", icon: CreditCard },
  { id: "wechat",  label: "微信支付", icon: SiWechat,  note: "即将上线" },
  { id: "alipay",  label: "支付宝",   icon: SiAlipay,  note: "即将上线" },
  { id: "paypal",  label: "PayPal",   icon: SiPaypal,  note: "即将上线" },
];

export default function BookingPage() {
  const [, params] = useRoute("/book/:id");
  const guideId = params?.id ? parseInt(params.id) : 0;
  const { data: guide, isLoading } = useGuide(guideId);
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState("");
  const [hours, setHours] = useState(2);
  const [payMethod, setPayMethod] = useState<PayMethod>("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [appUser, setAppUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("app_user");
    if (stored) { try { setAppUser(JSON.parse(stored)); } catch {} }
    // verify session
    fetch("/api/auth/phone/me").then(r => r.json()).then(d => {
      if (d.user) { setAppUser(d.user); localStorage.setItem("app_user", JSON.stringify(d.user)); }
    }).catch(() => {});
  }, []);

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
    // Require login
    if (!appUser) { setAuthOpen(true); return; }
    if (!selectedDate || !hours) return;

    // Non-card payment methods – coming soon
    if (payMethod !== "card") {
      toast({ title: "该支付方式即将上线", description: "请暂时选择「银行卡」完成支付" });
      return;
    }

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
    } catch {
      toast({ title: t("Failed to create booking", "创建预约失败"), variant: "destructive" });
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
        {/* Login prompt */}
        {!appUser && (
          <div
            onClick={() => setAuthOpen(true)}
            className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3 cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium">预约需要登录，点击登录账号</p>
            <span className="ml-auto text-amber-400 text-xs font-semibold">立即登录 ›</span>
          </div>
        )}

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
                  {language === "en" ? guide.nameEn : guide.nameZh}
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

        {/* Date & Duration */}
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

        {/* Payment Method */}
        <Card className="border-none shadow-md rounded-3xl">
          <CardContent className="p-4">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              选择支付方式
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPayMethod(m.id)}
                  className={`relative flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    payMethod === m.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-gray-600"
                  }`}
                  data-testid={`pay-method-${m.id}`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                  {m.note && (
                    <span className="absolute top-1 right-1 text-[9px] text-gray-400">{m.note}</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Price Breakdown */}
        <Card className="border-none shadow-md rounded-3xl">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              费用明细（安全加密支付）
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

        {/* Confirm Button */}
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
          ) : appUser ? (
            t("Confirm & Pay", "确认并支付")
          ) : (
            "登录后支付"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          🔒 支付过程全程加密，金额防篡改，由 Stripe 安全处理
        </p>
      </main>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => setAppUser(u)}
        promptMsg="预约导游需要先登录账号"
      />
      <BottomNav />
    </div>
  );
}
