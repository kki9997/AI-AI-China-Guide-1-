import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Compass, Clock, Star, ChevronRight, LogOut, BadgeCheck, PenLine, Settings, Loader2, MapPin, Shield } from "lucide-react";
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
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
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
    } catch {} finally { setLoading(false); }
  };

  const fetchGuideReg = async () => {
    try {
      const res = await fetch("/api/guide/my-registration");
      const data = await res.json();
      if (data.registration) {
        setGuideReg(data.registration);
        setPriceForm({ hourlyRate: String(data.registration.hourlyRate || ""), dailyRate: String(data.registration.dailyRate || ""), serviceDesc: data.registration.serviceDesc || "" });
      }
    } catch {}
  };

  const handleLogout = async () => {
    try { await apiRequest("POST", "/api/auth/phone/logout", {}); } catch {}
    localStorage.removeItem("app_user");
    setUser(null); setGuideReg(null);
    toast({ title: "已退出登录" });
  };

  const savePrice = async () => {
    setSavingPrice(true);
    try {
      const res = await apiRequest("PUT", "/api/guide/profile", priceForm);
      const data = await res.json();
      if (data.error) { toast({ title: "保存失败", description: data.error, variant: "destructive" }); return; }
      setGuideReg(data.registration); setEditPrice(false);
      toast({ title: "价格已更新 ✓" });
    } catch { toast({ title: "网络错误", variant: "destructive" }); }
    finally { setSavingPrice(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8f5f4] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 overflow-y-auto" style={{ background: "linear-gradient(170deg, #d6efed 0%, #e8f5f4 40%, #f0f9f8 100%)" }}>

      {/* ── Hero header ── */}
      <div className="pt-14 pb-8 flex flex-col items-center px-5 text-center">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative mb-5"
        >
          <div className="w-28 h-28 rounded-[28px] bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
            {user ? (
              <span className="text-4xl font-bold text-primary">{user.nickname?.[0] || "游"}</span>
            ) : (
              <User className="w-14 h-14 text-teal-300" />
            )}
          </div>
          {user?.isGuide && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </motion.div>

        {/* Title & subtitle */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {user ? (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-1">{user.nickname}</h1>
              <p className="text-sm text-teal-600 font-medium">{user.phoneMasked}</p>
              {user.isGuide && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-3 py-1 rounded-full bg-white/60 text-primary">
                  <BadgeCheck className="w-3.5 h-3.5" />认证导游
                </span>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">个人主页</h1>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[220px] mx-auto">
                登录后预约导游、查看订单，<br />注册成为导游赚钱
              </p>
            </>
          )}
        </motion.div>

        {/* Logout button for logged-in */}
        {user && (
          <button onClick={handleLogout} className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 font-medium">
            <LogOut className="w-3.5 h-3.5" />退出登录
          </button>
        )}
      </div>

      {/* ── Content cards ── */}
      <div className="px-4 flex flex-col gap-3">

        {!user ? (
          /* ─── Not logged in ─── */
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col gap-3">
            {/* Login card */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-5">
                <h2 className="text-base font-bold text-gray-800 mb-0.5">账号登录</h2>
                <p className="text-xs text-gray-500 mb-4">登录后享受完整旅游伴侣服务</p>

                <button
                  onClick={() => setAuthOpen(true)}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-sm"
                  data-testid="btn-login"
                >
                  手机号登录 / 注册
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">或</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "微信登录", color: "text-[#07c160]", bg: "bg-[#07c160]/8" },
                    { label: "支付宝登录", color: "text-blue-500", bg: "bg-blue-50" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => toast({ title: "即将上线", description: `${item.label}功能正在开发中` })}
                      className={`py-2.5 rounded-xl ${item.bg} ${item.color} text-sm font-semibold`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider row */}
              <div className="border-t border-gray-50" />

              {/* Security note */}
              <div className="px-5 py-3 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <p className="text-xs text-gray-400">手机号加密保存 · 数据安全有保障</p>
              </div>
            </div>

            {/* Guide CTA */}
            <div
              onClick={() => setAuthOpen(true)}
              className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer border border-amber-100 shadow-sm"
              data-testid="card-guide-register"
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
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex flex-col gap-3">

            {/* Account details card */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-2">
                <h2 className="text-base font-bold text-gray-800 mb-3">账号详情</h2>
              </div>
              {[
                { label: "手机号", value: user.phoneMasked },
                { label: "身份", value: user.isGuide ? "认证导游" : "普通用户" },
              ].map((row, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between border-t border-gray-50">
                  <span className="text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-800">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Guide dashboard or CTA */}
            {!user.isGuide ? (
              <div
                onClick={() => setLocation("/guide/register")}
                className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer border border-amber-100 shadow-sm"
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
              </div>
            ) : guideReg ? (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">导游主页管理</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${guideReg.status === "approved" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                    {guideReg.status === "approved" ? "✓ 已认证" : "审核中"}
                  </span>
                </div>
                {!editPrice ? (
                  <div className="space-y-2">
                    {[
                      { icon: Clock, label: "按小时收费", value: `¥${guideReg.hourlyRate || "--"}/小时` },
                      { icon: Star, label: "按天收费", value: `¥${guideReg.dailyRate || "--"}/天` },
                      { icon: MapPin, label: "服务城市", value: guideReg.city || "--" },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2 text-sm text-gray-600"><r.icon className="w-4 h-4 text-primary" />{r.label}</div>
                        <span className="font-bold text-gray-900">{r.value}</span>
                      </div>
                    ))}
                    <button onClick={() => setEditPrice(true)} className="mt-2 w-full py-2.5 rounded-xl border border-primary/20 text-primary text-sm font-semibold flex items-center justify-center gap-2" data-testid="btn-edit-price">
                      <PenLine className="w-4 h-4" />修改价格和介绍
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">时费 (¥/小时)</label>
                        <input type="number" value={priceForm.hourlyRate} onChange={(e) => setPriceForm(f => ({ ...f, hourlyRate: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none" data-testid="input-edit-hourly" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">日费 (¥/天)</label>
                        <input type="number" value={priceForm.dailyRate} onChange={(e) => setPriceForm(f => ({ ...f, dailyRate: e.target.value }))} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none" data-testid="input-edit-daily" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">服务介绍</label>
                      <textarea value={priceForm.serviceDesc} onChange={(e) => setPriceForm(f => ({ ...f, serviceDesc: e.target.value }))} rows={3} className="w-full bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none resize-none" data-testid="input-edit-desc" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditPrice(false)} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">取消</button>
                      <button onClick={savePrice} disabled={savingPrice} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-1" data-testid="btn-save-price">
                        {savingPrice ? <Loader2 className="w-4 h-4 animate-spin" /> : null}保存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Menu */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {[
                { icon: Clock, label: "我的预约记录", onClick: () => setLocation("/bookings") },
                { icon: Settings, label: "账号设置", onClick: () => {} },
              ].map((item, i) => (
                <button key={i} onClick={item.onClick} className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0" data-testid={`menu-${i}`}>
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => { setUser(u); if (u.isGuide) fetchGuideReg(); }}
        promptMsg="登录后享受完整旅游伴侣功能"
      />
      <BottomNav />
    </div>
  );
}
