import { useState, useRef, useEffect } from "react";
import { X, Phone, ChevronLeft, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { SiWechat, SiAlipay } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AppUser {
  userId: string;
  nickname: string;
  isGuide: boolean;
  phoneMasked: string;
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
  promptMsg?: string;
}

type Screen = "home" | "phone";

const SPRING = { type: "spring", damping: 28, stiffness: 320 };

export function AuthModal({ open, onClose, onSuccess, promptMsg }: AuthModalProps) {
  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>("home");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [oauthLoading, setOauthLoading] = useState<"wechat" | "alipay" | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) { setScreen("home"); setPhone(""); setOtp(""); setStep("phone"); setCountdown(0); }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [open]);

  // Auto-focus OTP input
  useEffect(() => { if (step === "otp") setTimeout(() => otpRef.current?.focus(), 150); }, [step]);

  const startCountdown = () => {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(countdownRef.current!); return 0; } return c - 1; });
    }, 1000);
  };

  const sendCode = async () => {
    if (sending || countdown > 0 || phone.length !== 11) return;
    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/phone/send", { phone });
      const data = await res.json();
      if (data.error) { toast({ title: "发送失败", description: data.error, variant: "destructive" }); return; }
      setStep("otp");
      startCountdown();
      if (data.devCode) {
        toast({ title: "【测试模式】验证码", description: `您的验证码是：${data.devCode}`, duration: 10000 });
      } else {
        toast({ title: "验证码已发送", description: `短信已发往 ${phone.slice(0, 3)}****${phone.slice(7)}` });
      }
    } catch {
      toast({ title: "网络错误", description: "请检查网络后重试", variant: "destructive" });
    } finally { setSending(false); }
  };

  const verify = async () => {
    if (verifying || otp.length !== 6) return;
    setVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/auth/phone/verify", { phone, code: otp });
      const data = await res.json();
      if (data.error) { toast({ title: "验证失败", description: data.error, variant: "destructive" }); return; }
      localStorage.setItem("app_user", JSON.stringify(data.user));
      onSuccess(data.user);
      onClose();
      toast({ title: "登录成功", description: `欢迎，${data.user.nickname}` });
    } catch {
      toast({ title: "网络错误", description: "请检查网络后重试", variant: "destructive" });
    } finally { setVerifying(false); }
  };

  // Auto-verify when 6 digits entered
  useEffect(() => { if (otp.length === 6 && step === "otp") verify(); }, [otp]);

  const handleOAuth = async (provider: "wechat" | "alipay") => {
    setOauthLoading(provider);
    try {
      const res = await fetch(`/api/auth/${provider}/start`);
      const data = await res.json();
      if (!data.configured) {
        toast({ title: "该登录方式尚未开通", description: data.message, duration: 5000 });
        return;
      }
      // Redirect to OAuth page
      window.location.href = data.url;
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    } finally { setOauthLoading(null); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING}
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl overflow-hidden"
            style={{ maxHeight: "92vh" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center z-10"
              data-testid="btn-close-auth"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <AnimatePresence mode="wait">
              {screen === "home" ? (
                /* ─── Home screen ─── */
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 pt-3 pb-8"
                >
                  {/* App identity */}
                  <div className="mb-7 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">登录 / 注册</h2>
                    {promptMsg && <p className="text-sm text-gray-500 mt-1">{promptMsg}</p>}
                    {!promptMsg && <p className="text-sm text-gray-500 mt-1">无需注册，直接授权即可使用</p>}
                  </div>

                  {/* WeChat */}
                  <button
                    onClick={() => handleOAuth("wechat")}
                    disabled={oauthLoading !== null}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-3 bg-[#07c160] text-white font-semibold text-base shadow-sm active:scale-[0.98] transition-transform disabled:opacity-70"
                    data-testid="btn-wechat-login"
                  >
                    {oauthLoading === "wechat" ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <SiWechat className="w-6 h-6" />
                    )}
                    <span className="flex-1 text-left">微信一键登录</span>
                    <span className="text-white/60 text-xs">快速</span>
                  </button>

                  {/* Alipay */}
                  <button
                    onClick={() => handleOAuth("alipay")}
                    disabled={oauthLoading !== null}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl mb-3 bg-[#1677FF] text-white font-semibold text-base shadow-sm active:scale-[0.98] transition-transform disabled:opacity-70"
                    data-testid="btn-alipay-login"
                  >
                    {oauthLoading === "alipay" ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <SiAlipay className="w-6 h-6" />
                    )}
                    <span className="flex-1 text-left">支付宝一键登录</span>
                    <span className="text-white/60 text-xs">快速</span>
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">或使用手机号</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  {/* Phone login entry */}
                  <button
                    onClick={() => setScreen("phone")}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-base active:scale-[0.98] transition-transform"
                    data-testid="btn-phone-login"
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-gray-500" />
                    </div>
                    <span className="flex-1 text-left">手机号验证码登录</span>
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-5">
                    登录即表示同意
                    <span className="text-primary cursor-pointer"> 用户协议 </span>和
                    <span className="text-primary cursor-pointer"> 隐私政策</span>
                  </p>
                </motion.div>
              ) : (
                /* ─── Phone screen ─── */
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 pt-3 pb-8"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => { setScreen("home"); setStep("phone"); setOtp(""); }}
                      className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">手机号登录</h2>
                      <p className="text-xs text-gray-500">收到验证码即自动登录</p>
                    </div>
                  </div>

                  {/* Phone input */}
                  <div className="mb-3">
                    <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-3.5 border border-transparent focus-within:border-primary/40 transition-colors">
                      <span className="text-sm font-semibold text-gray-600 mr-2">+86</span>
                      <div className="w-px h-4 bg-gray-200 mr-3" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="请输入手机号"
                        value={phone}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          setPhone(v);
                          if (step === "otp") { setStep("phone"); setOtp(""); }
                        }}
                        className="flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
                        data-testid="input-phone"
                      />
                      {phone.length === 11 && step === "phone" && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </div>

                  {/* OTP input – appears after code sent */}
                  <AnimatePresence>
                    {step === "otp" && (
                      <motion.div
                        key="otp"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center bg-gray-50 rounded-2xl px-4 py-3.5 border border-transparent focus-within:border-primary/40 transition-colors">
                          <input
                            ref={otpRef}
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="6 位验证码"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="flex-1 bg-transparent text-xl tracking-[0.4em] text-gray-900 outline-none placeholder:text-gray-300 placeholder:tracking-normal placeholder:text-base font-mono"
                            data-testid="input-otp"
                          />
                          <button
                            onClick={sendCode}
                            disabled={countdown > 0 || sending}
                            className="text-xs text-primary font-semibold disabled:text-gray-400 whitespace-nowrap ml-2"
                          >
                            {countdown > 0 ? `${countdown}s 后重发` : "重新获取"}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 px-1">
                          验证码已发送到 {phone.slice(0, 3)}****{phone.slice(7)}，有效期 5 分钟
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action button */}
                  {step === "phone" ? (
                    <button
                      onClick={sendCode}
                      disabled={phone.length !== 11 || sending}
                      className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
                      data-testid="btn-send-code"
                    >
                      {sending && <Loader2 className="w-5 h-5 animate-spin" />}
                      获取验证码
                    </button>
                  ) : (
                    <button
                      onClick={verify}
                      disabled={otp.length !== 6 || verifying}
                      className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
                      data-testid="btn-verify"
                    >
                      {verifying && <Loader2 className="w-5 h-5 animate-spin" />}
                      {verifying ? "验证中..." : "立即登录"}
                    </button>
                  )}

                  <p className="text-center text-xs text-gray-400 mt-4">
                    未注册的手机号将自动创建账号
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
