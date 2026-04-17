import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Compass, Clock, Star, DollarSign, ChevronRight, LogOut, BadgeCheck, PenLine, Settings, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { AuthModal } from "@/components/AuthModal";
import { apiRequest } from "@/lib/queryClient";

interface AppUser { userId: string; nickname: string; isGuide: boolean; phoneMasked: string }
interface GuideReg {
  status: string; nameReal: string; phoneMasked: string; idCardMasked: string;
  city?: string; serviceDesc?: string; hourlyRate?: number; dailyRate?: number; photoUrl?: string;
}

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<AppUser | null>(null);
  const [guideReg, setGuideReg] = useState<GuideReg | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editPrice, setEditPrice] = useState(false);
  const [priceForm, setPriceForm] = useState({ hourlyRate: "", dailyRate: "", serviceDesc: "" });
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("app_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    fetchMe();
  }, []);

  const fetchMe = async () => {
    try {
      const res = await fetch("/api/auth/phone/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("app_user", JSON.stringify(data.user));
        if (data.user.isGuide) fetchGuideReg();
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const fetchGuideReg = async () => {
    try {
      const res = await fetch("/api/guide/my-registration");
      const data = await res.json();
      if (data.registration) {
        setGuideReg(data.registration);
        setPriceForm({
          hourlyRate: String(data.registration.hourlyRate || ""),
          dailyRate: String(data.registration.dailyRate || ""),
          serviceDesc: data.registration.serviceDesc || "",
        });
      }
    } catch {}
  };

  const handleLogout = async () => {
    try { await apiRequest("POST", "/api/auth/phone/logout", {}); } catch {}
    localStorage.removeItem("app_user");
    setUser(null);
    setGuideReg(null);
    toast({ title: "已退出登录" });
  };

  const savePrice = async () => {
    setSavingPrice(true);
    try {
      const res = await apiRequest("PUT", "/api/guide/profile", priceForm);
      const data = await res.json();
      if (data.error) { toast({ title: "保存失败", description: data.error, variant: "destructive" }); return; }
      setGuideReg(data.registration);
      setEditPrice(false);
      toast({ title: "价格已更新 ✓" });
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setSavingPrice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto">
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">个人主页</h1>
      </div>

      <div className="px-5 flex flex-col gap-4">
        {!user ? (
          /* ─── Not logged in ─── */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-3xl shadow-sm p-6 text-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-1">登录享受完整功能</h2>
              <p className="text-sm text-gray-500 mb-5">登录后可预约导游、查看订单、注册成为导游</p>
              <button
                onClick={() => setAuthOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold"
                data-testid="btn-login"
              >
                登录 / 注册
              </button>
            </div>

            <div
              onClick={() => setAuthOpen(true)}
              className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer border border-amber-100"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Compass className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">我是导游 · 申请入驻</p>
                <p className="text-xs text-gray-500 mt-0.5">接单赚钱，灵活排期，平台抽成仅5%</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </div>
          </motion.div>
        ) : (
          /* ─── Logged in ─── */
          <>
            {/* User card */}
            <div className="bg-white rounded-3xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary">
                  {user.nickname?.[0] || "游"}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900">{user.nickname}</h2>
                  {user.isGuide && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <BadgeCheck className="w-3 h-3" />认证导游
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{user.phoneMasked}</p>
              </div>
              <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Guide registration CTA or Dashboard */}
            {!user.isGuide ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setLocation("/guide/register")}
                className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer border border-amber-100"
                data-testid="card-guide-register"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Compass className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">我是导游 · 立即申请入驻</p>
                  <p className="text-xs text-gray-500 mt-0.5">接单赚钱，灵活排期，平台抽成仅5%</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </motion.div>
            ) : guideReg ? (
              /* Guide dashboard */
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">导游主页管理</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${guideReg.status === "approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                    {guideReg.status === "approved" ? "✓ 已认证" : "审核中"}
                  </span>
                </div>

                {/* Price display / edit */}
                {!editPrice ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-primary" />
                        按小时收费
                      </div>
                      <span className="font-bold text-gray-900">¥{guideReg.hourlyRate || "--"}/小时</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Star className="w-4 h-4 text-primary" />
                        按天收费
                      </div>
                      <span className="font-bold text-gray-900">¥{guideReg.dailyRate || "--"}/天</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-primary" />
                        服务城市
                      </div>
                      <span className="font-bold text-gray-900">{guideReg.city || "--"}</span>
                    </div>
                    <button
                      onClick={() => setEditPrice(true)}
                      className="mt-2 w-full py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-semibold flex items-center justify-center gap-2"
                      data-testid="btn-edit-price"
                    >
                      <PenLine className="w-4 h-4" />修改价格和介绍
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">时费 (¥/小时)</label>
                        <input type="number" value={priceForm.hourlyRate} onChange={(e) => setPriceForm(f => ({ ...f, hourlyRate: e.target.value }))}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none" data-testid="input-edit-hourly" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">日费 (¥/天)</label>
                        <input type="number" value={priceForm.dailyRate} onChange={(e) => setPriceForm(f => ({ ...f, dailyRate: e.target.value }))}
                          className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none" data-testid="input-edit-daily" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">服务介绍</label>
                      <textarea value={priceForm.serviceDesc} onChange={(e) => setPriceForm(f => ({ ...f, serviceDesc: e.target.value }))}
                        rows={3} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                        data-testid="input-edit-desc" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditPrice(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">取消</button>
                      <button onClick={savePrice} disabled={savingPrice} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-1"
                        data-testid="btn-save-price">
                        {savingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : null}保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Menu items */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {[
                { icon: Clock, label: "我的预约记录", onClick: () => setLocation("/bookings") },
                { icon: Settings, label: "账号设置", onClick: () => {} },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0"
                  data-testid={`menu-${i}`}>
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => { setUser(u); if (u.isGuide) fetchGuideReg(); }}
      />
      <BottomNav />
    </div>
  );
}

// Import missing icon
function MapPin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}
