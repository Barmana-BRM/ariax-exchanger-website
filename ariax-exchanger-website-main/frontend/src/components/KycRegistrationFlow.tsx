import { useEffect, useMemo, useState } from "react";
import type { User } from "../types";
import { authApi, normalizeUser } from "../services/api";
import { kycApi } from "../services/kycApi";
import LiveSelfieCamera from "./LiveSelfieCamera";
import { previewToFile } from "../utils/cameraCapture";
import { verifyFaceWithId } from "../utils/faceVerification";
import {
  KYC_DOCUMENT_ACCEPT,
  KYC_IMAGE_ACCEPT,
  formatKycFileSize,
  validateKycDocument,
  validateKycImage,
} from "../utils/kycAttachments";

type DraftStatus = "draft" | "pending_review" | "approved" | "rejected";
type StepStatus = "pending" | "approved" | "rejected";

interface KycSnapshot {
  draftToken: string;
  currentStep: number;
  overallStatus: DraftStatus;
  step1Status: StepStatus;
  step2Status: StepStatus;
  step3Status: StepStatus;
  faceMatchScore?: number;
  kycDetails?: {
    fullName?: string;
    nationalId?: string;
    phone?: string;
    email?: string;
    homeAddress?: string;
    nationalIdImage?: string;
    selfieImage?: string;
    supportingDocument?: string;
  };
}

interface KycRegistrationFlowProps {
  onBack: () => void;
  onRegister: (user: User) => void;
}

const LOCAL_DRAFT_KEY = "ariax_kyc_draft_token";

function statusLabel(status: DraftStatus | StepStatus) {
  switch (status) {
    case "approved":
      return "تأیید شده";
    case "rejected":
      return "رد شده";
    case "pending_review":
      return "در انتظار بررسی";
    default:
      return "در حال تکمیل";
  }
}

function statusTone(status: DraftStatus | StepStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "pending_review":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-slate-700/60 text-slate-300 border-slate-600/60";
  }
}

