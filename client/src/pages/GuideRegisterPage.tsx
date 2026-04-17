import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, User, Phone, CreditCard, MapPin, FileText, DollarSign,
  CheckCircle2, Loader2, AlertCircle, ScrollText, ChevronDown, ChevronUp, X, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

// ─── Full contract text ───────────────────────────────────────────────────────
const CONTRACT_CLAUSES = [
  {
    title: "第一条 · 身份与资质承诺",
    body: "导游承诺本人所提交的姓名、身份证号码、联系电话等身份信息真实有效、完整准确，无任何伪造或冒用情形。导游保证本人无犯罪记录（包括但不限于暴力、诈骗、盗窃等刑事犯罪），身体健康，具备提供旅游带团服务的体力和精神条件。如因身份信息虚假导致任何法律后果，由导游本人承担全部责任。",
  },
  {
    title: "第二条 · 游客人身与财产安全保障",
    body: "导游在带团服务期间，须将游客的人身安全与财产安全放于首位。导游必须严格遵守道路交通规则、景区安全规定及当地法律法规，不得安排未经许可或存在安全隐患的活动。导游应在服务前告知游客注意事项，对有安全隐患的行程段主动提示，切实履行安全提醒义务。",
  },
  {
    title: "第三条 · 行程诚信与消费保护",
    body: "导游不得擅自更改事先约定的行程安排，如需调整须事先取得游客明确同意。导游严禁以任何形式强制游客消费、向游客索取额外费用或安排未经游客知情同意的购物环节。导游不得以欺骗、诱导、隐瞒等不正当手段引导游客消费，不得收取商家回扣并损害游客利益。",
  },
  {
    title: "第四条 · 安全责任与损害赔偿",
    body: "导游需对服务过程中游客的人身安全与财产安全承担看管提示义务。如因导游的疏忽大意、违规操作、故意行为或违反本协议约定，导致游客遭受人身伤害或财产损失，由导游承担相应民事赔偿责任及法律责任。平台作为信息撮合平台，不介入导游与游客之间的服务合同关系，不对导游个人行为引发的安全事故与纠纷承担连带责任，但平台将依法依规协助处理投诉和配合相关机构调查。",
  },
  {
    title: "第五条 · 文明服务与职业行为准则",
    body: "导游须保持专业、友善、耐心的服务态度，尊重游客的人格尊严、民族习俗与宗教信仰。导游严禁以任何方式辱骂、歧视、威胁、恐吓游客，不得实施任何有损游客权益的行为。导游应着装整洁，言行举止符合职业规范，树立中国旅游行业良好形象。",
  },
  {
    title: "第六条 · 数据授权与信息合规",
    body: "导游同意荡游者平台依据相关法律法规，对导游提交的身份信息、服务订单、支付记录等数据进行合法留存、核验与必要时的信息披露（如配合执法机构）。平台对上述数据采用 AES-256 军事级加密存储，仅在法律要求或纠纷处理必要时调取，不用于商业目的泄露。",
  },
  {
    title: "第七条 · 平台服务费与结算规则",
    body: "导游知悉并同意：平台对导游每笔成功完成的订单收取游客支付金额的 5% 作为平台信息撮合服务费，该费用在游客完成支付后由平台直接结算扣除，导游实际到手金额为订单金额的 95%。导游自主定价的时费与日费均为含平台服务费前的报价，平台将在导游后台显示预计到手金额。导游注册即表示已充分知悉并同意此项结算规则，不得事后以不知情为由提出异议。",
  },
  {
    title: "第八条 · 纠纷处理与协议效力",
    body: "本协议自导游勾选同意并完成注册之日起正式生效，对双方具有法律约束力。导游与游客之间因服务产生的纠纷，双方应首先协商解决；协商不成的，可向平台申诉，平台将依据订单记录与协议条款提供调解协助；仍不能解决的，依据《中华人民共和国消费者权益保护法》及相关法规，向有管辖权的人民法院提起诉讼。平台保留因导游严重违规行为冻结账户、下架主页及追究相应责任的权利。",
  },
];

