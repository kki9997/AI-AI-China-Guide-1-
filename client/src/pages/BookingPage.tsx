import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useGuide } from "@/hooks/use-guides";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Calendar, Clock, Star, MapPin, User, Loader2, ShieldCheck, CheckCircle2, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { AuthModal } from "@/components/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const PLATFORM_FEE = 0.05;

export default function BookingPage() {
  const [, params] = useRoute("/book/:id");
  const guideId = params?.id ? parseInt(params.id) : 0;
  const { data: guide, isLoading } = useGuide(guideId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState("");
  const [hours, setHours] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [appUser, setAppUser] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("app_user");
    if (stored) { try { setAppUser(JSON.parse(stored)); } catch {} }
    fetch("/api/auth/phone/me").then(r => r.json()).then(d => {
      if (d.user) { setAppUser(d.user); localStorage.setItem("app_user", JSON.stringify(d.user)); }
    }).catch(() => {});
  }, []);

  const minDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!guide) return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="预约导游" showBack />
      <div className="pt-20 px-4 text-center text-gray-400 pt-32">导游未找到</div>
      <BottomNav />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-24">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">预约成功！</h2>
        <p className="text-gray-500 text-sm mb-1">预约编号：<span className="font-bold text-primary">#{bookingId}</span></p>
        <p className="text-gray-500 text-sm mb-6 max-w-[260px] mx-auto">
          导游 <strong>{guide.nameZh}</strong> 将在 24 小时内联系您确认行程，请保持手机畅通。
        </p>
        <div className="bg-amber-50 rounded-2xl p-3 mb-6 text-xs text-amber-700">
          💡 支付功能即将上线，届时可在线预付订金保障行程
        </div>
        <div className="flex gap-3">
          <button onClick={() => setLocation("/bookings")} className="flex-1 py-3 rounded-2xl border border-primary text-primary font-semibold text-sm">
            查看预约
          </button>
          <button onClick={() => setLocation("/")} className="flex-1 py-3 rounded-2xl bg-primary text-white font-semibold text-sm">
            返回首页
          </button>
        </div>
      </motion.div>
      <BottomNav />
    </div>
  );

  const guideRate = guide.hourlyRate * hours;
  const platformFee = Math.round(guideRate * PLATFORM_FEE * 100) / 100;
  const total = guideRate + platformFee;

  const handleReserve = async () => {
    if (!appUser) { setAuthOpen(true); return; }
    if (!selectedDate) {
      toast({ title: "请选择游览日期", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/bookings/reserve", { guideId: guide.id, tourDate: selectedDate, hours });
      const data = await res.json();
      if (data.error) {
        toast({ title: "预约失败", description: data.error, variant: "destructive" }); return;
      }
      setBookingId(data.bookingId);
      setDone(true);
    } catch {
      toast({ title: "网络错误，请稍后重试", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <Header title="预约导游" showBack />

      <main className="pt-20 px-4 max-w-md mx-auto space-y-4">
        {/* Login prompt */}
        {!appUser && (
          <button onClick={() => setAuthOpen(true)} className="w-full bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-center gap-3" data-testid="btn-login-prompt">
            <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700 font-medium flex-1 text-left">预约需要登录账号</p>
            <span className="text-amber-500 text-xs font-bold">立即登录 ›</span>
          </button>
        )}

        {/* Guide card */}
        <div className="bg-white rounded-3xl shadow-sm p-4 flex gap-4 items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {guide.photoUrl
              ? <img src={guide.photoUrl} alt={guide.nameZh} className="w-full h-full object-cover" />
              : <User className="w-8 h-8 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900">{guide.nameZh}</h3>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{guide.city}</span>
              <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />{guide.rating}</span>
            </div>
            <p className="text-sm text-primary font-semibold mt-1">¥{guide.hourlyRate}/小时</p>
          </div>
        </div>

        {/* Date & Duration */}
        <div className="bg-white rounded-3xl shadow-sm p-4 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="w-4 h-4 text-primary" /> 游览日期 <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              min={minDate}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 text-gray-900 outline-none focus:ring-2 focus:ring-primary/20 border-none"
              data-testid="input-tour-date"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Clock className="w-4 h-4 text-primary" /> 服务时长
            </label>
            <div className="flex gap-2">
              {[2, 4, 6, 8].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    hours === h ? "bg-primary text-white" : "bg-gray-50 text-gray-600"
                  }`}
                  data-testid={`btn-hours-${h}`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-3xl shadow-sm p-4 space-y-2.5">
          <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />费用明细
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">导游费 (¥{guide.hourlyRate} × {hours}h)</span>
            <span className="font-medium">¥{guideRate.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">平台服务费 (5%)</span>
            <span className="font-medium">¥{platformFee.toFixed(0)}</span>
          </div>
          <div className="border-t border-gray-100 pt-2.5 flex justify-between font-bold text-base">
            <span>预计总费用</span>
            <span className="text-primary">¥{total.toFixed(0)}</span>
          </div>
          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-2.5 mt-1">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-600">支付功能即将上线。当前预约为免定金预约，导游联系确认后再协商付款方式。</p>
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleReserve}
          disabled={submitting || !selectedDate}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
          data-testid="button-confirm-booking"
        >
          {submitting ? <><Loader2 className="w-5 h-5 animate-spin" />提交中...</>
            : !appUser ? "登录后预约"
            : !selectedDate ? "请先选择日期"
            : "提交预约申请"}
        </button>

        <p className="text-xs text-center text-gray-400 pb-4">
          提交即视为同意平台服务条款，导游将在 24 小时内与您联系
        </p>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={(u) => setAppUser(u)} promptMsg="预约导游需要先登录" />
      <BottomNav />
    </div>
  );
}
