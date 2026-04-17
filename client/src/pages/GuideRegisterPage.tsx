import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, User, Phone, CreditCard, MapPin, FileText, DollarSign, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BottomNav } from "@/components/BottomNav";

interface Field { label: string; key: string; placeholder: string; type?: string; icon: any; hint?: string }

const FIELDS: Field[] = [
  { label: "真实姓名", key: "nameReal", placeholder: "请输入身份证上的真实姓名", icon: User },
  { label: "手机号码", key: "phone", placeholder: "请输入11位手机号", type: "tel", icon: Phone, hint: "加密保存，游客不可见" },
  { label: "身份证号码", key: "idCard", placeholder: "请输入18位身份证号", icon: CreditCard, hint: "严格加密保存，仅用于实名认证" },
  { label: "服务城市", key: "city", placeholder: "如：珠海、广州", icon: MapPin },
];

export default function GuideRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({
    nameReal: "", phone: "", idCard: "", city: "", serviceDesc: "", hourlyRate: "", dailyRate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.nameReal || !form.phone || !form.idCard || !form.city) {
      toast({ title: "信息不完整", description: "请填写所有必填字段", variant: "destructive" });
      return;
    }
    if (!form.hourlyRate || !form.dailyRate) {
      toast({ title: "请设置服务价格", description: "请填写按小时和按天的收费标准", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/guide/register", form);
      const data = await res.json();
      if (data.error) {
        toast({ title: "注册失败", description: data.error, variant: "destructive" });
        return;
      }
      const stored = JSON.parse(localStorage.getItem("app_user") || "{}");
      stored.isGuide = true;
      localStorage.setItem("app_user", JSON.stringify(stored));
      setDone(true);
    } catch {
      toast({ title: "网络错误", description: "请稍后重试", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 pb-24">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">注册成功！</h2>
          <p className="text-gray-500 text-sm mb-6">
            您已成功注册为荡游者认证导游，<br />游客现在可以预约您的服务
          </p>
          <button
            onClick={() => setLocation("/profile")}
            className="px-8 py-3 rounded-2xl bg-primary text-white font-semibold"
          >
            查看我的导游主页
          </button>
        </motion.div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => setLocation("/profile")} className="w-9 h-9 rounded-2xl bg-white shadow-sm flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">导游注册</h1>
          <p className="text-xs text-gray-500">实名认证 · 信息加密保护</p>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {/* Security notice */}
        <div className="bg-blue-50 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">信息安全保护</p>
            <p className="text-xs text-blue-600 mt-1">
              您的手机号和身份证号采用 AES-256 军事级加密存储，平台无法明文查看，游客只能看到打码后的信息。
            </p>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-4">实名认证信息</h3>
          <div className="flex flex-col gap-3">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{field.label} <span className="text-rose-400">*</span></label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3">
                  <field.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    data-testid={`input-${field.key}`}
                  />
                </div>
                {field.hint && <p className="text-[10px] text-gray-400 mt-1 ml-1">🔒 {field.hint}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Service description */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-4">服务介绍</h3>
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-3">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <textarea
              placeholder="介绍您的导游经验、擅长路线、特色服务等（选填）"
              value={form.serviceDesc}
              onChange={(e) => update("serviceDesc", e.target.value)}
              rows={4}
              className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 resize-none"
              data-testid="input-serviceDesc"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-1">服务定价</h3>
          <p className="text-xs text-gray-400 mb-4">设置您的服务收费标准（人民币）</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">按小时收费 <span className="text-rose-400">*</span></label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  type="number"
                  placeholder="如：200"
                  min="50" max="5000"
                  value={form.hourlyRate}
                  onChange={(e) => update("hourlyRate", e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none w-0"
                  data-testid="input-hourlyRate"
                />
                <span className="text-xs text-gray-400">/小时</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">按天收费 <span className="text-rose-400">*</span></label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3">
                <span className="text-sm text-gray-500">¥</span>
                <input
                  type="number"
                  placeholder="如：800"
                  min="100" max="20000"
                  value={form.dailyRate}
                  onChange={(e) => update("dailyRate", e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-900 outline-none w-0"
                  data-testid="input-dailyRate"
                />
                <span className="text-xs text-gray-400">/天</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">平台抽成 5%，其余 95% 直接汇入您的账户</p>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
          data-testid="btn-submit-registration"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <DollarSign className="w-5 h-5" />}
          {submitting ? "提交中..." : "提交注册申请"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          提交即视为同意荡游者导游服务协议，平台将审核您的资质
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
