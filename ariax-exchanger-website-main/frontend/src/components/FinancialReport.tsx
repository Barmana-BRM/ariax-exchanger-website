import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, ReceiptText, TrendingUp, WalletCards } from 'lucide-react';
import { MarketTicker, Transaction, User } from '../types';

interface FinancialReportProps {
  users: User[];
  transactions: Transaction[];
  tickers: MarketTicker[];
  accessLevel: 'admin' | 'user';
  activeUser: User;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

const assetTitle: Record<Transaction['asset'], string> = {
  IRT: 'تومان',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  TRX: 'Tron'
};

const transactionTypeTitle: Record<Transaction['type'], string> = {
  deposit: 'واریز',
  withdraw: 'برداشت',
  trade: 'معامله'
};

const formatIRT = (value: number) => `${Math.round(value).toLocaleString('fa-IR')} تومان`;

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function FinancialReport({ users, transactions, tickers, accessLevel, activeUser }: FinancialReportProps) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const isAdminReport = accessLevel === 'admin';

  const getAssetPrice = (asset: Transaction['asset']) => {
    if (asset === 'IRT') return 1;
    return tickers.find(ticker => ticker.symbol === asset)?.priceIRT || 1;
  };

  const report = useMemo(() => {
    const rows = transactions.map(tx => {
      const priceIRT = getAssetPrice(tx.asset);
      const grossValueIRT = tx.amount * priceIRT;
      const feeValueIRT = tx.fee * priceIRT;
      const netValueIRT = tx.type === 'withdraw' ? grossValueIRT + feeValueIRT : grossValueIRT - feeValueIRT;
      const revenueIRT = tx.type === 'trade' ? grossValueIRT * 0.002 : feeValueIRT;

      return {
        ...tx,
        priceIRT,
        grossValueIRT,
        feeValueIRT,
        netValueIRT,
        revenueIRT
      };
    });

    const totalDeposits = rows.filter(row => row.type === 'deposit').reduce((sum, row) => sum + row.grossValueIRT, 0);
    const totalWithdrawals = rows.filter(row => row.type === 'withdraw').reduce((sum, row) => sum + row.grossValueIRT, 0);
    const totalTrades = rows.filter(row => row.type === 'trade').reduce((sum, row) => sum + row.grossValueIRT, 0);
    const totalFees = rows.reduce((sum, row) => sum + row.feeValueIRT, 0);
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenueIRT, 0);

    const treasuryRows = (['IRT', 'BTC', 'ETH', 'USDT', 'TRX'] as Transaction['asset'][]).map(asset => {
      const balance = users.reduce((sum, user) => sum + user.balances[asset], 0);
      const priceIRT = getAssetPrice(asset);
      return {
        asset,
        title: assetTitle[asset],
        balance,
        priceIRT,
        valueIRT: balance * priceIRT
      };
    });

    const userRows = users.map(user => {
      const userTxs = rows.filter(row => row.userId === user.id);
      return {
        id: user.id,
        name: user.name,
        kycStatus: user.kycStatus,
        transactions: userTxs.length,
        turnoverIRT: userTxs.reduce((sum, row) => sum + row.grossValueIRT, 0),
        feesIRT: userTxs.reduce((sum, row) => sum + row.feeValueIRT, 0)
      };
    });

    return {
      rows,
      treasuryRows,
      userRows,
      totalDeposits,
      totalWithdrawals,
      totalTrades,
      totalFees,
      totalRevenue
    };
  }, [transactions, tickers, users]);

  const buildTable = (title: string, headers: string[], rows: Array<Array<string | number>>) => `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead>
        <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;

  const handleDownloadExcel = () => {
    const generatedAt = new Date().toLocaleString('fa-IR');
    const periodLabel = period === 'daily' ? 'روزانه' : period === 'weekly' ? 'هفتگی' : 'ماهانه';
    const reportOwner = isAdminReport ? 'کل سیستم' : activeUser.name;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { direction: rtl; font-family: Tahoma, Arial, sans-serif; color: #0f172a; }
            h1 { font-size: 22px; margin: 0 0 8px; color: #064e3b; }
            h2 { font-size: 15px; margin: 24px 0 8px; color: #0f172a; }
            .meta { margin-bottom: 18px; color: #475569; font-size: 12px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
            th { background: #10b981; color: #0f172a; font-weight: 700; border: 1px solid #047857; padding: 9px; text-align: center; }
            td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; mso-number-format: "\\@"; }
            tr:nth-child(even) td { background: #f8fafc; }
            .summary td:first-child { font-weight: 700; background: #ecfdf5; }
          </style>
        </head>
        <body>
          <h1>گزارش مالی آریا اکس</h1>
          <div class="meta">سطح گزارش: ${escapeHtml(reportOwner)} | دوره گزارش: ${escapeHtml(periodLabel)} | تاریخ تولید: ${escapeHtml(generatedAt)}</div>
          <table class="summary">
            <tbody>
              <tr><td>مجموع واریز</td><td>${escapeHtml(Math.round(report.totalDeposits).toLocaleString('fa-IR'))}</td></tr>
              <tr><td>مجموع برداشت</td><td>${escapeHtml(Math.round(report.totalWithdrawals).toLocaleString('fa-IR'))}</td></tr>
              <tr><td>حجم معاملات</td><td>${escapeHtml(Math.round(report.totalTrades).toLocaleString('fa-IR'))}</td></tr>
              <tr><td>کارمزدها</td><td>${escapeHtml(Math.round(report.totalFees).toLocaleString('fa-IR'))}</td></tr>
              <tr><td>درآمد تخمینی</td><td>${escapeHtml(Math.round(report.totalRevenue).toLocaleString('fa-IR'))}</td></tr>
            </tbody>
          </table>
          ${buildTable(
            'دفتر تراکنش‌ها',
            ['شناسه', 'کاربر', 'نوع', 'دارایی', 'مقدار', 'نرخ تومان', 'ارزش ناخالص', 'کارمزد', 'ارزش خالص', 'وضعیت', 'زمان'],
            report.rows.map(row => [
              row.id,
              row.userName,
              transactionTypeTitle[row.type],
              row.asset,
              row.amount,
              Math.round(row.priceIRT).toLocaleString('fa-IR'),
              Math.round(row.grossValueIRT).toLocaleString('fa-IR'),
              Math.round(row.feeValueIRT).toLocaleString('fa-IR'),
              Math.round(row.netValueIRT).toLocaleString('fa-IR'),
              row.status,
              row.timestamp
            ])
          )}
          ${buildTable(
            isAdminReport ? 'خزانه و موجودی دارایی‌ها' : 'موجودی دارایی‌های کاربر',
            ['دارایی', 'نام', 'موجودی', 'نرخ تومان', 'ارزش تومان'],
            report.treasuryRows.map(row => [
              row.asset,
              row.title,
              row.balance,
              Math.round(row.priceIRT).toLocaleString('fa-IR'),
              Math.round(row.valueIRT).toLocaleString('fa-IR')
            ])
          )}
          ${buildTable(
            isAdminReport ? 'عملکرد کاربران' : 'خلاصه عملکرد حساب',
            ['کاربر', 'وضعیت KYC', 'تعداد تراکنش', 'گردش مالی', 'کارمزد'],
            report.userRows.map(row => [
              row.name,
              row.kycStatus,
              row.transactions,
              Math.round(row.turnoverIRT).toLocaleString('fa-IR'),
              Math.round(row.feesIRT).toLocaleString('fa-IR')
            ])
          )}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ariaex-financial-report-${accessLevel}-${period}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { title: 'مجموع واریز', value: formatIRT(report.totalDeposits), icon: WalletCards, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'مجموع برداشت', value: formatIRT(report.totalWithdrawals), icon: ReceiptText, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { title: 'حجم معاملات', value: formatIRT(report.totalTrades), icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { title: 'درآمد تخمینی', value: formatIRT(report.totalRevenue), icon: FileSpreadsheet, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  ];

  return (
    <div className="space-y-6" style={{ direction: 'rtl' }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100">گزارش مالی</h2>
              <p className="text-xs text-slate-400 mt-1">
                {isAdminReport
                  ? 'خلاصه تراکنش‌ها، خزانه و عملکرد همه کاربران با خروجی اکسل مرتب'
                  : `گزارش تراکنش‌ها و موجودی‌های ${activeUser.name} با خروجی اکسل مرتب`}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="flex gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              {([
                ['daily', 'روزانه'],
                ['weekly', 'هفتگی'],
                ['monthly', 'ماهانه']
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    period === value
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black transition-colors"
            >
              <Download className="w-4 h-4" />
              دانلود اکسل
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 font-bold">{card.title}</span>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="text-xl font-black font-mono text-slate-100 tracking-tight">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-4">آخرین تراکنش‌های مالی</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-3 px-3">شناسه</th>
                  <th className="py-3 px-3">کاربر</th>
                  <th className="py-3 px-3">نوع</th>
                  <th className="py-3 px-3">دارایی</th>
                  <th className="py-3 px-3">ارزش تومان</th>
                  <th className="py-3 px-3">کارمزد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {report.rows.slice(0, 8).map(row => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">#{row.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-100">{row.userName}</td>
                    <td className="py-3 px-3 text-slate-300">{transactionTypeTitle[row.type]}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{row.amount.toLocaleString()} {row.asset}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">{formatIRT(row.grossValueIRT)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{formatIRT(row.feeValueIRT)}</td>
                  </tr>
                ))}
                {report.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">هنوز تراکنشی ثبت نشده است.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-100 mb-4">{isAdminReport ? 'خلاصه خزانه' : 'خلاصه موجودی من'}</h3>
          <div className="space-y-3">
            {report.treasuryRows.map(row => (
              <div key={row.asset} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-100">{row.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">{row.balance.toLocaleString()} {row.asset}</div>
                  </div>
                  <div className="font-mono text-xs text-slate-200">{formatIRT(row.valueIRT)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
