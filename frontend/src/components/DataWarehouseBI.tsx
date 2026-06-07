import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { MarketTicker, Transaction, User } from '../types';
import {
  BarChart3,
  Database,
  FileText,
  Gauge,
  LineChart,
  PieChart as PieChartIcon,
  RefreshCw,
  Table2,
  TrendingUp
} from 'lucide-react';

interface DataWarehouseBIProps {
  users: User[];
  transactions: Transaction[];
  tickers: MarketTicker[];
}

const assetLabels: Record<Transaction['asset'], string> = {
  IRT: 'تومان',
  BTC: 'بیت کوین',
  ETH: 'اتریوم',
  USDT: 'تتر',
  TRX: 'ترون'
};

export default function DataWarehouseBI({ users, transactions, tickers }: DataWarehouseBIProps) {
  const [reportScope, setReportScope] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const getAssetPriceIRT = (asset: Transaction['asset']) => {
    if (asset === 'IRT') return 1;
    return tickers.find(t => t.symbol === asset)?.priceIRT || 1;
  };

  const biModel = useMemo(() => {
    const enrichedTransactions = transactions.map(tx => {
      const valueIRT = tx.amount * getAssetPriceIRT(tx.asset);
      const feeValueIRT = tx.fee * getAssetPriceIRT(tx.asset);
      const spreadRevenueIRT = tx.type === 'trade' ? valueIRT * 0.0018 : 0;

      return {
        ...tx,
        valueIRT,
        feeValueIRT,
        revenueIRT: feeValueIRT + spreadRevenueIRT
      };
    });

    const totalVolumeIRT = enrichedTransactions.reduce((sum, tx) => sum + tx.valueIRT, 0);
    const revenueIRT = enrichedTransactions.reduce((sum, tx) => sum + tx.revenueIRT, 0);
    const feeRevenueIRT = enrichedTransactions.reduce((sum, tx) => sum + tx.feeValueIRT, 0);
    const tradeCount = enrichedTransactions.filter(tx => tx.type === 'trade').length;
    const verifiedUsers = users.filter(user => user.kycStatus === 'verified').length;
    const activeOperators = new Set(enrichedTransactions.map(tx => tx.userId)).size;

    const assetBreakdown = (['IRT', 'BTC', 'ETH', 'USDT', 'TRX'] as Transaction['asset'][]).map(asset => {
      const volume = enrichedTransactions
        .filter(tx => tx.asset === asset)
        .reduce((sum, tx) => sum + tx.valueIRT, 0);
      return {
        asset,
        name: assetLabels[asset],
        volume,
        share: totalVolumeIRT ? (volume / totalVolumeIRT) * 100 : 0
      };
    }).filter(item => item.volume > 0);

    const operatorRows = users.map(user => {
      const userTransactions = enrichedTransactions.filter(tx => tx.userId === user.id);
      const turnover = userTransactions.reduce((sum, tx) => sum + tx.valueIRT, 0);
      const revenue = userTransactions.reduce((sum, tx) => sum + tx.revenueIRT, 0);
      return {
        id: user.id,
        name: user.name,
        role: user.role,
        transactions: userTransactions.length,
        turnover,
        revenue
      };
    }).sort((a, b) => b.turnover - a.turnover);

    const scale = reportScope === 'daily' ? 0.42 : reportScope === 'weekly' ? 1 : 3.7;
    const trend = [
      { label: 'شنبه', revenue: revenueIRT * 0.62 * scale, volume: totalVolumeIRT * 0.52 * scale },
      { label: 'یکشنبه', revenue: revenueIRT * 0.78 * scale, volume: totalVolumeIRT * 0.66 * scale },
      { label: 'دوشنبه', revenue: revenueIRT * 0.91 * scale, volume: totalVolumeIRT * 0.74 * scale },
      { label: 'سه شنبه', revenue: revenueIRT * 1.07 * scale, volume: totalVolumeIRT * 0.95 * scale },
      { label: 'چهارشنبه', revenue: revenueIRT * 1.18 * scale, volume: totalVolumeIRT * 1.08 * scale },
      { label: 'پنجشنبه', revenue: revenueIRT * 0.86 * scale, volume: totalVolumeIRT * 0.71 * scale }
    ];

    return {
      totalVolumeIRT,
      revenueIRT,
      feeRevenueIRT,
      tradeCount,
      verifiedUsers,
      activeOperators,
      assetBreakdown,
      operatorRows,
      trend
    };
  }, [transactions, tickers, users, reportScope]);

  const kpiCards = [
    {
      title: 'حجم کل پردازش شده',
      value: `${Math.round(biModel.totalVolumeIRT).toLocaleString()} ت`,
      helper: 'تجمیع تراکنش ها با نرخ لحظه ای بازار',
      icon: Database,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      title: 'درآمد تخمینی',
      value: `${Math.round(biModel.revenueIRT).toLocaleString()} ت`,
      helper: 'کارمزد ثبت شده + اسپرد معاملات داخلی',
      icon: TrendingUp,
      accent: 'text-sky-400',
      bg: 'bg-sky-500/10'
    },
    {
      title: 'KPI تبدیل و معامله',
      value: `${biModel.tradeCount} معامله`,
      helper: `${biModel.activeOperators} اپراتور فعال در دفتر کل`,
      icon: Gauge,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10'
    },
    {
      title: 'پوشش احراز هویت',
      value: `${Math.round((biModel.verifiedUsers / users.length) * 100)}%`,
      helper: `${biModel.verifiedUsers} حساب تایید شده از ${users.length} عضو`,
      icon: FileText,
      accent: 'text-indigo-400',
      bg: 'bg-indigo-500/10'
    }
  ];

  const reportCards = [
    { title: 'گزارش مدیریتی روزانه', desc: 'خلاصه گردش، درآمد، کارمزد و وضعیت کاربران برای مدیرعامل', status: 'آماده انتشار' },
    { title: 'Revenue Analytics', desc: 'تفکیک درآمد کارمزد، اسپرد و هزینه شبکه به ازای هر دارایی', status: 'به روز' },
    { title: 'KPI Console', desc: 'نرخ تبدیل معامله، پوشش KYC، سهم دارایی و عملکرد هر اپراتور', status: 'زنده' },
    { title: 'Data Mart مالی', desc: 'لایه تمیز شده برای خروجی CSV، اکسل و اتصال BI سازمانی', status: 'همگام' }
  ];

  const pipelineStages = [
    { name: 'Ingestion', label: 'دریافت رویدادها', value: 100 },
    { name: 'Warehouse', label: 'انبار داده', value: 92 },
    { name: 'KPI Mart', label: 'مدل KPI', value: 88 },
    { name: 'BI Reports', label: 'گزارش مدیریتی', value: 96 }
  ];

  const pieColors = ['#10b981', '#38bdf8', '#f59e0b', '#818cf8', '#f43f5e'];

  return (
    <div className="space-y-6" id="data-warehouse-bi-section" style={{ direction: 'rtl' }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden relative">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100">Data Warehouse و BI صرافی</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                تحلیل داده ها، KPI، گزارشات مدیریتی و تحلیل درآمد بر اساس تراکنش های زنده و نرخ های لحظه ای بازار
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {([
              ['daily', 'روزانه'],
              ['weekly', 'هفتگی'],
              ['monthly', 'ماهانه']
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setReportScope(value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  reportScope === value
                    ? 'bg-emerald-500 text-slate-950'
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
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 font-bold">{card.title}</span>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${card.accent}`} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100 tracking-tight">{card.value}</div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{card.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <LineChart className="w-4 h-4 text-emerald-400" />
                روند درآمد و حجم عملیاتی
              </h3>
              <p className="text-xs text-slate-500 mt-1">مبنای محاسبه: تراکنش های دفتر کل + مدل تخمینی اسپرد</p>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1 font-mono">
              BI Live
            </span>
          </div>

          <div className="h-80 font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={biModel.trend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
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
                  labelStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                  formatter={(value: any, name: any) => [
                    `${Math.round(Number(value)).toLocaleString()} تومان`,
                    name === 'revenue' ? 'درآمد' : 'حجم'
                  ]}
                />
                <Area type="monotone" dataKey="volume" stroke="#38bdf8" strokeWidth={2} fill="url(#volumeGradient)" />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <PieChartIcon className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">سهم دارایی ها از گردش</h3>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={biModel.assetBreakdown} dataKey="volume" nameKey="asset" innerRadius={52} outerRadius={80} paddingAngle={3}>
                  {biModel.assetBreakdown.map((entry, index) => (
                    <Cell key={entry.asset} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: any) => [`${Math.round(Number(value)).toLocaleString()} تومان`, 'گردش']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {biModel.assetBreakdown.map((item, index) => (
              <div key={item.asset} className="flex items-center justify-between text-xs bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }}></span>
                  {item.name}
                </span>
                <span className="font-mono text-slate-400">{item.share.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              عملکرد اپراتورها در مدل BI
            </h3>
            <span className="text-[10px] text-slate-500">مرتب شده بر اساس گردش</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-3 px-3">اپراتور</th>
                  <th className="py-3 px-3">تعداد تراکنش</th>
                  <th className="py-3 px-3">گردش تخمینی</th>
                  <th className="py-3 px-3">درآمد منتسب</th>
                  <th className="py-3 px-3">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {biModel.operatorRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-100">{row.name}</div>
                      <div className="text-[10px] text-slate-500 max-w-[180px] truncate">{row.role}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{row.transactions}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{Math.round(row.turnover).toLocaleString()} ت</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{Math.round(row.revenue).toLocaleString()} ت</td>
                    <td className="py-3 px-3">
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-1 text-[10px]">
                        قابل گزارش
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Table2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Pipeline انبار داده</h3>
          </div>
          <div className="space-y-4">
            {pipelineStages.map(stage => (
              <div key={stage.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-200">{stage.label}</span>
                  <span className="font-mono text-slate-500">{stage.name} / {stage.value}%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="h-full bg-gradient-to-l from-emerald-500 to-sky-400 rounded-full" style={{ width: `${stage.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {reportCards.map(report => (
              <div key={report.title} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-100">{report.title}</h4>
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5 whitespace-nowrap">{report.status}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-2">{report.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">آخرین همگام سازی BI</div>
              <div className="text-[10px] text-slate-500 mt-1">هر تغییر در تراکنش ها بلافاصله وارد مدل محاسباتی می شود</div>
            </div>
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100">تحلیل درآمد به تفکیک دارایی</h3>
          <span className="text-[10px] text-slate-500">کارمزد قطعی: {Math.round(biModel.feeRevenueIRT).toLocaleString()} تومان</span>
        </div>
        <div className="h-72 font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={biModel.assetBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="asset" stroke="#64748b" tickLine={false} fontSize={11} />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                fontSize={11}
                orientation="right"
                tickFormatter={(val) => val >= 1000000 ? `${(Number(val) / 1000000).toFixed(1)}M` : Number(val).toLocaleString()}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                formatter={(value: any) => [`${Math.round(Number(value)).toLocaleString()} تومان`, 'گردش']}
              />
              <Bar dataKey="volume" radius={[8, 8, 0, 0]}>
                {biModel.assetBreakdown.map((entry, index) => (
                  <Cell key={entry.asset} fill={pieColors[index % pieColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
