import { useState } from "react";
import { X, Phone, MessageSquare, Loader2, Shield } from "lucide-react";
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

export function AuthModal({ open, onClose, onSuccess, promptMsg }: AuthModalProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const sendCode = async () => {
    if (sending || countdown > 0) return;
    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/auth/phone/send", { phone });
      const data = await res.json();
      if (data.error) { toast({ title: "发送失败", description: data.error, variant: "destructive" }); return; }
      setStep("code");
      startCountdown();
      toast({
        title: "验证码已发送",
        description: data.devCode ? `【测试模式】验证码：${data.devCode}` : data.message,
      });
    } catch {
      toast({ title: "网络错误", description: "请检查网络后重试", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (verifying || code.length !== 6) return;
    setVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/auth/phone/verify", { phone, code });
      const data = await res.json();
      if (data.error) { toast({ title: "验证失败", description: data.error, variant: "destructive" }); return; }
      localStorage.setItem("app_user", JSON.stringify(data.user));
      onSuccess(data.user);
      onClose();
      toast({ title: "登录成功 🎉", description: `欢迎回来，${data.user.nickname}` });
    } catch {
      toast({ title: "网络错误", description: "请检查网络后重试", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
          >
            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">登录 / 注册</h2>
              {promptMsg && <p className="text-sm text-gray-500 mt-1">{promptMsg}</p>}
            </div>

            {/* Social login buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => toast({ title: "即将上线", description: "微信登录功能正在开发中" })}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#07c160]/10 text-[#07c160] font-semibold text-sm border border-[#07c160]/20"
                data-testid="btn-wechat-login"
              >
                <SiWechat className="w-5 h-5" />
                微信登录
              </button>
              <button
                onClick={() => toast({ title: "即将上线", description: "支付宝登录功能正在开发中" })}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 text-blue-600 font-semibold text-sm border border-blue-100"
                data-testid="btn-alipay-login"
              >
                <SiAlipay className="w-5 h-5" />
                支付宝登录
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">或手机号登录</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Phone input */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
                <span className="text-sm text-gray-500 font-medium">+86</span>
                <div className="w-px h-4 bg-gray-200" />
                <input
                  type="tel"
                  maxLength={11}
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  data-testid="input-phone"
                />
                <Phone className="w-4 h-4 text-gray-400" />
              </div>

              {step === "code" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3"
                >
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 tracking-widest"
                    data-testid="input-otp"
                  />
                  <button
                    onClick={sendCode}
                    disabled={countdown > 0 || sending}
                    className="text-xs text-primary font-medium disabled:text-gray-400"
                  >
                    {countdown > 0 ? `${countdown}s` : "重新获取"}
                  </button>
                </motion.div>
              )}

              {step === "phone" ? (
                <button
                  onClick={sendCode}
                  disabled={phone.length !== 11 || sending}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="btn-send-code"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  获取验证码
                </button>
              ) : (
                <button
                  onClick={verify}
                  disabled={code.length !== 6 || verifying}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="btn-verify"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  登录
                </button>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              登录即表示同意<span className="text-primary">用户协议</span>和<span className="text-primary">隐私政策</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