export default function KycRegistrationFlow({ onBack, onRegister }: KycRegistrationFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [draftToken, setDraftToken] = useState("");
  const [snapshot, setSnapshot] = useState<KycSnapshot | null>(null);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [idImage, setIdImage] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState("");
  const [idHint, setIdHint] = useState("");

  const [selfieImage, setSelfieImage] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState("");
  const [selfieHint, setSelfieHint] = useState("");
  const [faceScore, setFaceScore] = useState<number | null>(null);
  const [faceStatus, setFaceStatus] = useState<"verified" | "review" | "unavailable" | "failed" | "idle">("idle");
  const [faceDetails, setFaceDetails] = useState("");

  const [homeAddress, setHomeAddress] = useState("");
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [supportingPreview, setSupportingPreview] = useState("");
  const [supportingHint, setSupportingHint] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const fullName = useMemo(() => `${firstName.trim()} ${lastName.trim()}`.trim(), [firstName, lastName]);

  useEffect(() => {
    const token = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!token) return;

    setLoading(true);
    kycApi.getDraft(token)
      .then((draft) => {
        setDraftToken(draft.draftToken);
        setSnapshot(draft as unknown as KycSnapshot);
        setStep(Math.min(3, Math.max(1, draft.currentStep as 1 | 2 | 3)) as 1 | 2 | 3);
        if (draft.kycDetails) {
          setFirstName((draft.kycDetails.fullName ?? "").split(" ")[0] ?? "");
          setLastName((draft.kycDetails.fullName ?? "").split(" ").slice(1).join(" ") ?? "");
          setNationalId(draft.kycDetails.nationalId ?? "");
          setPhone(draft.kycDetails.phone ?? "");
          setEmail(draft.kycDetails.email ?? "");
          setHomeAddress(draft.kycDetails.homeAddress ?? "");
          setIdPreview(draft.kycDetails.nationalIdImage ?? "");
          setSelfiePreview(draft.kycDetails.selfieImage ?? "");
          setSupportingPreview(draft.kycDetails.supportingDocument ?? "");
        }
        setFaceScore(draft.faceMatchScore ?? null);
      })
      .catch(() => {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  function syncPreview(file: File | null, currentPreview: string, setPreview: (value: string) => void, setHint: (value: string) => void) {
    if (currentPreview.startsWith("blob:")) URL.revokeObjectURL(currentPreview);
    if (!file) {
      setPreview("");
      setHint("");
      return;
    }
    const preview = URL.createObjectURL(file);
    setPreview(preview);
    setHint(`${file.name} — ${formatKycFileSize(file.size)}`);
  }

  async function saveStepOne() {
    setError("");
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first) return setError("نام را وارد کنید");
    if (!last) return setError("نام خانوادگی را وارد کنید");
    if (!/^\d{10}$/.test(nationalId)) return setError("کد ملی باید ۱۰ رقم باشد");
    if (!/^09\d{9}$/.test(phone)) return setError("شماره تماس باید با 09 شروع شود و ۱۱ رقم باشد");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("فرمت ایمیل نامعتبر است");

    const imageError = validateKycImage(idImage, "عکس کارت ملی یا شناسنامه");
    if (imageError) return setError(imageError);

    setLoading(true);
    try {
      const draft = await kycApi.saveDraft({
        step: 1,
        draftToken: draftToken || undefined,
        firstName: first,
        lastName: last,
        nationalId,
        phone,
        email: email.trim() || undefined,
        nationalIdImage: idImage,
      });
      setDraftToken(draft.draftToken);
      setSnapshot(draft as unknown as KycSnapshot);
      localStorage.setItem(LOCAL_DRAFT_KEY, draft.draftToken);
      setStep(2);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "ذخیره مرحله اول ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  function handleSelfieCapture(file: File, previewUrl: string) {
    setError("");
    const validationError = validateKycImage(file, "عکس سلفی");
    if (validationError) {
      setError(validationError);
      return;
    }
    if (selfiePreview.startsWith("blob:")) URL.revokeObjectURL(selfiePreview);
    setSelfieImage(file);
    setSelfiePreview(previewUrl);
    setSelfieHint(`${file.name} — ${formatKycFileSize(file.size)}`);
    setFaceStatus("idle");
    setFaceScore(null);
    setFaceDetails("");
  }

  function clearSelfieCapture() {
    if (selfiePreview.startsWith("blob:")) URL.revokeObjectURL(selfiePreview);
    setSelfieImage(null);
    setSelfiePreview("");
    setSelfieHint("");
    setFaceStatus("idle");
    setFaceScore(null);
    setFaceDetails("");
  }

  async function saveStepTwo() {
    setError("");
    const imageError = validateKycImage(selfieImage, "عکس سلفی");
    if (imageError) return setError(imageError);
    if (!idImage && !idPreview) return setError("تصویر کارت ملی از مرحله قبل باید موجود باشد");

    setLoading(true);
    try {
      const idFileForVerify = idImage ?? (await previewToFile(idPreview, "national-id.jpg"));
      const verification =
        selfieImage && idFileForVerify
          ? await verifyFaceWithId(selfieImage, idFileForVerify)
          : { status: "unavailable" as const, score: 0, details: "احراز خودکار چهره در این مرورگر در دسترس نیست و بررسی دستی انجام می‌شود." };
      setFaceStatus(verification.status);
      setFaceScore(verification.score);
      setFaceDetails(verification.details);

      if (verification.status === "failed") {
        setError(verification.details);
        return;
      }

      const draft = await kycApi.saveDraft({
        step: 2,
        draftToken,
        faceMatchScore: verification.score,
        faceMatchStatus: verification.status,
        selfieImage,
      });
      setSnapshot(draft as unknown as KycSnapshot);
      localStorage.setItem(LOCAL_DRAFT_KEY, draft.draftToken);
      setStep(3);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "ذخیره مرحله دوم ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  async function finalizeRegistration() {
    setError("");
    if (!username.trim()) return setError("نام کاربری را وارد کنید");
    if (username.trim().length < 4) return setError("نام کاربری باید حداقل ۴ کاراکتر باشد");
    if (password.length < 6) return setError("رمز عبور باید حداقل ۶ کاراکتر باشد");
    if (password !== password2) return setError("تکرار رمز عبور مطابقت ندارد");

    const documentError = validateKycDocument(supportingDocument, "مدرک تکمیلی");
    if (documentError) return setError(documentError);

    setLoading(true);
    try {
      const draft = await kycApi.saveDraft({
        step: 3,
        draftToken,
        homeAddress: homeAddress.trim() || undefined,
        supportingDocument,
        supportingDocumentType: supportingDocument?.type || undefined,
      });
      setSnapshot(draft as unknown as KycSnapshot);

      const response = await authApi.register({
        draftToken: draft.draftToken,
        username: username.trim(),
        password,
        email: email.trim() || undefined,
      });

      localStorage.removeItem(LOCAL_DRAFT_KEY);
      onRegister(normalizeUser(response.user ?? response));
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "ثبت نهایی ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl shadow-emerald-950/30">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          <aside className="lg:col-span-2 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b lg:border-b-0 lg:border-l border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center">AX</div>
              <div>
                <h1 className="text-xl font-black">ثبت‌نام KYC</h1>
                <p className="text-xs text-slate-400 mt-1">فرم چندمرحله‌ای، ذخیره‌پذیر و قابل ادامه</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { title: "مرحله ۱", desc: "اطلاعات پایه و تصویر هویت", idx: 1 },
                { title: "مرحله ۲", desc: "سلفی زنده با کارت ملی", idx: 2 },
                { title: "مرحله ۳", desc: "آدرس و اطلاعات تکمیلی", idx: 3 },
              ].map((item) => (
                <button
                  key={item.idx}
                  type="button"
                  onClick={() => setStep(item.idx as 1 | 2 | 3)}
                  className={`w-full text-right rounded-2xl border p-4 transition-colors ${
                    step === item.idx ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${snapshot ? statusTone((snapshot as any)[`step${item.idx}Status`] ?? "pending") : statusTone("pending")}`}>
                      {snapshot ? statusLabel((snapshot as any)[`step${item.idx}Status`] ?? "pending") : "در انتظار"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {snapshot && (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>وضعیت نهایی</span>
                  <span className={`px-2 py-1 rounded-full border ${statusTone(snapshot.overallStatus)}`}>{statusLabel(snapshot.overallStatus)}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-900/60 p-2">
                    <div className="text-slate-500">کد پیگیری</div>
                    <div className="font-mono text-[11px] break-all mt-1">{snapshot.draftToken}</div>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-2">
                    <div className="text-slate-500">امتیاز چهره</div>
                    <div className="mt-1">{snapshot.faceMatchScore ?? faceScore ?? 0}</div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main className="lg:col-span-3 p-6 lg:p-8">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold">فرم ثبت‌نام چندمرحله‌ای</h2>
                <p className="text-xs text-slate-400 mt-1">اطلاعات هر مرحله ذخیره می‌شود و بعداً قابل ادامه است.</p>
              </div>
              <button onClick={onBack} type="button" className="text-xs text-slate-400 hover:text-white transition-colors">
                بازگشت
              </button>
            </div>

            <div className="mb-6 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(step / 3) * 100}%` }} />
            </div>

            {loading && <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">در حال ذخیره و همگام‌سازی امن اطلاعات...</div>}
            {error && <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="نام *" value={firstName} onChange={setFirstName} placeholder="علی" autoComplete="given-name" />
                  <Field label="نام خانوادگی *" value={lastName} onChange={setLastName} placeholder="رضایی" autoComplete="family-name" />
                </div>
                <Field label="شماره تماس *" value={phone} onChange={(value) => setPhone(value.replace(/\D/g, ""))} placeholder="09121234567" autoComplete="tel" inputMode="numeric" />
                <Field label="ایمیل (اختیاری)" value={email} onChange={setEmail} placeholder="user@example.com" autoComplete="email" type="email" />
                <Field label="کد ملی *" value={nationalId} onChange={(value) => setNationalId(value.replace(/\D/g, ""))} placeholder="0012345678" inputMode="numeric" dir="ltr" />

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">عکس کارت ملی یا شناسنامه *</label>
                  <p className="text-[11px] text-slate-500 mb-3">فرمت JPG/PNG و حداکثر 5MB</p>
                  <input
                    type="file"
                    accept={KYC_IMAGE_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      const validationError = validateKycImage(file, "عکس کارت ملی یا شناسنامه");
                      if (validationError) {
                        setError(validationError);
                        setIdImage(null);
                        syncPreview(null, idPreview, setIdPreview, setIdHint);
                        return;
                      }
                      setError("");
                      setIdImage(file);
                      syncPreview(file, idPreview, setIdPreview, setIdHint);
                    }}
                    className="w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:text-white file:text-xs"
                  />
                  {idHint && <div className="mt-2 text-[11px] text-emerald-400">{idHint}</div>}
                  {idPreview && <img src={idPreview} alt="پیش‌نمایش هویت" className="mt-3 max-h-44 w-full rounded-xl border border-slate-800 object-contain bg-slate-950/40" />}
                </div>

                <button type="button" onClick={saveStepOne} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition-colors">
                  ذخیره و ادامه به مرحله ۲
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="font-semibold">سلفی زنده با کارت ملی</div>
                      <div className="text-xs text-slate-400 mt-1">دوربین را روشن کنید، کارت ملی را کنار صورت بگیرید و همان لحظه سلفی بگیرید.</div>
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${statusTone(faceStatus === "idle" ? "pending" : faceStatus === "verified" ? "approved" : faceStatus === "failed" ? "rejected" : "pending_review")}`}>
                      {faceStatus === "idle" ? "در انتظار بررسی" : faceStatus === "verified" ? "تطبیق موفق" : faceStatus === "failed" ? "ناموفق" : "نیازمند بررسی"}
                    </span>
                  </div>

                  {idPreview && (
                    <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                      <div className="text-[11px] text-slate-500 mb-2">تصویر کارت ملی (مرحله ۱)</div>
                      <img src={idPreview} alt="کارت ملی" className="max-h-24 rounded-lg border border-slate-800 object-contain" />
                    </div>
                  )}

                  <LiveSelfieCamera
                    capturedPreview={selfiePreview}
                    disabled={loading}
                    onCapture={handleSelfieCapture}
                    onClear={clearSelfieCapture}
                  />

                  {selfieHint && <div className="mt-3 text-[11px] text-emerald-400">{selfieHint}</div>}
                  {faceDetails && <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">{faceDetails}</div>}
                  {typeof faceScore === "number" && faceScore > 0 && <div className="mt-3 text-xs text-slate-400">امتیاز تطبیق: {faceScore}/100</div>}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300 hover:border-slate-700">
                    بازگشت
                  </button>
                  <button type="button" onClick={saveStepTwo} className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition-colors">
                    ذخیره و ادامه به مرحله ۳
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Field label="آدرس محل سکونت" value={homeAddress} onChange={setHomeAddress} placeholder="تهران، خیابان ..." textarea />
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">اسناد تکمیلی (اختیاری)</label>
                  <p className="text-[11px] text-slate-500 mb-3">قبض برق، آب یا گواهی محل سکونت. JPG/PNG/PDF تا 10MB</p>
                  <input
                    type="file"
                    accept={KYC_DOCUMENT_ACCEPT}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      const validationError = validateKycDocument(file, "مدرک تکمیلی");
                      if (validationError) {
                        setError(validationError);
                        setSupportingDocument(null);
                        syncPreview(null, supportingPreview, setSupportingPreview, setSupportingHint);
                        return;
                      }
                      setError("");
                      setSupportingDocument(file);
                      syncPreview(file, supportingPreview, setSupportingPreview, setSupportingHint);
                    }}
                    className="w-full text-xs text-slate-400 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:text-white file:text-xs"
                  />
                  {supportingHint && <div className="mt-2 text-[11px] text-slate-400">{supportingHint}</div>}
                  {supportingPreview && supportingDocument?.type.startsWith("image/") && (
                    <img src={supportingPreview} alt="پیش‌نمایش مدرک" className="mt-3 max-h-44 w-full rounded-xl border border-slate-800 object-contain bg-slate-950/40" />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="نام کاربری *" value={username} onChange={setUsername} placeholder="username" autoComplete="username" />
                  <Field label="رمز عبور *" value={password} onChange={setPassword} placeholder="حداقل ۶ کاراکتر" type="password" autoComplete="new-password" />
                </div>
                <Field label="تکرار رمز عبور *" value={password2} onChange={setPassword2} placeholder="••••••" type="password" autoComplete="new-password" />

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300 hover:border-slate-700">
                    بازگشت
                  </button>
                  <button type="button" onClick={finalizeRegistration} className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition-colors">
                    ثبت نهایی و ایجاد حساب
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  dir,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  dir?: "ltr" | "rtl";
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-300">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-28 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          dir={dir}
          className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
        />
      )}
    </label>
  );
}