// ─── Agreement Modal Component ───────────────────────────────────────────────
function AgreementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white rounded-t-[28px] shadow-2xl flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ScrollText className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">导游服务协议与安全责任合同</h2>
                  <p className="text-[10px] text-gray-500">荡游者平台 · 请仔细阅读全部条款</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Preamble */}
            <div className="px-5 py-3 bg-amber-50 flex-shrink-0">
              <p className="text-xs text-amber-800 leading-relaxed">
                本合同由<strong>荡游者平台</strong>（以下简称"平台"）与导游注册申请人（以下简称"导游"）共同订立。
                导游在荡游者平台提供服务期间，须严格遵守以下全部条款。勾选同意即表示导游已仔细阅读、充分理解并接受本合同的所有条款，本合同对双方具有法律约束力。
              </p>
            </div>

            {/* Clauses - scrollable */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
              {CONTRACT_CLAUSES.map((clause, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <span className="text-sm font-semibold text-gray-800 flex-1 pr-2">{clause.title}</span>
                    {expanded === i ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {expanded === i && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-gray-50">
                          <p className="text-xs text-gray-600 leading-relaxed pt-3">{clause.body}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Expand all note */}
              <p className="text-center text-xs text-gray-400 py-2">点击各条款标题可展开查看详细内容</p>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm"
              >
                已阅读，返回注册
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GuideRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, string>>({
    nameReal: "", phone: "", idCard: "", city: "", serviceDesc: "", hourlyRate: "", dailyRate: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
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
    if (!agreed) {
      toast({ title: "请先阅读并同意合同", description: "必须勾选《导游服务协议与安全责任合同》才能完成注册", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/guide/register", { ...form, agreedToContract: true });
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
    <div className="min-h-screen bg-background pb-28 overflow-y-auto">
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
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {field.label} <span className="text-rose-400">*</span>
                </label>
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
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                按小时收费 <span className="text-rose-400">*</span>
              </label>
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
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                按天收费 <span className="text-rose-400">*</span>
              </label>
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

          {/* Commission highlight */}
          <div className="mt-3 bg-amber-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>平台抽成 5%</strong>，每笔订单您实际到手 <strong>95%</strong>，低抽成、高回报
            </p>
          </div>
        </div>

        {/* ─── Service Agreement Card ─── */}
        <div className={`bg-white rounded-2xl shadow-sm p-4 border-2 transition-colors ${agreed ? "border-primary/30" : "border-transparent"}`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900">导游服务协议与安全责任合同</h3>
          </div>

          {/* Summary of key points */}
          <div className="space-y-2 mb-4">
            {[
              "承诺身份信息真实有效，无犯罪记录，身体健康",
              "服务期间保障游客人身与财产安全，遵守法律法规",
              "不得擅自改行程、强制消费或欺骗诱导游客",
              "因导游疏忽或违规导致损失，由导游承担相应责任",
              "平台仅提供信息撮合，不承担导游个人行为责任",
              "文明服务，尊重游客，不得辱骂歧视威胁游客",
              "同意平台对订单、支付、身份信息合法留存与核验",
              "平台每笔订单收取 5% 服务费，到手 95%",
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>

          {/* Read full button */}
          <button
            onClick={() => setAgreementOpen(true)}
            className="w-full py-2.5 rounded-xl border border-primary/30 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 mb-4"
            data-testid="btn-read-agreement"
          >
            <ScrollText className="w-3.5 h-3.5" />
            查看完整合同条款（共 8 条）
          </button>

          {/* Checkbox */}
          <button
            onClick={() => setAgreed((v) => !v)}
            className="w-full flex items-start gap-3 text-left"
            data-testid="checkbox-agreement"
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              agreed ? "bg-primary border-primary" : "border-gray-300 bg-white"
            }`}>
              {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              我已仔细阅读并完全同意
              <span className="text-primary font-semibold">《导游服务协议与安全责任合同》</span>
              及
              <span className="text-primary font-semibold">《平台抽成规则（5%）》</span>
              ，本合同对我具有法律约束力。
              <span className="text-rose-500 font-bold"> （必选）</span>
            </p>
          </button>

          {!agreed && (
            <p className="text-[10px] text-rose-400 mt-2 text-center">⚠ 未勾选合同协议将无法完成注册</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !agreed}
          className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
          data-testid="btn-submit-registration"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" />提交中...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" />提交注册申请</>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          提交后平台将在 1-3 个工作日内审核您的资质，审核通过后即可接单
        </p>
      </div>

      <BottomNav />
      <AgreementModal open={agreementOpen} onClose={() => setAgreementOpen(false)} />
    </div>
  );
}
