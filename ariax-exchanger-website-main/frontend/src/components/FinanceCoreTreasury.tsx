import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { MarketTicker, Transaction, User } from '../types';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  BookOpenCheck,
  CircleDollarSign,
  CreditCard,
  Landmark,
  LineChart,
  PiggyBank,
  ReceiptText,
  Scale,
  ShieldCheck,
  WalletCards
} from 'lucide-react';

interface FinanceCoreTreasuryProps {
  users: User[];
  transactions: Transaction[];
  tickers: MarketTicker[];
}

const assetNames: Record<Transaction['asset'], string> = {
  IRT: 'تومان',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  TRX: 'Tron'
};

export default function FinanceCoreTreasury({ users, transactions, tickers }: FinanceCoreTreasuryProps) {
  const [settlementCycle, setSettlementCycle] = useState<'instant' | 'paya' | 'satna'>('instant');

  const getPriceIRT = (asset: Transaction['asset']) => {
    if (asset === 'IRT') return 1;
    return tickers.find(ticker => ticker.symbol === asset)?.priceIRT || 1;
  };

  const model = useMemo(() => {
    const entries = transactions.map(tx => {
      const valueIRT = tx.amount * getPriceIRT(tx.asset);
      const feeIRT = tx.fee * getPriceIRT(tx.asset);
      const pnlIRT = tx.type === 'trade' ? valueIRT * 0.0022 : feeIRT;
      return { ...tx, valueIRT, feeIRT, pnlIRT };
    });

    const deposits = entries.filter(tx => tx.type === 'deposit').reduce((sum, tx) => sum + tx.valueIRT, 0);
    const withdrawals = entries.filter(tx => tx.type === 'withdraw').reduce((sum, tx) => sum + tx.valueIRT, 0);
    const trades = entries.filter(tx => tx.type === 'trade').reduce((sum, tx) => sum + tx.valueIRT, 0);
    const pnl = entries.reduce((sum, tx) => sum + tx.pnlIRT, 0);
    const fees = entries.reduce((sum, tx) => sum + tx.feeIRT, 0);

    const treasury = users.reduce((acc, user) => {
      acc.IRT += user.balances.IRT;
      acc.BTC += user.balances.BTC;
      acc.ETH += user.balances.ETH;
      acc.USDT += user.balances.USDT;
      acc.TRX += user.balances.TRX;
      return acc;
    }, { IRT: 0, BTC: 0, ETH: 0, USDT: 0, TRX: 0 });

    const treasuryRows = (Object.keys(treasury) as Transaction['asset'][]).map(asset => {
      const balance = treasury[asset];
      const valueIRT = balance * getPriceIRT(asset);
      const reserveFloor = asset === 'IRT' ? 120000000 : asset === 'USDT' ? 12000 : asset === 'TRX' ? 18000 : asset === 'BTC' ? 0.25 : 2.4;
      return {
        asset,
        balance,
        valueIRT,
        reserveFloor,
        health: balance >= reserveFloor ? 'healthy' : balance >= reserveFloor * 0.75 ? 'watch' : 'low'
      };
    });

    const settlementMultiplier = settlementCycle === 'instant' ? 1 : settlementCycle === 'paya' ? 0.72 : 0.55;
    const settlementQueue = [
      { name: 'برداشت ریالی', count: 18, amount: withdrawals * 0.64 * settlementMultiplier, status: 'در انتظار تسویه' },
      { name: 'خروج رمزارز', count: 9, amount: withdrawals * 0.21 * settlementMultiplier, status: 'در صف امضا' },
      { name: 'واریز بانکی', count: 31, amount: deposits * 0.48 * settlementMultiplier, status: 'تطبیق بانک' },
      { name: 'کارمزد شبکه', count: 12, amount: fees * 1.15, status: 'رزرو شده' }
    ];

    const pnlTrend = [
      { label: '۰۸', pnl: pnl * 0.42, capital: deposits * 0.38 },
      { label: '۱۰', pnl: pnl * 0.67, capital: deposits * 0.52 },
      { label: '۱۲', pnl: pnl * 0.88, capital: deposits * 0.73 },
      { label: '۱۴', pnl: pnl * 1.12, capital: deposits * 0.91 },
      { label: '۱۶', pnl: pnl * 0.94, capital: deposits * 0.85 },
      { label: '۱۸', pnl: pnl * 1.24, capital: deposits * 1.08 }
    ];

    return { entries, deposits, withdrawals, trades, pnl, fees, treasuryRows, settlementQueue, pnlTrend };
  }, [transactions, users, tickers, settlementCycle]);

  const healthClasses = {
    healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    watch: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  const healthLabels = {
    healthy: 'ذخیره امن',
    watch: 'نیازمند پایش',
    low: 'کمبود ذخیره'
  };

  const kpis = [
    { title: 'Ledger Entries', value: model.entries.length.toLocaleString(), helper: 'ثبت دوطرفه و قابل ردیابی', icon: BookOpenCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'تسویه های فعال', value: `${model.settlementQueue.reduce((sum, item) => sum + item.count, 0)} مورد`, helper: 'بانکی، رمزارزی و رزرو کارمزد', icon: ReceiptText, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { title: 'سود و زیان تخمینی', value: `${Math.round(model.pnl).toLocaleString()} ت`, helper: 'اسپرد معاملات + کارمزد قطعی', icon: LineChart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'سرمایه در گردش', value: `${Math.round(model.deposits - model.withdrawals + model.trades).toLocaleString()} ت`, helper: 'ورودی، خروجی و معاملات داخلی', icon: PiggyBank, color: 'text-indigo-400', bg: 'bg-indigo-500/10' }
  ];

  return (
    <div className="space-y-6" id="finance-core-treasury-section" style={{ direction: 'rtl' }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden relative">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-amber-500/10 to-transparent pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <Landmark className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100">مالی، هسته تراکنش و مدیریت خزانه</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ledger، تسویه ها، پرداخت، سود و زیان، کنترل ذخایر و مدیریت سرمایه داخلی صرافی
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {([
              ['instant', 'آنی'],
              ['paya', 'پایا'],
              ['satna', 'ساتنا']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSettlementCycle(value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  settlementCycle === value
                    ? 'bg-amber-400 text-slate-950'
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
        {kpis.map(item => {
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
              <BookOpenCheck className="w-4 h-4 text-emerald-400" />
              دفتر کل مالی و هسته تراکنش
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-1">
              Double-entry Ready
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-3 px-3">شناسه</th>
                  <th className="py-3 px-3">کاربر</th>
                  <th className="py-3 px-3">نوع سند</th>
                  <th className="py-3 px-3">دارایی</th>
                  <th className="py-3 px-3">ارزش ریالی</th>
                  <th className="py-3 px-3">وضعیت سند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {model.entries.slice(0, 7).map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">#{entry.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-100">{entry.userName}</td>
                    <td className="py-3 px-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] ${
                        entry.type === 'deposit'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : entry.type === 'withdraw'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-sky-500/10 text-sky-400'
                      }`}>
                        {entry.type === 'deposit' ? 'واریز' : entry.type === 'withdraw' ? 'برداشت' : 'معامله'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{entry.amount.toLocaleString()} {entry.asset}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{Math.round(entry.valueIRT).toLocaleString()} ت</td>
                    <td className="py-3 px-3">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px]">تراز شده</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <WalletCards className="w-4 h-4 text-amber-400" />
              کنترل ذخایر و مانده کیف پول ها
            </h3>
            <span className="text-[10px] text-slate-500">Treasury Control</span>
          </div>

          <div className="space-y-3">
            {model.treasuryRows.map(row => (
              <div key={row.asset} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{assetNames[row.asset]}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{row.balance.toLocaleString()} {row.asset}</p>
                  </div>
                  <span className={`text-[9px] border rounded-full px-2 py-0.5 ${healthClasses[row.health]}`}>
                    {healthLabels[row.health]}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>ارزش خزانه</span>
                  <span className="font-mono text-slate-200">{Math.round(row.valueIRT).toLocaleString()} ت</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">پرداخت و صف تسویه ها</h3>
          </div>

          <div className="space-y-3">
            {model.settlementQueue.map(item => (
              <div key={item.name} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">{item.status}</p>
                  </div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full px-2 py-1">
                    {item.count} مورد
                  </span>
                </div>
                <div className="font-mono text-sm font-bold text-slate-200 mt-3">{Math.round(item.amount).toLocaleString()} تومان</div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-emerald-400" />
              سود و زیان و مدیریت سرمایه داخلی
            </h3>
            <span className="text-[10px] text-slate-500">P&L / Capital Management</span>
          </div>

          <div className="h-72 font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={model.pnlTrend}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tickLine={false} fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  tickLine={false}
                  fontSize={11}
                  orientation="right"
                  tickFormatter={(val) => val >= 1000000 ? `${(Number(val) / 1000000).toFixed(1)}M` : Number(val).toLocaleString()}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: any, name: any) => [
                    `${Math.round(Number(value)).toLocaleString()} تومان`,
                    name === 'pnl' ? 'سود و زیان' : 'سرمایه'
                  ]}
                />
                <Area type="monotone" dataKey="capital" stroke="#38bdf8" strokeWidth={2} fill="#38bdf833" />
                <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={3} fill="url(#pnlGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            نسبت ورودی، خروجی و معامله
          </h3>
          <span className="text-[10px] text-slate-500">برای کنترل نقدینگی عملیاتی</span>
        </div>
        <div className="h-64 font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'واریز', amount: model.deposits, color: '#10b981' },
              { name: 'برداشت', amount: model.withdrawals, color: '#f43f5e' },
              { name: 'معامله', amount: model.trades, color: '#38bdf8' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tickLine={false} fontSize={11} />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                fontSize={11}
                orientation="right"
                tickFormatter={(val) => val >= 1000000 ? `${(Number(val) / 1000000).toFixed(1)}M` : Number(val).toLocaleString()}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                formatter={(value: any) => [`${Math.round(Number(value)).toLocaleString()} تومان`, 'مبلغ']}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {['#10b981', '#f43f5e', '#38bdf8'].map(color => (
                  <Cell key={color} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400"><ArrowDownToLine className="w-4 h-4 text-emerald-400" />ورودی</span>
            <span className="font-mono text-slate-200">{Math.round(model.deposits).toLocaleString()} ت</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400"><ArrowUpFromLine className="w-4 h-4 text-rose-400" />خروجی</span>
            <span className="font-mono text-slate-200">{Math.round(model.withdrawals).toLocaleString()} ت</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-400"><Banknote className="w-4 h-4 text-sky-400" />پرداخت</span>
            <span className="font-mono text-slate-200">آماده</span>
          </div>
        </div>
      </div>
    </div>
  );
}
