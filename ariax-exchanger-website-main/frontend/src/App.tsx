import { useState, useEffect, useRef, useCallback } from "react";
import type { Key, ReactNode } from "react";
import * as XLSX from "xlsx";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { authApi, txApi, usersApi, ticketsApi, loadAppData, normalizeUser, marketApi } from './services/api';
import { validateKycIdImage, formatKycFileSize, KYC_IMAGE_ACCEPT } from './utils/kycUpload';
import KycAdminReport from './components/KycAdminReport';
import KycRegistrationFlow from './components/KycRegistrationFlow';
import { ROLE_LABELS, type AppRole } from './security/rbac';


// ══════════════════════════════════════════════════════════════
//  TYPES (inline از types.ts)
// ══════════════════════════════════════════════════════════════
interface KYCDetails {
  fullName: string; nationalId: string; phone: string; email?: string; timestamp?: string;
  rejectionReason?: string; nationalIdImage?: string; selfieImage?: string; supportingDocument?: string;
  homeAddress?: string; draftToken?: string; currentStep?: number;
  step1Status?: string; step2Status?: string; step3Status?: string;
  overallStatus?: string; faceMatchScore?: number;
}
interface AppUser {
  id: string; name: string; avatarColor: string; role: AppRole;
  username: string; password: string;
  balances: { IRT: number; BTC: number; ETH: number; USDT: number; TRX: number };
  cryptoAddresses: { BTC: string; USDT: string; TRX: string };
  cardNo: string; shibaNo: string;
  kycStatus: "unverified" | "pending" | "verified" | "rejected";
  kycVerified: boolean;
  kycDetails?: KYCDetails;
}
interface Transaction {
  id: string; userId: string; userName: string;
  type: "deposit" | "withdraw" | "trade";
  asset: "IRT" | "BTC" | "ETH" | "USDT" | "TRX";
  amount: number; fee: number; timestamp: string;
  status: "completed" | "pending" | "rejected";
  destination: string; txId?: string;
  homeAddress?: string; postalCode?: string; requiresExtended?: boolean;
}
interface Ticket { id: string; userId: string; userName: string; subject: string; category: "wallet" | "support" | "technical" | "kyc" | "other"; status: "open" | "in_progress" | "closed"; createdAt: string; updatedAt: string; }
interface TicketMessage { id: string; ticketId: string; senderId: string; senderName: string; senderRole: "user" | "admin"; message: string; timestamp: string; }
interface MarketTicker { symbol: "BTC" | "ETH" | "USDT" | "TRX"; name: string; faName: string; priceIRT: number; priceUSD: number; change24h: number; volume24h: number; high24h: number; low24h: number; history: { time: string; price: number; volume: number }[]; }

// ══════════════════════════════════════════════════════════════
//  INITIAL DATA
// ══════════════════════════════════════════════════════════════
const HIGH_TX_THRESHOLDS: Record<string, number> = {
  IRT: 10_000_000, BTC: 0.01, ETH: 0.5, USDT: 1000, TRX: 50_000,
};
function requiresExtendedVerification(asset: string, amount: number) {
  const limit = HIGH_TX_THRESHOLDS[asset];
  return limit !== undefined && amount >= limit;
}
function fmtThreshold(asset: string) {
  const v = HIGH_TX_THRESHOLDS[asset];
  return v === undefined ? "—" : v.toLocaleString();
}
const TYPE_MAP: Record<string, string> = { deposit: "واریز", withdraw: "برداشت", trade: "معامله" };
const STATUS_MAP: Record<string, string> = { completed: "تکمیل‌شده", pending: "در انتظار", rejected: "رد شده" };
const KYC_LABEL: Record<string, string> = { verified: "تأیید شده", pending: "در انتظار", unverified: "احراز نشده", rejected: "رد شده" };
const TICKET_STATUS: Record<string, string> = { open: "باز", in_progress: "در حال بررسی", closed: "بسته" };
const TICKET_CAT: Record<string, string> = { wallet: "کیف پول", support: "پشتیبانی", technical: "فنی", kyc: "احراز هویت", other: "سایر" };
const MONTHS = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function useAppRouter() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    setPathname(path);
  }, []);
  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isRegisterRoute = pathname === "/register";
  return { pathname, navigate, isAdminRoute, isRegisterRoute };
}


