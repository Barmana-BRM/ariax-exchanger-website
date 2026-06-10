import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Transaction, User } from '../types';
import {
  AlertTriangle,
  BadgeCheck,
  Bug,
  Eye,
  Fingerprint,
  FileLock2,
  Gavel,
  KeyRound,
  LockKeyhole,
  Radar,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  Siren,
  UserCheck,
  UserX,
  WifiOff
} from 'lucide-react';

interface RiskComplianceSecurityProps {
  users: User[];
  transactions: Transaction[];
}

type RiskStatus = 'clear' | 'watch' | 'blocked';

const statusClasses: Record<RiskStatus, string> = {
  clear: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  watch: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
};

const statusLabels: Record<RiskStatus, string> = {
  clear: 'پاک',
  watch: 'زیر نظر',
  blocked: 'مسدود'
};

export default function RiskComplianceSecurity({ users, transactions }: RiskComplianceSecurityProps) {
  const [securityMode, setSecurityMode] = useState<'normal' | 'strict' | 'incident'>('strict');

  const model = useMemo(() => {
    const verified = users.filter(user => user.kycStatus === 'verified').length;
    const pending = users.filter(user => user.kycStatus === 'pending' || user.kycStatus === 'unverified').length;
    const highValueTransactions = transactions.filter(tx => tx.amount > (tx.asset === 'IRT' ? 10000000 : 1000)).length;
    const suspiciousScore = Math.min(96, 34 + highValueTransactions * 11 + pending * 7 + (securityMode === 'incident' ? 22 : securityMode === 'strict' ? 8 : 0));

    const immutableLogs = transactions.map((tx, index) => ({
      hash: `0x${tx.id.replace('tx_', '')}${(index + 1489).toString(16)}9fa`,
      event: tx.type === 'deposit' ? 'DepositConfirmed' : tx.type === 'withdraw' ? 'WithdrawalRequested' : 'TradeMatched',
      actor: tx.userName,
      time: tx.timestamp,
      status: index % 4 === 0 ? 'watch' as RiskStatus : 'clear' as RiskStatus
    }));

    const threatTrend = [
      { time: '۰۸', waf: 14, aml: 7, fraud: 3 },
      { time: '۱۰', waf: 22, aml: 9, fraud: 5 },
      { time: '۱۲', waf: securityMode === 'incident' ? 58 : 27, aml: 13, fraud: 8 },
      { time: '۱۴', waf: securityMode === 'incident' ? 71 : 32, aml: 15, fraud: 9 },
      { time: '۱۶', waf: securityMode === 'strict' ? 36 : 26, aml: 17, fraud: 11 },
      { time: '۱۸', waf: 24, aml: 10, fraud: 6 }
    ];

    return { verified, pending, highValueTransactions, suspiciousScore, immutableLogs, threatTrend };
  }, [users, transactions, securityMode]);

  const securityKpis = [
    { title: '2FA Coverage', value: `${Math.round((users.length ? (users.length - 1) / users.length : 0) * 100)}%`, helper: 'TOTP و تایید حساس برای برداشت', icon: KeyRound, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'KYC / Legal', value: `${model.verified}/${users.length}`, helper: `${model.pending} پرونده نیازمند بررسی`, icon: UserCheck, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { title: 'AML Risk Score', value: `${model.suspiciousScore}/100`, helper: 'مبنای رفتار، مبلغ و الگوی تراکنش', icon: Radar, color: model.suspiciousScore > 70 ? 'text-rose-400' : 'text-amber-400', bg: model.suspiciousScore > 70 ? 'bg-rose-500/10' : 'bg-amber-500/10' },
    { title: 'Immutable Logs', value: model.immutableLogs.length.toLocaleString(), helper: 'ثبت غیرقابل تغییر برای Audit', icon: FileLock2, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
  ];

  const complianceControls = [
    { title: 'AML Monitoring', detail: 'پایش تراکنش پرحجم، برداشت تکراری، مقصد جدید و رفتار خارج از الگو', icon: Radar, status: model.suspiciousScore > 70 ? 'watch' as RiskStatus : 'clear' as RiskStatus },
    { title: 'گزارشات قانون و Audit', detail: 'خروجی قابل ارائه برای حسابرس، گزارش رگولاتوری و ردیابی تصمیمات', icon: ScrollText, status: 'clear' as RiskStatus },
    { title: 'Legal Hold / KYC Unit', detail: 'پرونده های نیازمند بررسی حقوقی، تکمیل مدارک و محدودیت برداشت', icon: Gavel, status: model.pending > 1 ? 'watch' as RiskStatus : 'clear' as RiskStatus },
    { title: 'Fraud Behavior Engine', detail: 'تشخیص IP غیرعادی، دستگاه جدید، سرعت کلیک و الگوی برداشت مشکوک', icon: Eye, status: securityMode === 'incident' ? 'blocked' as RiskStatus : 'clear' as RiskStatus }
  ];

  const securityLayers = [
    { title: 'Anti DDoS', desc: 'Rate limit، challenge و شناسایی burst', icon: WifiOff, value: securityMode === 'incident' ? 89 : 42 },
    { title: 'WAF', desc: 'SQLi / XSS / Bot filtering', icon: ShieldHalf, value: securityMode === 'normal' ? 64 : 82 },
    { title: 'SSL Protection', desc: 'TLS، HSTS و pinning سمت اپ', icon: LockKeyhole, value: 100 },
    { title: 'Threat Analytics', desc: 'همبستگی لاگ، هشدار و ریسک', icon: Siren, value: model.suspiciousScore }
  ];

  const qaChecks = [
    { title: 'Race Condition در برداشت', owner: 'Security QA', result: 'Guarded by balance lock', status: 'clear' as RiskStatus },
    { title: 'Replay Attack روی پرداخت', owner: 'Payment Core', result: 'Nonce enforced', status: 'clear' as RiskStatus },
    { title: 'Session Hijack', owner: 'Identity', result: 'Step-up 2FA required', status: 'clear' as RiskStatus },
    { title: 'Abnormal Device Fingerprint', owner: 'Risk Engine', result: 'Manual review queue', status: 'watch' as RiskStatus }
  ];

  return (
    <div className="space-y-6" id="risk-compliance-security-section" style={{ direction: 'rtl' }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden relative">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-rose-500/10 to-transparent pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100">ریسک، انطباق و امنیت</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                2FA، KYC و حقوقی، Compliance، Audit، AML Monitoring، Anti DDoS، WAF، QA امنیت و جلوگیری از تقلب
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {([
              ['normal', 'عادی'],
              ['strict', 'سختگیرانه'],
              ['incident', 'رخداد']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSecurityMode(value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  securityMode === value
                    ? 'bg-rose-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {securityKpis.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 font-bold">{item.title}</span>
                <div className={`${item.bg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100 tracking-tight">{item.value}</div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{item.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Radar className="w-4 h-4 text-rose-400" />
              مانیتورینگ AML، WAF و رفتار مشکوک
            </h3>
            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full px-2 py-1">
              Threat Intelligence
            </span>
          </div>

          <div className="h-80 font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={model.threatTrend}>
                <defs>
                  <linearGradient id="wafGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="amlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} fontSize={11} />
                <YAxis stroke="#64748b" tickLine={false} fontSize={11} orientation="right" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: any, name: any) => [Number(value).toLocaleString(), name === 'waf' ? 'WAF' : name === 'aml' ? 'AML' : 'Fraud']}
                />
                <Area type="monotone" dataKey="waf" stroke="#f43f5e" strokeWidth={3} fill="url(#wafGradient)" />
                <Area type="monotone" dataKey="aml" stroke="#f59e0b" strokeWidth={2} fill="url(#amlGradient)" />
                <Area type="monotone" dataKey="fraud" stroke="#38bdf8" strokeWidth={2} fill="#38bdf833" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">هویت، 2FA و KYC حقوقی</h3>
          </div>

          <div className="space-y-3">
            {users.map(user => {
              const isVerified = user.kycStatus === 'verified';
              const needsReview = user.kycStatus === 'pending' || user.kycStatus === 'unverified';
              return (
                <div key={user.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${user.avatarColor}`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{user.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">{user.role}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] border rounded-full px-2 py-0.5 ${
                      isVerified ? statusClasses.clear : needsReview ? statusClasses.watch : statusClasses.blocked
                    }`}>
                      {isVerified ? 'KYC تایید' : needsReview ? 'بررسی حقوقی' : 'رد شده'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
                      <span className="text-slate-500">2FA</span>
                      <span className="font-mono text-emerald-400 float-left">TOTP</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
                      <span className="text-slate-500">برداشت</span>
                      <span className={`font-mono float-left ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isVerified ? 'Active' : 'Limited'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-indigo-400" />
              Compliance و Audit
            </h3>
            <span className="text-[10px] text-slate-500">Immutable Logs / Legal Reports</span>
          </div>

          <div className="space-y-3">
            {complianceControls.map(control => {
              const Icon = control.icon;
              return (
                <div key={control.title} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-800 p-2 rounded-lg">
                        <Icon className="w-4 h-4 text-slate-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{control.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{control.detail}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] border rounded-full px-2 py-0.5 whitespace-nowrap ${statusClasses[control.status]}`}>
                      {statusLabels[control.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileLock2 className="w-4 h-4 text-emerald-400" />
              زنجیره لاگ غیرقابل تغییر
            </h3>
            <span className="text-[10px] text-slate-500">Hash chained events</span>
          </div>

          <div className="space-y-2 max-h-[384px] overflow-y-auto pr-1">
            {model.immutableLogs.map(log => (
              <div key={log.hash} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-100">{log.event}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{log.actor} / {log.time}</div>
                    <div className="text-[10px] text-slate-600 font-mono mt-1 select-all">{log.hash}</div>
                  </div>
                  <span className={`text-[9px] border rounded-full px-2 py-0.5 ${statusClasses[log.status]}`}>
                    {statusLabels[log.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">Anti DDoS / WAF / Protection</h3>
          </div>

          <div className="space-y-4">
            {securityLayers.map(layer => {
              const Icon = layer.icon;
              return (
                <div key={layer.title}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="flex items-center gap-2 font-bold text-slate-200">
                      <Icon className="w-4 h-4 text-slate-400" />
                      {layer.title}
                    </span>
                    <span className="font-mono text-slate-500">{layer.value}%</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full rounded-full ${layer.value > 84 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${layer.value}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">{layer.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-400" />
              تست امنیت و QA
            </h3>
            <span className="text-[10px] text-slate-500">Race Condition / Fraud / SSL</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-3 px-3">سناریو</th>
                  <th className="py-3 px-3">مالک</th>
                  <th className="py-3 px-3">نتیجه کنترل</th>
                  <th className="py-3 px-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {qaChecks.map(check => (
                  <tr key={check.title} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-100">{check.title}</td>
                    <td className="py-3 px-3 text-slate-400">{check.owner}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{check.result}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[9px] border rounded-full px-2 py-0.5 ${statusClasses[check.status]}`}>
                        {statusLabels[check.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-slate-400"><AlertTriangle className="w-4 h-4 text-amber-400" />رفتار مشکوک</span>
              <span className="font-mono text-amber-400">{model.highValueTransactions}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-slate-400"><UserX className="w-4 h-4 text-rose-400" />محدودیت برداشت</span>
              <span className="font-mono text-slate-200">{model.pending}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="w-4 h-4 text-emerald-400" />SSL</span>
              <span className="font-mono text-emerald-400">Valid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
