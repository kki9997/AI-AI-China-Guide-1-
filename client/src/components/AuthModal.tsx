import { useState } from "react";
import { X, Eye, EyeOff, UserCircle2, Lock, User, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
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

type Mode = "login" | "register";

const SPRING = { type: "spring", damping: 28, stiffness: 320 };

export function AuthModal({ open, onClose, onSuccess, promptMsg }: AuthModalProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setUsername(""); setPassword(""); setConfirmPwd(""); setNickname("");
    setShowPwd(false); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (loading) return;

    if (!username.trim() || !password) {
      toast({ title: "请填写完整信息", variant: "destructive" }); return;
    }

    if (mode === "register") {
      if (username.trim().length < 3) {
        toast({ title: "用户名至少 3 个字符", variant: "destructive" }); return;
      }
      if (password.length < 6) {
        toast({ title: "密码至少 6 位", variant: "destructive" }); return;
      }
      if (password !== confirmPwd) {
        toast({ title: "两次密码不一致", variant: "destructive" }); return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/password/login" : "/api/auth/password/register";
      const body = mode === "login"
        ? { username: username.trim(), password }
        : { username: username.trim(), password, nickname: nickname.trim() || undefined };

      const res = await apiRequest("POST", endpoint, body);
      const data = await res.json();

      if (data.error) {
        toast({ title: mode === "login" ? "登录失败" : "注册失败", description: data.error, variant: "destructive" });
        return;
      }

      localStorage.setItem("app_user", JSON.stringify(data.user));
      onSuccess(data.user);
      handleClose();
      toast({ title: mode === "login" ? "登录成功" : "注册成功", description: `欢迎，${data.user.nickname}` });
    } catch {
      toast({ title: "网络错误，请重试", variant: "destructive" });
    } finally { setLoading(false); }
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
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING}
            className="relative w-full max-w-md bg-white rounded-t-[32px] shadow-2xl overflow-hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              data-testid="btn-close-auth"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="px-6 pt-3 pb-8">
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === "login" ? "账号登录" : "创建账号"}
                </h2>
                {promptMsg && <p className="text-sm text-gray-500 mt-1">{promptMsg}</p>}
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5">
                {(["login", "register"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); reset(); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      mode === m
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                    data-testid={`tab-${m}`}
                  >
                    {m === "login" ? "登录" : "注册"}
                  </button>
                ))}
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                {/* Nickname (register only) */}
                <AnimatePresence>
                  {mode === "register" && (
                    <motion.div
                      key="nickname"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-primary/20">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="昵称（选填，可后改）"
                          maxLength={20}
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                          data-testid="input-nickname"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Username */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-primary/20">
                  <UserCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="用户名（3-20位，字母/数字/中文）"
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    data-testid="input-username"
                  />
                  {username.length >= 3 && (
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>

                {/* Password */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-primary/20">
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type={showPwd ? "text" : "password"}
                    placeholder={mode === "login" ? "请输入密码" : "密码（至少 6 位）"}
                    maxLength={64}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") handleSubmit(); }}
                    className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    data-testid="input-password"
                  />
                  <button onClick={() => setShowPwd((v) => !v)} type="button" className="p-0.5">
                    {showPwd
                      ? <EyeOff className="w-4 h-4 text-gray-400" />
                      : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>

                {/* Confirm password (register only) */}
                <AnimatePresence>
                  {mode === "register" && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-primary/20">
                        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                          type={showPwd ? "text" : "password"}
                          placeholder="再次输入密码"
                          maxLength={64}
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                          className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                          data-testid="input-confirm-password"
                        />
                        {confirmPwd && password === confirmPwd && (
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base mt-4 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
                data-testid="btn-auth-submit"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? "处理中..." : (mode === "login" ? "登录" : "注册")}
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                {mode === "login" ? "还没有账号？" : "已有账号？"}
                <button
                  className="text-primary font-semibold ml-1"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); reset(); }}
                >
                  {mode === "login" ? "立即注册" : "立即登录"}
                </button>
              </p>

              <p className="text-center text-xs text-gray-400 mt-2">
                登录即表示同意
                <span className="text-primary"> 用户协议 </span>和
                <span className="text-primary"> 隐私政策</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