function fmtIRT(n: number) { return n >= 1e9 ? `${(n / 1e9).toFixed(2)} میلیارد` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} میلیون` : `${n.toLocaleString()}`; }
function nowStr() { const d = new Date(); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

function TicketStatusBadge({ s }: { s: string }) {
  const cfg: Record<string, string> = { open: "bg-blue-500/10 text-blue-400 border-blue-500/20", in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20", closed: "bg-slate-600/30 text-slate-400 border-slate-600/50" };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${cfg[s] || cfg.open}`}>{TICKET_STATUS[s] || s}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const cfg: Record<string, string> = { completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", pending: "bg-amber-500/10 text-amber-400 border-amber-500/20", rejected: "bg-red-500/10 text-red-400 border-red-500/20" };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${cfg[s] || cfg.pending}`}>{STATUS_MAP[s] || s}</span>;
}
function KycBadge({ k }: { k: string }) {
  const cfg: Record<string, string> = { verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", pending: "bg-amber-500/10 text-amber-400 border-amber-500/20", unverified: "bg-slate-700/50 text-slate-400 border-slate-600/50", rejected: "bg-red-500/10 text-red-400 border-red-500/20" };
  return <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${cfg[k] || cfg.unverified}`}>{KYC_LABEL[k] || k}</span>;
}
function Avatar({ name, color, size = 8 }: { name: string; color: string; size?: number }) {
  return <div style={{ background: color + "22", color, width: size * 4, height: size * 4, minWidth: size * 4 }} className="rounded-full flex items-center justify-center font-bold text-sm">{name[0]}</div>;
}
function Card({ children, className = "" }: { children: ReactNode; className?: string; key?: Key }) {
  return <div className={`bg-slate-800/50 border border-slate-700/50 rounded-xl ${className}`}>{children}</div>;
}
function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-slate-200 font-semibold text-sm mb-3">{children}</h3>;
}

// ══════════════════════════════════════════════════════════════
//  REGISTER PAGE  (ثبت‌نام + تطابق کد ملی / موبایل)
// ══════════════════════════════════════════════════════════════
function RegisterPage({ onBack, onRegister }: { onBack: () => void; onRegister: (u: AppUser) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [idImage, setIdImage] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState("");
  const [fileHint, setFileHint] = useState("");
  const [err, setErr] = useState("");

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  function onIdImageChange(file: File | null) {
    setErr("");
    const validationErr = validateKycIdImage(file);
    if (validationErr) {
      setErr(validationErr);
      setIdImage(null);
      if (idPreview) URL.revokeObjectURL(idPreview);
      setIdPreview("");
      setFileHint("");
      return;
    }
    setIdImage(file);
    if (idPreview) URL.revokeObjectURL(idPreview);
    setIdPreview(file ? URL.createObjectURL(file) : "");
    setFileHint(file ? `${file.name} — ${formatKycFileSize(file.size)}` : "");
  }

  function checkIdentity() {
    setErr("");
    if (!firstName.trim()) { setErr("نام را وارد کنید"); return; }
    if (!lastName.trim()) { setErr("نام خانوادگی را وارد کنید"); return; }
    if (nationalId.length !== 10) { setErr("کد ملی باید ۱۰ رقم باشد"); return; }
    if (!/^09\d{9}$/.test(phone)) { setErr("شماره تماس باید با 09 شروع شود و ۱۱ رقم باشد"); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr("فرمت ایمیل نامعتبر است"); return; }
    const imgErr = validateKycIdImage(idImage);
    if (imgErr) { setErr(imgErr); return; }
    setStep(2);
  }

  async function doRegister() {
    setErr("");
    if (!username.trim()) { setErr("نام کاربری را وارد کنید"); return; }
    if (username.trim().length < 4) { setErr("نام کاربری حداقل ۴ کاراکتر باشد"); return; }
    if (password.length < 6) { setErr("رمز عبور حداقل ۶ کاراکتر باشد"); return; }
    if (password !== password2) { setErr("تکرار رمز عبور مطابقت ندارد"); return; }
    const imgErr = validateKycIdImage(idImage);
    if (imgErr) { setErr(imgErr); return; }

    let createdUser: AppUser;
    try {
      const result = await authApi.register({
        nationalId,
        phone,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        username: username.trim(),
        password,
        nationalIdImage: idImage!,
      }) as { user?: AppUser };
      if (!result.user) {
        throw new Error("پاسخ ثبت‌نام ناقص است. لطفاً دوباره تلاش کنید.");
      }
      createdUser = normalizeUser(result.user);
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : "ثبت‌نام ناموفق بود");
      return;
    }

    onRegister(createdUser);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-5">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-extrabold text-white text-lg">AX</div>
          <div><div className="text-white font-bold text-lg">آریا اکس</div><div className="text-slate-500 text-[11px]">ثبت‌نام در سامانه</div></div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? "bg-emerald-500" : "bg-slate-700"}`} />
          <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? "bg-emerald-500" : "bg-slate-700"}`} />
        </div>

        {step === 1 && <>
          <p className="text-slate-300 text-sm mb-4 text-center">مرحله ۱ — ثبت‌نام اولیه و اطلاعات پایه</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-slate-400 text-xs block mb-1.5">نام *</label>
              <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="علی" />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1.5">نام خانوادگی *</label>
              <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="رضایی" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-slate-400 text-xs block mb-1.5">شماره تماس *</label>
            <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors text-left" dir="ltr" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="09121234567" maxLength={11} />
          </div>
          <div className="mb-3">
            <label className="text-slate-400 text-xs block mb-1.5">ایمیل <span className="text-slate-600">(اختیاری)</span></label>
            <input type="email" className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors text-left" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="mb-3">
            <label className="text-slate-400 text-xs block mb-1.5">کد ملی (۱۰ رقم) *</label>
            <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors text-left" dir="ltr" value={nationalId} onChange={e => setNationalId(e.target.value.replace(/\D/g, ""))} placeholder="0012345678" maxLength={10} />
          </div>
          <div className="mb-4">
            <label className="text-slate-400 text-xs block mb-1.5">تصویر کارت ملی یا شناسنامه *</label>
            <p className="text-slate-600 text-[10px] mb-2">فرمت JPG یا PNG — حداکثر ۵ مگابایت</p>
            <input type="file" accept={KYC_IMAGE_ACCEPT} className="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-white file:text-xs" onChange={e => onIdImageChange(e.target.files?.[0] ?? null)} />
            {fileHint && <p className="text-emerald-400/80 text-[10px] mt-1.5">{fileHint}</p>}
            {idPreview && <img src={idPreview} alt="پیش‌نمایش مدرک هویت" className="mt-2 w-full max-h-32 object-contain rounded-lg border border-slate-700" />}
          </div>
          {err && <p className="text-red-400 text-xs mb-3 text-center">{err}</p>}
          <button onClick={checkIdentity} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">ادامه به مرحله ۲ ←</button>
        </>}

        {step === 2 && <>
          <p className="text-slate-300 text-sm mb-4 text-center">تعیین نام کاربری و رمز عبور</p>
          <div className="mb-3">
            <label className="text-slate-400 text-xs block mb-1.5">نام کاربری</label>
            <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" value={username} onChange={e => setUsername(e.target.value)} placeholder="حداقل ۴ کاراکتر" />
          </div>
          <div className="mb-3">
            <label className="text-slate-400 text-xs block mb-1.5">رمز عبور</label>
            <input type="password" className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" value={password} onChange={e => setPassword(e.target.value)} placeholder="حداقل ۶ کاراکتر" />
          </div>
          <div className="mb-4">
            <label className="text-slate-400 text-xs block mb-1.5">تکرار رمز عبور</label>
            <input type="password" className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" value={password2} onChange={e => setPassword2(e.target.value)} onKeyDown={e => e.key === "Enter" && doRegister()} placeholder="••••••" />
          </div>
          {err && <p className="text-red-400 text-xs mb-3 text-center">{err}</p>}
          <button onClick={doRegister} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mb-2">ثبت‌نام ✓</button>
          <button onClick={() => setStep(1)} className="w-full text-slate-500 text-xs py-1 hover:text-slate-300 transition-colors">← بازگشت</button>
        </>}

        <button onClick={onBack} className="w-full text-slate-600 text-xs mt-3 hover:text-slate-400 transition-colors">بازگشت به ورود کاربر</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  LOGIN PAGES  (/ = user, /admin = admin)
// ══════════════════════════════════════════════════════════════
function LoginPage({
  mode,
  onLogin,
  onGoRegister,
}: {
  mode: "user" | "admin";
  onLogin: (u: AppUser) => void;
  onGoRegister?: () => void;
}) {
  const [uname, setUname] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const isAdmin = mode === "admin";

  async function attempt() {
    setErr("");
    try {
      const user = await authApi.login(uname, pass);
      if (isAdmin && user.role === "user") {
        authApi.logout();
        setErr("این صفحه فقط برای ورود نقش‌های داخلی است");
        return;
      }
      if (!isAdmin && user.role !== "user") {
        authApi.logout();
        setErr("این صفحه فقط برای ورود کاربران است");
        return;
      }
      onLogin(user);
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : "ورود ناموفق بود");
    }
  }

  const accentBtn = isAdmin ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600";
  const accentFocus = isAdmin ? "focus:border-amber-500" : "focus:border-emerald-500";
  const badgeBg = isAdmin ? "bg-amber-500/5 border-amber-500/15" : "bg-emerald-500/5 border-emerald-500/15";

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700/50 rounded-2xl p-7 shadow-2xl">
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white text-lg ${isAdmin ? "bg-amber-500" : "bg-emerald-500"}`}>AX</div>
          <div>
            <div className="text-white font-bold text-xl">آریا اکس</div>
            <div className="text-slate-500 text-[11px]">{isAdmin ? "پنل مدیریت" : "پنل کاربری"}</div>
          </div>
        </div>
        <p className="text-slate-400 text-sm text-center mb-5">{isAdmin ? "ورود مدیر سیستم" : "ورود به حساب کاربری"}</p>
        <div className="mb-3">
          <label className="text-slate-400 text-xs block mb-1.5">نام کاربری</label>
          <input className={`w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-colors ${accentFocus}`} value={uname} onChange={e => setUname(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()} placeholder={isAdmin ? "admin" : "نام کاربری"} />
        </div>
        <div className="mb-5">
          <label className="text-slate-400 text-xs block mb-1.5">رمز عبور</label>
          <input type="password" className={`w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-colors ${accentFocus}`} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && attempt()} placeholder="••••••••" />
        </div>
        <button onClick={attempt} className={`w-full ${accentBtn} text-white font-semibold py-3 rounded-xl text-sm transition-colors mb-3`}>
          {isAdmin ? "ورود به پنل مدیریت" : "ورود به سامانه"}
        </button>
        {err && <p className="text-red-400 text-xs text-center mb-2">{err}</p>}
        {!isAdmin && onGoRegister && (
          <button onClick={onGoRegister} className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 text-sm py-2.5 rounded-xl transition-colors mb-3">ثبت‌نام کاربر جدید</button>
        )}
        <div className={`mt-2 ${badgeBg} border rounded-xl p-3 text-xs text-slate-500 leading-7`}>
          {isAdmin
            ? <><span className="text-amber-400 font-semibold">نمونه:</span> admin / admin123</>
            : <><span className="text-emerald-400 font-semibold">نمونه:</span> user1 / user1234</>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MARKET TICKER BAR
// ══════════════════════════════════════════════════════════════
function TickerBar({ market }: { market: MarketTicker[] }) {
  return (
    <div className="bg-slate-800/80 border-b border-slate-700/50 py-2 px-4 flex gap-6 overflow-x-auto text-xs" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
      {market.map(m => (
        <div key={m.symbol} className="flex items-center gap-2 shrink-0">
          <span className="text-slate-300 font-semibold">{m.symbol}/IRT</span>
          <span className="text-white font-bold">{fmtIRT(m.priceIRT)}</span>
          <span className={m.change24h >= 0 ? "text-emerald-400" : "text-red-400"}>{m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}٪</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MARKET PAGE  (نمودار زنده بازار)
// ══════════════════════════════════════════════════════════════
function MarketPage({ market }: { market: MarketTicker[] }) {
  const [sel, setSel] = useState<"BTC" | "ETH" | "USDT" | "TRX">("BTC");
  const coin = market.find(m => m.symbol === sel) ?? market[0];
  if (!coin) return null;
  return (
    <div className="space-y-4">
      <SectionTitle>نمودار زنده بازار</SectionTitle>
      <div className="flex gap-2 mb-2">
        {market.map(m => (
          <button key={m.symbol} onClick={() => setSel(m.symbol as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sel === m.symbol ? "bg-emerald-500 text-white" : "bg-slate-700/60 text-slate-400 hover:text-white"}`}>
            {m.symbol}
          </button>
        ))}
      </div>
      <Card className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-slate-400 text-xs mb-1">{coin.faName} / تومان</div>
            <div className="text-2xl font-bold text-white">{fmtIRT(coin.priceIRT)} ت</div>
            <div className="text-xs mt-1">${coin.priceUSD.toLocaleString()}</div>
          </div>
          <div className={`text-lg font-bold px-3 py-1 rounded-lg ${coin.change24h >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {coin.change24h >= 0 ? "+" : ""}{coin.change24h.toFixed(2)}٪
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={coin.history}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={60} tickFormatter={v => fmtIRT(v)} />
            <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [fmtIRT(v) + " ت", "قیمت"]} />
            <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} fill="url(#cg)" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {[{ l: "بالاترین", v: fmtIRT(coin.high24h), c: "text-emerald-400" }, { l: "پایین‌ترین", v: fmtIRT(coin.low24h), c: "text-red-400" }, { l: "حجم ۲۴h", v: coin.volume24h.toLocaleString(), c: "text-blue-400" }].map(s => (
            <div key={s.l} className="bg-slate-700/30 rounded-lg p-2 text-center">
              <div className="text-slate-500 text-[10px]">{s.l}</div>
              <div className={`text-xs font-semibold mt-0.5 ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <SectionTitle>جدول بازار</SectionTitle>
      <Card>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["ارز", "قیمت (تومان)", "قیمت USD", "تغییر ۲۴h", "حجم"].map(h => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {market.map(m => (
              <tr key={m.symbol} className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer" onClick={() => setSel(m.symbol as any)}>
                <td className="px-4 py-2.5 font-semibold text-white">{m.symbol} <span className="text-slate-500 font-normal">{m.faName}</span></td>
                <td className="px-4 py-2.5 text-slate-200">{fmtIRT(m.priceIRT)}</td>
                <td className="px-4 py-2.5 text-slate-400">${m.priceUSD}</td>
                <td className={`px-4 py-2.5 font-semibold ${m.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>{m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}٪</td>
                <td className="px-4 py-2.5 text-slate-400">{m.volume24h.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  WALLET PAGE  (کیف پول کاربر)
// ══════════════════════════════════════════════════════════════
function WalletPage({ user, txs, market }: { user: AppUser; txs: Transaction[]; market: MarketTicker[] }) {
  const myTxs = txs.filter(t => t.userId === user.id);
  const coins: [keyof AppUser["balances"], string, string][] = [
    ["IRT", "تومان", "#10b981"], ["BTC", "بیت‌کوین", "#f97316"], ["ETH", "اتریوم", "#3b82f6"],
    ["USDT", "تتر", "#22c55e"], ["TRX", "ترون", "#ef4444"],
  ];
  return (
    <div className="space-y-4">
      <SectionTitle>موجودی دارایی‌ها</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {coins.map(([sym, fa, color]) => {
          const bal = user.balances[sym];
          const m = market.find(x => x.symbol === sym);
          const irt = sym === "IRT" ? bal : m ? bal * m.priceIRT : 0;
          return (
            <Card key={sym} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-slate-400 text-xs">{sym} — {fa}</span>
              </div>
              <div className="text-white font-bold text-lg">{sym === "IRT" ? fmtIRT(bal) : bal.toFixed(6)}</div>
              {sym !== "IRT" && <div className="text-slate-500 text-[11px] mt-0.5">≈ {fmtIRT(irt)} ت</div>}
            </Card>
          );
        })}
      </div>

      <SectionTitle>آدرس‌های کریپتو</SectionTitle>
      <Card className="p-4 space-y-2">
        {(["BTC", "USDT", "TRX"] as const).map(sym => (
          <div key={sym} className="flex items-center gap-2">
            <span className="text-slate-400 text-xs w-10 shrink-0">{sym}:</span>
            <span className="text-slate-300 text-[11px] font-mono truncate flex-1">{user.cryptoAddresses[sym] || "—"}</span>
          </div>
        ))}
        <div className="border-t border-slate-700/50 pt-2 text-xs text-slate-500">شماره کارت: {user.cardNo || "—"}</div>
      </Card>

      <SectionTitle>تاریخچه تراکنش‌ها</SectionTitle>
      <Card>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["نوع", "دارایی", "مقدار", "وضعیت", "زمان"].map(h => <th key={h} className="px-4 py-2 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {myTxs.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-600">هنوز تراکنشی ندارید</td></tr>}
            {myTxs.map(t => (
              <tr key={t.id} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                <td className="px-4 py-2 text-slate-300">{TYPE_MAP[t.type]}</td>
                <td className="px-4 py-2 text-slate-400">{t.asset}</td>
                <td className="px-4 py-2 text-slate-300">{t.amount.toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge s={t.status} /></td>
                <td className="px-4 py-2 text-slate-500">{t.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  DEPOSIT / WITHDRAW  (واریز / برداشت)
// ══════════════════════════════════════════════════════════════
function DepositWithdrawPage({ user, onAddTx }: { user: AppUser; onAddTx: (t: Transaction) => Promise<void> }) {
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [asset, setAsset] = useState<"IRT" | "BTC" | "ETH" | "USDT" | "TRX">("IRT");
  const [amount, setAmount] = useState("");
  const [dest, setDest] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [done, setDone] = useState(false);
  const [txErr, setTxErr] = useState("");

  const amountNum = Number(amount);
  const skipExtendedForWithdraw = user.kycStatus === "verified" && mode === "withdraw";
  const needsExtended = !skipExtendedForWithdraw && amount && !isNaN(amountNum) && requiresExtendedVerification(asset, amountNum);

  async function submit() {
    setTxErr("");
    if (!amount || isNaN(amountNum) || amountNum <= 0) return;
    if (needsExtended && homeAddress.trim().length < 10) {
      setTxErr("برای مبالغ بالا، آدرس محل سکونت (حداقل ۱۰ کاراکتر) الزامی است");
      return;
    }
    const tx: Transaction = {
      id: "tx" + Date.now(), userId: user.id, userName: user.name,
      type: mode, asset, amount: amountNum,
      fee: Math.round(amountNum * 0.002),
      timestamp: nowStr(), status: "pending",
      destination: dest || "—",
      homeAddress: needsExtended ? homeAddress.trim() : "",
      postalCode: needsExtended ? postalCode.trim() : "",
      requiresExtended: needsExtended,
    };
    try {
      await onAddTx(tx);
      setAmount("");
      setDest("");
      setHomeAddress("");
      setPostalCode("");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setTxErr(err instanceof Error ? err.message : "ثبت درخواست ناموفق بود");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setMode("deposit")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === "deposit" ? "bg-emerald-500 text-white" : "bg-slate-700/50 text-slate-400 hover:text-white"}`}>واریز</button>
        <button onClick={() => setMode("withdraw")} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${mode === "withdraw" ? "bg-red-500 text-white" : "bg-slate-700/50 text-slate-400 hover:text-white"}`}>برداشت</button>
      </div>
      <Card className="p-5 space-y-4">
        <div>
          <label className="text-slate-400 text-xs block mb-1.5">نوع دارایی</label>
          <select className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none" value={asset} onChange={e => setAsset(e.target.value as any)}>
            {(["IRT", "BTC", "ETH", "USDT", "TRX"] as const).map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1.5">مقدار</label>
          <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1.5">{mode === "deposit" ? "مرجع واریز" : "مقصد برداشت"}</label>
          <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-emerald-500 transition-colors" value={dest} onChange={e => setDest(e.target.value)} placeholder={mode === "deposit" ? "شماره کارت / آدرس ولت" : "شماره شبا / آدرس ولت"} />
        </div>
        {needsExtended && (
          <div className="space-y-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
            <p className="text-amber-400 text-xs">مبلغ از حد استاندارد ({fmtThreshold(asset)} {asset}) بیشتر است — اطلاعات تکمیلی الزامی است.</p>
            <div>
              <label className="text-slate-400 text-xs block mb-1.5">آدرس محل سکونت *</label>
              <textarea className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500 transition-colors min-h-[72px]" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="استان، شهر، خیابان، پلاک..." />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1.5">کد پستی (اختیاری)</label>
              <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500 transition-colors" value={postalCode} onChange={e => setPostalCode(e.target.value.replace(/\D/g, ""))} placeholder="1234567890" maxLength={10} />
            </div>
          </div>
        )}
        {amount && !isNaN(amountNum) && <div className="text-xs text-slate-500">کارمزد تخمینی: {Math.round(amountNum * 0.002).toLocaleString()} {asset}</div>}
        {txErr && <p className="text-red-400 text-xs text-center">{txErr}</p>}
        <button onClick={submit} className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors ${mode === "deposit" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}>
          ثبت درخواست {mode === "deposit" ? "واریز" : "برداشت"}
        </button>
        {done && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400 text-xs text-center">✓ درخواست ثبت شد و در انتظار تأیید است</div>}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PROFILE PAGE  (پروفایل کاربر)
// ══════════════════════════════════════════════════════════════
function ProfilePage({ user }: { user: AppUser }) {
  return (
    <div className="space-y-4">
      <SectionTitle>اطلاعات حساب</SectionTitle>
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Avatar name={user.name} color={user.avatarColor} size={10} />
          <div>
            <div className="text-white font-semibold">{user.name}</div>
            <div className="text-slate-500 text-xs font-mono" dir="ltr">@{user.username}</div>
            <div className="mt-1"><KycBadge k={user.kycStatus} /></div>
          </div>
        </div>
        {user.kycDetails && (
          <div className="space-y-1 text-xs border-t border-slate-700/50 pt-3">
            {[["نام کامل", user.kycDetails.fullName], ["کد ملی", user.kycDetails.nationalId], ["موبایل", user.kycDetails.phone], ["ایمیل", user.kycDetails.email || "—"]].map(([l, v]) => (
              <div key={l} className="flex gap-2"><span className="text-slate-500 w-20 shrink-0">{l}:</span><span className="text-slate-300">{v}</span></div>
            ))}
          </div>
        )}
      </Card>

      <SectionTitle>اطلاعات بانکی و آدرس‌ها</SectionTitle>
      <Card className="p-5 space-y-2 text-xs">
        <p className="text-slate-500 text-[11px] mb-2">این اطلاعات فقط نمایشی است و توسط کاربر قابل تغییر نیست.</p>
        {[["شماره کارت", user.cardNo || "—"], ["شماره شبا", user.shibaNo || "—"], ["آدرس BTC", user.cryptoAddresses.BTC || "—"], ["آدرس USDT (TRC20)", user.cryptoAddresses.USDT || "—"], ["آدرس TRX", user.cryptoAddresses.TRX || "—"]].map(([l, v]) => (
          <div key={l} className="flex gap-2 py-1 border-b border-slate-700/30 last:border-0">
            <span className="text-slate-500 w-28 shrink-0">{l}:</span>
            <span className="text-slate-300 font-mono break-all" dir="ltr">{v}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  KYC PAGE (کاربر)
// ══════════════════════════════════════════════════════════════
function UserKycPage({ user }: { user: AppUser }) {
  return (
    <div className="space-y-4">
      <SectionTitle>وضعیت احراز هویت</SectionTitle>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-200 font-semibold text-sm">KYC</span>
          <KycBadge k={user.kycStatus} />
        </div>
        {user.kycDetails && <>
          <div className="space-y-2 text-xs">
            {[["نام کامل", user.kycDetails.fullName], ["کد ملی", user.kycDetails.nationalId], ["موبایل", user.kycDetails.phone], ["ایمیل", user.kycDetails.email || "—"], ["تاریخ ثبت", user.kycDetails.timestamp || "—"]].map(([l, v]) => (
              <div key={l} className="flex items-center gap-3">
                <span className="text-slate-500 w-20 shrink-0">{l}:</span>
                <span className="text-slate-300">{v}</span>
              </div>
            ))}
          </div>
          {user.kycDetails.nationalIdImage && (
            <div className="mt-3">
              <div className="text-slate-500 text-xs mb-1.5">تصویر کارت ملی</div>
              <img src={user.kycDetails.nationalIdImage} alt="کارت ملی" className="max-h-40 rounded-lg border border-slate-700 object-contain bg-slate-900/40" />
            </div>
          )}
          {user.kycStatus === "rejected" && user.kycDetails.rejectionReason &&
            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-xs">دلیل رد: {user.kycDetails.rejectionReason}</div>}
        </>}
        {user.kycStatus === "pending" && <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-400 text-xs">درخواست شما در صف بررسی قرار دارد. معمولاً ۲۴ ساعت طول می‌کشد.</div>}
        {user.kycStatus === "verified" && <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-400 text-xs">هویت شما با موفقیت تأیید شده است.</div>}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TICKETS  (سیستم تیکت پشتیبانی)
// ══════════════════════════════════════════════════════════════
function TicketsPage({ user, tickets, isAdmin, onRefresh }: {
  user: AppUser; tickets: Ticket[]; isAdmin?: boolean;
  onRefresh: () => void | Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: Ticket; messages: TicketMessage[] } | null>(null);
  const [reply, setReply] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Ticket["category"]>("support");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const msgEnd = useRef<HTMLDivElement>(null);

  const list = isAdmin ? tickets : tickets.filter(t => t.userId === user.id);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [detail?.messages]);

  async function openTicket(id: string) {
    setSelectedId(id);
    setErr("");
    try {
      const data = await ticketsApi.getWithMessages(id);
      setDetail(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "بارگذاری تیکت ناموفق بود");
    }
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setLoading(true);
    setErr("");
    try {
      await ticketsApi.reply(selectedId, reply.trim());
      setReply("");
      const data = await ticketsApi.getWithMessages(selectedId);
      setDetail(data);
      await onRefresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "ارسال پیام ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    setErr("");
    try {
      await ticketsApi.create({ subject: subject.trim(), message: message.trim(), category });
      setSubject(""); setMessage(""); setShowNew(false);
      await onRefresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "ثبت تیکت ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(status: Ticket["status"]) {
    if (!selectedId) return;
    setLoading(true);
    try {
      await ticketsApi.updateStatus(selectedId, status);
      const data = await ticketsApi.getWithMessages(selectedId);
      setDetail(data);
      await onRefresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "تغییر وضعیت ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  if (selectedId && detail) {
    return (
      <div className="space-y-3">
        <button onClick={() => { setSelectedId(null); setDetail(null); }} className="text-slate-400 hover:text-white text-xs">← بازگشت به لیست</button>
        <Card className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-white font-semibold text-sm">{detail.ticket.subject}</div>
              <div className="text-slate-500 text-[10px] mt-1">{isAdmin && <span className="ml-2">{detail.ticket.userName}</span>}{TICKET_CAT[detail.ticket.category]} · {detail.ticket.updatedAt}</div>
            </div>
            <TicketStatusBadge s={detail.ticket.status} />
          </div>
          {isAdmin && (
            <div className="flex gap-2 mb-3">
              {(["open", "in_progress", "closed"] as const).map(s => (
                <button key={s} disabled={loading || detail.ticket.status === s} onClick={() => void changeStatus(s)}
                  className={`px-2 py-1 rounded text-[10px] border transition-colors ${detail.ticket.status === s ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "border-slate-600 text-slate-400 hover:text-white"}`}>
                  {TICKET_STATUS[s]}
                </button>
              ))}
            </div>
          )}
          <div className="h-64 overflow-y-auto flex flex-col gap-2 mb-3">
            {detail.messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.senderId === user.id ? "flex-row-reverse" : ""}`}>
                <Avatar name={m.senderName} color={m.senderRole === "admin" ? "#f59e0b" : "#10b981"} size={7} />
                <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${m.senderRole === "admin" ? "bg-amber-500/15 text-amber-100" : "bg-emerald-500/15 text-emerald-100"}`}>
                  <div className="font-semibold mb-0.5 text-[10px] opacity-70">{m.senderName} {m.senderRole === "admin" && "(پشتیبانی)"}</div>
                  {m.message}
                  <div className="text-[10px] opacity-50 mt-1">{m.timestamp}</div>
                </div>
              </div>
            ))}
            <div ref={msgEnd} />
          </div>
          {detail.ticket.status !== "closed" && (
            <div className="flex gap-2">
              <input className="flex-1 bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-emerald-500" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()} placeholder="پاسخ خود را بنویسید..." disabled={loading} />
              <button onClick={() => void sendReply()} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">ارسال</button>
            </div>
          )}
          {!isAdmin && detail.ticket.status !== "closed" && (
            <button onClick={() => void changeStatus("closed")} className="mt-2 text-slate-500 hover:text-red-400 text-xs">بستن تیکت</button>
          )}
        </Card>
        {err && <p className="text-red-400 text-xs">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle>{isAdmin ? "مدیریت تیکت‌ها" : "تیکت‌های پشتیبانی"}</SectionTitle>
        {!isAdmin && (
          <button onClick={() => setShowNew(!showNew)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {showNew ? "انصراف" : "+ تیکت جدید"}
          </button>
        )}
      </div>

      {showNew && !isAdmin && (
        <Card className="p-4 space-y-3">
          <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500" value={subject} onChange={e => setSubject(e.target.value)} placeholder="موضوع تیکت" />
          <select className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none" value={category} onChange={e => setCategory(e.target.value as Ticket["category"])}>
            {(Object.keys(TICKET_CAT) as Ticket["category"][]).map(c => <option key={c} value={c}>{TICKET_CAT[c]}</option>)}
          </select>
          <textarea className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 min-h-[80px]" value={message} onChange={e => setMessage(e.target.value)} placeholder="شرح درخواست..." />
          <button onClick={() => void createTicket()} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50">ثبت تیکت</button>
        </Card>
      )}

      {err && <p className="text-red-400 text-xs">{err}</p>}

      <Card>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["موضوع", ...(isAdmin ? ["کاربر"] : []), "دسته", "وضعیت", "آخرین بروزرسانی", ""].map(h => <th key={h || "act"} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-600">تیکتی ثبت نشده است</td></tr>}
            {list.map(t => (
              <tr key={t.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 cursor-pointer" onClick={() => void openTicket(t.id)}>
                <td className="px-4 py-2.5 text-slate-200 font-medium">{t.subject}</td>
                {isAdmin && <td className="px-4 py-2 text-slate-400">{t.userName}</td>}
                <td className="px-4 py-2 text-slate-500">{TICKET_CAT[t.category]}</td>
                <td className="px-4 py-2"><TicketStatusBadge s={t.status} /></td>
                <td className="px-4 py-2 text-slate-500">{t.updatedAt}</td>
                <td className="px-4 py-2 text-emerald-400">مشاهده ←</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  USER SHELL  (پنل کاربری با سایدبار)
// ══════════════════════════════════════════════════════════════
function UserShell({ user, users, txs, market, tickets, onAddTx, onUpdateUser, onRefreshTickets, onLogout }: {
  user: AppUser; users: AppUser[]; txs: Transaction[]; market: MarketTicker[];
  tickets: Ticket[];
  onAddTx: (t: Transaction) => Promise<void>; onUpdateUser: (u: AppUser) => void;
  onRefreshTickets: () => void | Promise<void>;
  onLogout: () => void;
}) {
  const isKycLocked = user.kycStatus !== "verified";
  const [page, setPage] = useState(isKycLocked ? "kyc" : "profile");

  const navItems = [
    { id: "profile", label: "پروفایل", icon: "👤" },
    { id: "wallet", label: "کیف پول", icon: "💰" },
    { id: "transfer", label: "واریز/برداشت", icon: "🔄" },
    { id: "tickets", label: "تیکت‌ها", icon: "🎫" },
    { id: "market", label: "بازار", icon: "📈" },
    { id: "kyc", label: "احراز هویت", icon: "🪪" },
  ];

  const titles: Record<string, string> = { profile: "پروفایل", market: "بازار", wallet: "کیف پول", transfer: "واریز / برداشت", tickets: "تیکت‌ها", kyc: "احراز هویت" };
  const openTickets = tickets.filter(t => t.userId === user.id && t.status !== "closed").length;

  return (
    <div className="flex min-h-screen bg-slate-900" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-52 bg-slate-800/80 border-l border-slate-700/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-extrabold text-white text-sm">AX</div>
          <div><div className="text-white font-bold text-sm">آریا اکس</div><div className="text-slate-500 text-[10px]">پنل کاربری</div></div>
        </div>
        <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
          <Avatar name={user.name} color={user.avatarColor} size={8} />
          <div><div className="text-white text-xs font-semibold">{user.name}</div><KycBadge k={user.kycStatus} /></div>
        </div>
        <nav className="flex-1 py-2">
          {navItems.map(n => (
            <button key={n.id} onClick={() => !isKycLocked || n.id === "kyc" ? setPage(n.id) : setPage("kyc")}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-right transition-all border-r-2 ${page === n.id ? "bg-emerald-500/10 text-emerald-400 border-emerald-500" : "text-slate-400 hover:text-white hover:bg-white/3 border-transparent"} ${isKycLocked && n.id !== "kyc" ? "opacity-60" : ""}`}>
              <span>{n.icon}</span>{n.label}
              {n.id === "tickets" && openTickets > 0 && <span className="mr-auto bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{openTickets}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700/50">
          <button onClick={onLogout} className="w-full bg-red-500/10 border border-red-500/20 rounded-lg py-2 text-red-400 text-xs hover:bg-red-500/20 transition-colors">خروج</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TickerBar market={market} />
        <header className="h-12 bg-slate-800/60 border-b border-slate-700/50 flex items-center px-5">
          <span className="text-white font-semibold text-sm">{titles[page]}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          {isKycLocked && page !== "kyc" && <Card className="mb-4 p-4 border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs">حساب شما هنوز در حال بررسی است؛ فقط صفحه احراز هویت فعال است.</Card>}
          {page === "profile" && <ProfilePage user={user} />}
          {page === "market" && <MarketPage market={market} />}
          {page === "wallet" && <WalletPage user={user} txs={txs} market={market} />}
          {page === "transfer" && <DepositWithdrawPage user={user} onAddTx={onAddTx} />}
          {page === "tickets" && <TicketsPage user={user} tickets={tickets} onRefresh={onRefreshTickets} />}
          {page === "kyc" && <UserKycPage user={user} />}
        </main>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ADMIN PANEL
// ══════════════════════════════════════════════════════════════
function AdminShell({ admin, users, txs, market, tickets, onUpdateUser, onUpdateTx, onLogout, onAddTx, onRefreshTickets }: {
  admin: AppUser; users: AppUser[]; txs: Transaction[]; market: MarketTicker[];
  tickets: Ticket[];
  onUpdateUser: (u: AppUser) => void; onUpdateTx: (txs: Transaction[]) => void; onLogout: () => void;
  onAddTx: (t: Transaction) => Promise<void>; onRefreshTickets: () => void | Promise<void>;
}) {
  const [page, setPage] = useState("dashboard");

  const navGroups = [
    { label: "داشبورد", items: [{ id: "dashboard", label: "خلاصه عملکرد", icon: "📊" }] },
    { label: "مالی", items: [{ id: "transactions", label: "تراکنش‌ها", icon: "🔄" }, { id: "report", label: "گزارش مالی", icon: "📋" }] },
    { label: "کاربران", items: [{ id: "users", label: "مدیریت کاربران", icon: "👥" }, { id: "kyc", label: "احراز هویت KYC", icon: "🪪" }] },
    { label: "پشتیبانی", items: [{ id: "tickets", label: "تیکت‌ها", icon: "🎫" }] },
    { label: "سیستم", items: [{ id: "market", label: "بازار", icon: "📈" }, { id: "settings", label: "تنظیمات", icon: "⚙️" }] },
  ];

  const titles: Record<string, string> = { dashboard: "خلاصه عملکرد", transactions: "تراکنش‌ها", report: "گزارش مالی", users: "مدیریت کاربران", kyc: "احراز هویت KYC", tickets: "تیکت‌ها", market: "بازار", settings: "تنظیمات" };
  const pendingKyc = users.filter(u => u.kycStatus === "pending").length;
  const pendingTxs = txs.filter(t => t.status === "pending").length;
  const openTickets = tickets.filter(t => t.status !== "closed").length;

  return (
    <div className="flex min-h-screen bg-slate-900" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
      <aside className="w-52 bg-slate-800/80 border-l border-slate-700/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-700/50 flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-extrabold text-white text-sm">AX</div>
          <div><div className="text-white font-bold text-sm">آریا اکس</div><div className="text-slate-500 text-[10px]">پنل مدیریت</div></div>
        </div>
        <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
          <Avatar name={admin.name} color={admin.avatarColor} size={8} />
          <div>
            <div className="text-white text-xs font-semibold">{admin.name}</div>
            <div className="text-emerald-400 text-[10px]">{ROLE_LABELS[admin.role]}</div>
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {navGroups.map(g => (
            <div key={g.label}>
              <div className="px-4 pt-3 pb-1 text-[10px] text-slate-600 uppercase tracking-widest">{g.label}</div>
              {g.items.map(n => (
                <button key={n.id} onClick={() => setPage(n.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-right transition-all border-r-2 ${page === n.id ? "bg-emerald-500/10 text-emerald-400 border-emerald-500" : "text-slate-400 hover:text-white hover:bg-white/3 border-transparent"}`}>
                  <span>{n.icon}</span>{n.label}
                  {n.id === "kyc" && pendingKyc > 0 && <span className="mr-auto bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{pendingKyc}</span>}
                  {n.id === "transactions" && pendingTxs > 0 && <span className="mr-auto bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{pendingTxs}</span>}
                  {n.id === "tickets" && openTickets > 0 && <span className="mr-auto bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{openTickets}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700/50">
          <button onClick={onLogout} className="w-full bg-red-500/10 border border-red-500/20 rounded-lg py-2 text-red-400 text-xs hover:bg-red-500/20 transition-colors">خروج از سیستم</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TickerBar market={market} />
        <header className="h-12 bg-slate-800/60 border-b border-slate-700/50 flex items-center justify-between px-5">
          <span className="text-white font-semibold text-sm">{titles[page]}</span>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-md">● آنلاین</span>
            {pendingKyc > 0 && <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-md">⏳ {pendingKyc} KYC</span>}
            {pendingTxs > 0 && <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-md">⏳ {pendingTxs} تراکنش</span>}
            {openTickets > 0 && <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-md">🎫 {openTickets} تیکت</span>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4">
          {page === "dashboard" && <AdminDashboard users={users} txs={txs} />}
          {page === "transactions" && <AdminTransactions txs={txs} onUpdateTx={onUpdateTx} />}
          {page === "report" && <AdminReport txs={txs} />}
          {page === "users" && <AdminUsers users={users} onUpdateUser={onUpdateUser} />}
          {page === "kyc" && <AdminKyc users={users} onUpdateUser={onUpdateUser} />}
          {page === "tickets" && <TicketsPage user={admin} tickets={tickets} isAdmin onRefresh={onRefreshTickets} />}
          {page === "market" && <MarketPage market={market} />}
          {page === "settings" && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}

// ── Admin sub-pages ─────────────────────────────────────────
function AdminDashboard({ users, txs }: { users: AppUser[]; txs: Transaction[] }) {
  const totalIRT = users.filter(u => u.role === "user").reduce((s, u) => s + u.balances.IRT, 0);
  const pendingTxs = txs.filter(t => t.status === "pending").length;
  const pendingKyc = users.filter(u => u.kycStatus === "pending").length;
  const stats = [
    { label: "کاربران کل", value: String(users.filter(u => u.role === "user").length), change: "↑ فعال", up: true },
    { label: "تراکنش در انتظار", value: String(pendingTxs), change: "نیاز به بررسی", up: false },
    { label: "موجودی IRT مجموع", value: fmtIRT(totalIRT) + " ت", change: "کل کاربران", up: true },
    { label: "KYC در انتظار", value: String(pendingKyc), change: "نیاز به تأیید", up: pendingKyc === 0 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="p-4">
            <div className="text-slate-500 text-xs mb-2">{s.label}</div>
            <div className="text-white font-bold text-xl">{s.value}</div>
            <div className={`text-xs mt-1 ${s.up ? "text-emerald-400" : "text-amber-400"}`}>{s.change}</div>
          </Card>
        ))}
      </div>
      <SectionTitle>آخرین تراکنش‌ها</SectionTitle>
      <Card>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["کاربر", "نوع", "دارایی", "مقدار", "وضعیت", "زمان"].map(h => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {txs.slice(0, 8).map(t => (
              <tr key={t.id} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                <td className="px-4 py-2 text-slate-300">{t.userName}</td>
                <td className="px-4 py-2 text-slate-400">{TYPE_MAP[t.type]}</td>
                <td className="px-4 py-2 text-slate-400">{t.asset}</td>
                <td className="px-4 py-2 text-slate-300">{t.amount.toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge s={t.status} /></td>
                <td className="px-4 py-2 text-slate-500">{t.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AdminTransactions({ txs, onUpdateTx }: { txs: Transaction[]; onUpdateTx: (txs: Transaction[]) => void }) {
  const [q, setQ] = useState("");
  const [tf, setTf] = useState("");
  const [sf, setSf] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const filtered = txs.filter(t =>
    (tf === "" || t.type === tf) &&
    (sf === "" || t.status === sf) &&
    (t.userName.includes(q) || t.asset.toLowerCase().includes(q.toLowerCase()))
  );
  const pendingCount = txs.filter(t => t.status === "pending").length;

  async function reviewTx(id: string, status: "completed" | "rejected") {
    setBusyId(id);
    setError("");
    try {
      await txApi.review(id, { status, note: notes[id] || undefined });
      const all = await txApi.getAll();
      onUpdateTx(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "بررسی تراکنش ناموفق بود");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {pendingCount} تراکنش در انتظار تأیید ادمین
        </div>
      )}
      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <input className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500" placeholder="جستجو..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none" value={tf} onChange={e => setTf(e.target.value)}>
          <option value="">همه انواع</option><option value="deposit">واریز</option><option value="withdraw">برداشت</option><option value="trade">معامله</option>
        </select>
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none" value={sf} onChange={e => setSf(e.target.value)}>
          <option value="">همه وضعیت‌ها</option><option value="pending">در انتظار</option><option value="completed">تکمیل‌شده</option><option value="rejected">رد شده</option>
        </select>
      </div>
      <Card>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["کاربر", "نوع", "دارایی", "مقدار", "کارمزد", "مقصد", "وضعیت", "زمان", "عملیات"].map(h => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 align-top">
                <td className="px-4 py-2 text-slate-300">{t.userName}</td>
                <td className="px-4 py-2 text-slate-400">{TYPE_MAP[t.type]}</td>
                <td className="px-4 py-2 text-slate-400">{t.asset}</td>
                <td className="px-4 py-2 text-slate-300">{t.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-amber-400">{t.fee.toLocaleString()}</td>
                <td className="px-4 py-2 text-slate-500 max-w-[120px] truncate" title={t.destination}>{t.destination || "—"}</td>
                <td className="px-4 py-2"><StatusBadge s={t.status} /></td>
                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{t.timestamp}</td>
                <td className="px-4 py-2 min-w-[150px]">
                  {t.status === "pending" ? (
                    <div className="space-y-1">
                      <input
                        className="w-full rounded border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300 outline-none"
                        placeholder="یادداشت (اختیاری)"
                        value={notes[t.id] ?? ""}
                        onChange={e => setNotes(p => ({ ...p, [t.id]: e.target.value }))}
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => void reviewTx(t.id, "completed")}
                          className="flex-1 rounded bg-emerald-500/10 border border-emerald-500/20 py-1 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          تأیید
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => void reviewTx(t.id, "rejected")}
                          className="flex-1 rounded bg-red-500/10 border border-red-500/20 py-1 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          رد
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AdminReport({ txs }: { txs: Transaction[] }) {
  const [month, setMonth] = useState("12"); const [year, setYear] = useState("1403"); const [tf, setTf] = useState("all");
  const filtered = tf === "all" ? txs : txs.filter(t => t.type === tf);
  const depT = filtered.filter(t => t.type === "deposit" && t.asset === "IRT").reduce((s, t) => s + t.amount, 0);
  const witT = filtered.filter(t => t.type === "withdraw" && t.asset === "IRT").reduce((s, t) => s + t.amount, 0);
  const feeT = filtered.reduce((s, t) => s + t.fee, 0);

  function exportExcel() {
    const rows: Array<Array<string | number>> = [["تاریخ", "نام کاربر", "نوع", "دارایی", "مقدار", "کارمزد", "وضعیت", "مقصد"]];
    filtered.forEach(t => rows.push([t.timestamp, t.userName, TYPE_MAP[t.type], t.asset, t.amount, t.fee, STATUS_MAP[t.status], t.destination]));
    rows.push([], ["خلاصه"], ["مجموع واریز IRT", depT, "", "مجموع برداشت IRT", witT, "", "کارمزد کل", feeT]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[+month]} ${year}`);
    XLSX.writeFile(wb, `AriaxReport_${year}_${month}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        {[{ label: "ماه", el: <select className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none" value={month} onChange={e => setMonth(e.target.value)}>{MONTHS.slice(1).map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}</select> },
        { label: "سال", el: <select className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none" value={year} onChange={e => setYear(e.target.value)}>{["1402", "1403", "1404"].map(y => <option key={y}>{y}</option>)}</select> },
        { label: "نوع", el: <select className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none" value={tf} onChange={e => setTf(e.target.value)}><option value="all">همه</option><option value="deposit">واریز</option><option value="withdraw">برداشت</option><option value="trade">معامله</option></select> },
        ].map(f => (
          <div key={f.label}><div className="text-slate-500 text-xs mb-1.5">{f.label}</div>{f.el}</div>
        ))}
        <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">⬇ دانلود Excel</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ l: "مجموع واریز IRT", v: fmtIRT(depT) + " ت", c: "text-emerald-400" }, { l: "مجموع برداشت IRT", v: fmtIRT(witT) + " ت", c: "text-red-400" }, { l: "کارمزد جمع‌آوری‌شده", v: feeT.toFixed(2) + " ت", c: "text-blue-400" }].map(s => (
          <Card key={s.l} className="p-4"><div className="text-slate-500 text-xs mb-2">{s.l}</div><div className={`text-lg font-bold ${s.c}`}>{s.v}</div></Card>
        ))}
      </div>
      <Card>
        <div className="px-4 py-3 border-b border-slate-700/50 text-white font-semibold text-sm">گزارش {MONTHS[+month]} {year}</div>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["تاریخ", "کاربر", "نوع", "دارایی", "مقدار", "کارمزد", "وضعیت"].map(h => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                <td className="px-4 py-2 text-slate-500">{t.timestamp}</td>
                <td className="px-4 py-2 text-slate-300">{t.userName}</td>
                <td className="px-4 py-2 text-slate-400">{TYPE_MAP[t.type]}</td>
                <td className="px-4 py-2 text-slate-400">{t.asset}</td>
                <td className="px-4 py-2 text-slate-300">{t.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-amber-400">{t.fee.toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge s={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AdminUsers({ users, onUpdateUser }: { users: AppUser[]; onUpdateUser: (u: AppUser) => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AppUser | null>(null);
  const filtered = users.filter(u => u.role === "user" && u.name.includes(q));
  return (
    <div className="space-y-3">
      <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500" placeholder="جستجوی کاربر..." value={q} onChange={e => setQ(e.target.value)} />
      <Card>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500 border-b border-slate-700/50">
            {["نام", "نام کاربری", "KYC", "موجودی IRT", "USDT", "BTC", "عملیات"].map(h => <th key={h} className="px-4 py-2.5 text-right font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                <td className="px-4 py-2"><div className="flex items-center gap-2"><Avatar name={u.name} color={u.avatarColor} size={6} /><span className="text-slate-300">{u.name}</span></div></td>
                <td className="px-4 py-2 text-slate-400 font-mono">{u.username}</td>
                <td className="px-4 py-2"><KycBadge k={u.kycStatus} /></td>
                <td className="px-4 py-2 text-slate-300">{fmtIRT(u.balances.IRT)}</td>
                <td className="px-4 py-2 text-slate-400">{u.balances.USDT}</td>
                <td className="px-4 py-2 text-slate-400">{u.balances.BTC}</td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setSelected(u)}
                    className="bg-slate-700/50 border border-slate-600/50 rounded-md px-2 py-1 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    جزئیات
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {selected && <UserDetailsModal user={selected} onClose={() => setSelected(null)} onUpdateUser={onUpdateUser} />}
    </div>
  );
}

function UserDetailsModal({
  user,
  onClose,
  onUpdateUser,
}: {
  user: AppUser;
  onClose: () => void;
  onUpdateUser: (u: AppUser) => void;
}) {
  const kyc = user.kycDetails;
  const stepTone = (s?: string) =>
    s === "approved" ? "text-emerald-400" : s === "rejected" ? "text-red-400" : "text-amber-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} color={user.avatarColor} size={9} />
            <div>
              <h3 className="text-white font-bold">{user.name}</h3>
              <p className="text-xs text-slate-400 font-mono" dir="ltr">@{user.username}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <section>
            <SectionTitle>وضعیت حساب</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <DetailRow label="KYC" value={<KycBadge k={user.kycStatus} />} />
              <DetailRow label="شناسه" value={user.id} mono />
            </div>
          </section>

          <section>
            <SectionTitle>موجودی‌ها</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(user.balances).map(([asset, amount]) => (
                <div key={asset} className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-2">
                  <div className="text-slate-500">{asset}</div>
                  <div className="text-slate-200 font-semibold mt-1">{asset === "IRT" ? fmtIRT(amount) : amount}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle>اطلاعات بانکی / کریپتو</SectionTitle>
            <div className="space-y-1 text-xs">
              <DetailRow label="کارت" value={user.cardNo || "—"} mono />
              <DetailRow label="شبا" value={user.shibaNo || "—"} mono />
              <DetailRow label="BTC" value={user.cryptoAddresses.BTC || "—"} mono />
              <DetailRow label="USDT" value={user.cryptoAddresses.USDT || "—"} mono />
              <DetailRow label="TRX" value={user.cryptoAddresses.TRX || "—"} mono />
            </div>
          </section>

          {kyc ? (
            <section>
              <SectionTitle>احراز هویت (KYC)</SectionTitle>
              <div className="space-y-1 text-xs mb-3">
                <DetailRow label="نام کامل" value={kyc.fullName} />
                <DetailRow label="کد ملی" value={kyc.nationalId} mono />
                <DetailRow label="موبایل" value={kyc.phone} mono />
                <DetailRow label="ایمیل" value={kyc.email || "—"} />
                <DetailRow label="آدرس" value={kyc.homeAddress || "—"} />
                <DetailRow label="تاریخ ثبت" value={kyc.timestamp || "—"} />
                {kyc.faceMatchScore != null && <DetailRow label="امتیاز چهره" value={String(kyc.faceMatchScore)} />}
                {kyc.rejectionReason && <DetailRow label="دلیل رد" value={kyc.rejectionReason} />}
              </div>
              {(kyc.step1Status || kyc.step2Status || kyc.step3Status) && (
                <div className="flex gap-2 mb-3 text-[11px]">
                  <span className={stepTone(kyc.step1Status)}>مرحله ۱: {kyc.step1Status ?? "—"}</span>
                  <span className={stepTone(kyc.step2Status)}>مرحله ۲: {kyc.step2Status ?? "—"}</span>
                  <span className={stepTone(kyc.step3Status)}>مرحله ۳: {kyc.step3Status ?? "—"}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {kyc.nationalIdImage && (
                  <ImagePreview label="کارت ملی" src={kyc.nationalIdImage} />
                )}
                {kyc.selfieImage && (
                  <ImagePreview label="سلفی" src={kyc.selfieImage} />
                )}
                {kyc.supportingDocument && (
                  <ImagePreview label="مدرک تکمیلی" src={kyc.supportingDocument} />
                )}
              </div>
            </section>
          ) : (
            <Card className="p-4 text-xs text-slate-500">اطلاعات KYC ثبت نشده است.</Card>
          )}

          {user.kycStatus === "pending" && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await usersApi.updateKyc(user.id, "verified");
                  onUpdateUser({ ...user, kycStatus: "verified" });
                  onClose();
                }}
                className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 py-2 text-xs hover:bg-emerald-500/20"
              >
                تأیید KYC
              </button>
              <button
                type="button"
                onClick={async () => {
                  await usersApi.updateKyc(user.id, "rejected", "رد از پنل جزئیات");
                  onUpdateUser({ ...user, kycStatus: "rejected" });
                  onClose();
                }}
                className="flex-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 py-2 text-xs hover:bg-red-500/20"
              >
                رد KYC
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-slate-500 w-24 shrink-0">{label}:</span>
      <span className={`text-slate-300 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function ImagePreview({ label, src }: { label: string; src: string }) {
  const isPdf = src.startsWith("data:application/pdf");
  return (
    <div className="rounded-lg border border-slate-700/50 overflow-hidden bg-slate-950/40">
      <div className="px-2 py-1 text-[10px] text-slate-500 border-b border-slate-800">{label}</div>
      {isPdf ? (
        <a href={src} target="_blank" rel="noreferrer" className="block p-3 text-xs text-emerald-400">مشاهده PDF ↗</a>
      ) : (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={label} className="w-full max-h-32 object-contain bg-black/40" />
        </a>
      )}
    </div>
  );
}

function AdminKyc({ users, onUpdateUser }: { users: AppUser[]; onUpdateUser: (u: AppUser) => void }) {
  const [tab, setTab] = useState<"queue" | "report">("queue");
  const [reason, setReason] = useState<Record<string, string>>({});
  const pending = users.filter(u => u.kycStatus === "pending");
  async function approve(u: AppUser) {
    await usersApi.updateKyc(u.id, "verified");
    onUpdateUser({ ...u, kycStatus: "verified" });
  }
  async function reject(u: AppUser) {
    const rejectionReason = reason[u.id] || "مدارک ناقص";
    await usersApi.updateKyc(u.id, "rejected", rejectionReason);
    onUpdateUser({ ...u, kycStatus: "rejected", kycDetails: u.kycDetails ? { ...u.kycDetails, rejectionReason } : u.kycDetails });
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("queue")} className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${tab === "queue" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
          صف تأیید کاربران ({pending.length})
        </button>
        <button type="button" onClick={() => setTab("report")} className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${tab === "report" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
          گزارش مراحل KYC
        </button>
      </div>

      {tab === "report" && (
        <Card className="p-4">
          <KycAdminReport />
        </Card>
      )}

      {tab === "queue" && (pending.length === 0
        ? <Card className="p-8 text-center text-slate-500">هیچ درخواست KYC در انتظاری وجود ندارد ✓</Card>
        : <div className="grid grid-cols-2 gap-4">
          {pending.map(u => (
            <Card key={u.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold text-sm">{u.kycDetails?.fullName || u.name}</span>
                <KycBadge k={u.kycStatus} />
              </div>
              <div className="space-y-1 text-xs mb-3">
                {[["کد ملی", u.kycDetails?.nationalId || "—"], ["موبایل", u.kycDetails?.phone || "—"], ["ایمیل", u.kycDetails?.email || "—"], ["تاریخ ثبت", u.kycDetails?.timestamp || "—"]].map(([l, v]) => (
                  <div key={l} className="flex gap-2"><span className="text-slate-500 w-16 shrink-0">{l}:</span><span className="text-slate-300">{v}</span></div>
                ))}
              </div>
              {u.kycDetails?.nationalIdImage && (
                <a href={u.kycDetails.nationalIdImage} target="_blank" rel="noreferrer" className="block mb-3">
                  <img src={u.kycDetails.nationalIdImage} alt="کارت ملی" className="w-full max-h-36 object-contain rounded-lg border border-slate-700 bg-slate-900/40" />
                  <span className="text-[10px] text-emerald-400 mt-1 inline-block">مشاهده تصویر کارت ملی ↗</span>
                </a>
              )}
              <input className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs outline-none mb-2" placeholder="دلیل رد (اختیاری)" value={reason[u.id] || ""} onChange={e => setReason(p => ({ ...p, [u.id]: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={() => approve(u)} className="flex-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs py-2 rounded-lg hover:bg-emerald-500/20 transition-colors">✓ تأیید</button>
                <button onClick={() => reject(u)} className="flex-1 bg-red-500/10 border border-red-500/25 text-red-400 text-xs py-2 rounded-lg hover:bg-red-500/20 transition-colors">✗ رد</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminSettings() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle>تنظیمات سیستم</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          {[{ l: "حداکثر برداشت روزانه (IRT)", v: "50,000,000" }, { l: "کارمزد معاملات (%)", v: "0.2" }, { l: "حداقل واریز USDT", v: "10" }, { l: "تعداد تیم", v: "4" }].map(f => (
            <div key={f.l} className="bg-slate-700/30 rounded-xl p-3">
              <label className="text-slate-400 text-xs block mb-2">{f.l}</label>
              <input defaultValue={f.v} className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500" />
            </div>
          ))}
          {[{ l: "وضعیت ثبت‌نام", opts: ["فعال", "غیرفعال"] }, { l: "تأیید دو مرحله‌ای", opts: ["اجباری", "اختیاری"] }].map(f => (
            <div key={f.l} className="bg-slate-700/30 rounded-xl p-3">
              <label className="text-slate-400 text-xs block mb-2">{f.l}</label>
              <select className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm outline-none">
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
          💾 ذخیره تنظیمات
        </button>
        {saved && <span className="mr-3 text-emerald-400 text-xs">✓ ذخیره شد</span>}
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  APP ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const { navigate, isAdminRoute, isRegisterRoute } = useAppRouter();
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [booting, setBooting] = useState(true);
  const [market, setMarket] = useState<MarketTicker[]>([]);


  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = await authApi.getCurrentUser();
      if (!alive) return;
      if (!saved) {
        setBooting(false);
        return;
      }
      const user = normalizeUser(saved);
      if (user.role !== "user" && !isAdminRoute) navigate("/admin");
      else if (user.role === "user" && isAdminRoute) navigate("/");
      setCurrentUser(user);
      const [appDataResult, marketResult] = await Promise.allSettled([
        loadAppData(user.role),
        marketApi.getPrices(),
      ]);
      if (!alive) return;
      if (appDataResult.status === "fulfilled") {
        setTxs(appDataResult.value.transactions);
        setTickets(appDataResult.value.tickets);
        if (user.role === "admin") setUsers(appDataResult.value.users);
      }
      setMarket(marketResult.status === "fulfilled" ? marketResult.value : []);
      setBooting(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin(u: AppUser) {
    const user = normalizeUser(u);
    setCurrentUser(user);
    navigate(user.role === "user" ? "/" : "/admin");
    const [appDataResult, marketResult] = await Promise.allSettled([
      loadAppData(user.role),
      marketApi.getPrices(),
    ]);
    if (appDataResult.status === "fulfilled") {
      setTxs(appDataResult.value.transactions);
      setTickets(appDataResult.value.tickets);
      if (user.role === "admin") setUsers(appDataResult.value.users);
    }
    setMarket(marketResult.status === "fulfilled" ? marketResult.value : []);
  }
  function handleRegister(u: any) {
    setUsers(prev => [...prev, normalizeUser(u)]);
    navigate("/");
  }
  function handleUpdateUser(updated: AppUser) { setUsers(prev => prev.map(u => u.id === updated.id ? updated : u)); if (currentUser?.id === updated.id) setCurrentUser(updated); }
  function handleLogout() {
    const wasInternal = currentUser?.role !== "user";
    void authApi.logout();
    setCurrentUser(null);
    setUsers([]);
    setTxs([]);
    setTickets([]);
    setMarket([]);
    navigate(wasInternal ? "/admin" : "/");
  }

  async function handleAddTx(t: Transaction) {
    try {
      await txApi.create({
        type: t.type, asset: t.asset, amount: t.amount, destination: t.destination,
        homeAddress: t.homeAddress, postalCode: t.postalCode,
      });
      const all = await txApi.getAll();
      setTxs(all);
    } catch (err) {
      throw (err instanceof Error ? err : new Error("ثبت تراکنش ناموفق بود"));
    }
  }

  async function refreshTickets() {
    try {
      const all = await ticketsApi.getAll();
      setTickets(all);
    } catch { /* ignore */ }
  }

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
        در حال بارگذاری...
      </div>
    );
  }

  if (currentUser?.role === "user" && !isAdminRoute) {
    return <UserShell user={currentUser} users={users} txs={txs} market={market} tickets={tickets}
      onAddTx={handleAddTx} onUpdateUser={handleUpdateUser} onRefreshTickets={refreshTickets} onLogout={handleLogout} />;
  }
  if (currentUser && currentUser.role !== "user" && isAdminRoute) {
    return <AdminShell admin={currentUser} users={users} txs={txs} market={market} tickets={tickets}
      onUpdateUser={handleUpdateUser} onUpdateTx={setTxs} onAddTx={handleAddTx} onRefreshTickets={refreshTickets} onLogout={handleLogout} />;
  }

  if (currentUser && currentUser.role !== "user" && !isAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm" dir="rtl" style={{ fontFamily: "Vazirmatn,sans-serif" }}>
        در حال انتقال به پنل داخلی...
      </div>
    );
  }

  if (isAdminRoute) {
    return <LoginPage mode="admin" onLogin={handleLogin} />;
  }
  if (isRegisterRoute) {
    return <KycRegistrationFlow onBack={() => navigate("/")} onRegister={handleRegister} />;
  }
  return <LoginPage mode="user" onLogin={handleLogin} onGoRegister={() => navigate("/register")} />;
}
