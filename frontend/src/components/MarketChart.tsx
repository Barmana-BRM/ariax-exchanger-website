import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import { MarketTicker, Transaction, User } from '../types';

interface MarketChartProps {
  tickers: MarketTicker[];
  selectedTicker: MarketTicker;
  onSelectTicker: (ticker: MarketTicker) => void;
  activeUser: User;
  onUpdateBalances: (userId: string, newBalances: User['balances']) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp' | 'status'>) => void;
}

const assetLabel: Record<Transaction['asset'], string> = {
  IRT: 'تومان',
  BTC: 'بیت‌کوین',
  ETH: 'اتریوم',
  USDT: 'تتر',
  TRX: 'ترون'
};

export default function MarketChart({
  tickers,
  selectedTicker,
  onSelectTicker,
  activeUser,
  onUpdateBalances,
  onAddTransaction
}: MarketChartProps) {
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '7D'>('24H');
  const [fromAsset, setFromAsset] = useState<Transaction['asset']>('IRT');
  const [toAsset, setToAsset] = useState<Transaction['asset']>('USDT');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getPriceIRT = (asset: Transaction['asset']) => {
    if (asset === 'IRT') return 1;
    return tickers.find(ticker => ticker.symbol === asset)?.priceIRT || 1;
  };

  useEffect(() => {
    const amount = Number(fromAmount);
    if (!amount || amount <= 0) {
      setToAmount('');
      return;
    }

    const result = (amount * getPriceIRT(fromAsset)) / getPriceIRT(toAsset);
    setToAmount((result * 0.999).toFixed(toAsset === 'BTC' || toAsset === 'ETH' ? 6 : 2));
  }, [fromAmount, fromAsset, toAsset, tickers]);

  const filteredHistory = timeframe === '1H'
    ? selectedTicker.history.slice(-10)
    : timeframe === '24H'
      ? selectedTicker.history
      : selectedTicker.history.map((item, index) => ({ ...item, time: `روز ${index + 1}` }));

  const handleSwap = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const amount = Number(fromAmount);
    const received = Number(toAmount);

    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'لطفا مبلغ معتبر وارد کنید.' });
      return;
    }

    if (fromAsset === toAsset) {
      setMessage({ type: 'error', text: 'دارایی مبدا و مقصد نباید یکسان باشد.' });
      return;
    }

    if (amount > activeUser.balances[fromAsset]) {
      setMessage({ type: 'error', text: 'موجودی کافی نیست.' });
      return;
    }

    if (!received || received <= 0) {
      setMessage({ type: 'error', text: 'محاسبه مبلغ دریافتی ممکن نیست.' });
      return;
    }

    const nextBalances = { ...activeUser.balances };
    nextBalances[fromAsset] = Number((nextBalances[fromAsset] - amount).toFixed(fromAsset === 'BTC' || fromAsset === 'ETH' ? 6 : 2));
    nextBalances[toAsset] = Number((nextBalances[toAsset] + received).toFixed(toAsset === 'BTC' || toAsset === 'ETH' ? 6 : 2));

    onUpdateBalances(activeUser.id, nextBalances);
    onAddTransaction({
      userId: activeUser.id,
      userName: activeUser.name,
      type: 'trade',
      asset: fromAsset,
      amount,
      fee: Number((amount * 0.001).toFixed(6)),
      destination: `تبدیل به ${toAsset}، دریافت ${received.toLocaleString()} ${toAsset}`
    });

    setMessage({ type: 'success', text: 'تبدیل با موفقیت انجام شد.' });
    setFromAmount('');
    setToAmount('');
  };

  const isPositive = selectedTicker.change24h >= 0;
  const chartColor = isPositive ? '#10b981' : '#f43f5e';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="market-section" style={{ direction: 'rtl' }}>
      <div className="lg:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tickers.map(ticker => {
            const selected = ticker.symbol === selectedTicker.symbol;
            const positive = ticker.change24h >= 0;
            return (
              <button
                key={ticker.symbol}
                onClick={() => onSelectTicker(ticker)}
                className={`p-4 rounded-xl text-right transition-all border ${selected ? 'bg-slate-800 border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">{ticker.symbol}/IRT</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {positive ? '+' : ''}{ticker.change24h}%
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-100 font-mono tracking-tight">
                  {ticker.priceIRT.toLocaleString()} <span className="text-xs font-normal font-sans text-slate-400">تومان</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">${ticker.priceUSD.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-2 font-medium">{ticker.faName}</div>
              </button>
            );
          })}
        </div>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100">نمودار قیمت {selectedTicker.faName}</h3>
              <p className="text-xs text-slate-400 mt-1">نمای تغییرات قیمت و حجم بازار</p>
            </div>
            <div className="flex gap-1.5 bg-slate-800 p-1 rounded-lg">
              {(['1H', '24H', '7D'] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setTimeframe(item)}
                  className={`text-xs px-3 py-1.5 rounded-md font-mono transition-all ${timeframe === item ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-100'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-slate-800/40 p-4 rounded-xl font-mono text-center">
            <div>
              <div className="text-xs text-slate-400 mb-1">کمترین قیمت ۲۴ ساعت</div>
              <div className="text-sm font-bold text-rose-400">{selectedTicker.low24h.toLocaleString()} ت</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">بیشترین قیمت ۲۴ ساعت</div>
              <div className="text-sm font-bold text-emerald-400">{selectedTicker.high24h.toLocaleString()} ت</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">حجم معاملات</div>
              <div className="text-sm font-bold text-slate-300">{selectedTicker.volume24h.toLocaleString()} {selectedTicker.symbol}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">تغییر نرخ روزانه</div>
              <div className={`text-sm font-bold flex items-center justify-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {selectedTicker.change24h}%
              </div>
            </div>
          </div>

          <div className="h-64 md:h-80 w-full font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" tickLine={false} fontSize={11} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tickLine={false} fontSize={11} orientation="right" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} تومان`, 'قیمت']}
                />
                <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-emerald-500/10 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">تبدیل سریع</h3>
              <p className="text-xs text-slate-400">تسویه فوری در کیف پول شما</p>
            </div>
          </div>

          <form onSubmit={handleSwap} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">پرداخت از</label>
              <div className="flex bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={fromAmount}
                  onChange={(event) => setFromAmount(event.target.value)}
                  className="w-full bg-transparent px-3 py-2.5 outline-none font-mono text-slate-100 text-sm"
                />
                <select value={fromAsset} onChange={(event) => setFromAsset(event.target.value as Transaction['asset'])} className="bg-slate-700 text-slate-200 text-xs px-3 font-mono outline-none">
                  {Object.entries(assetLabel).map(([asset, label]) => <option key={asset} value={asset}>{label}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => setFromAmount(activeUser.balances[fromAsset].toString())} className="text-[11px] text-emerald-400 mt-1">
                موجودی: {activeUser.balances[fromAsset].toLocaleString()} {fromAsset}
              </button>
            </div>

            <div className="flex justify-center -my-2">
              <button
                type="button"
                onClick={() => {
                  setFromAsset(toAsset);
                  setToAsset(fromAsset);
                }}
                className="bg-slate-800 border border-slate-700 hover:border-emerald-500 hover:text-emerald-400 p-2 rounded-full transition-all"
                title="جابه‌جایی مبدا و مقصد"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">دریافت</label>
              <div className="flex bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                <input value={toAmount} disabled placeholder="0.00" className="w-full bg-slate-800/60 px-3 py-2.5 outline-none font-mono text-slate-400 text-sm" />
                <select value={toAsset} onChange={(event) => setToAsset(event.target.value as Transaction['asset'])} className="bg-slate-700 text-slate-200 text-xs px-3 font-mono outline-none">
                  {Object.entries(assetLabel).map(([asset, label]) => <option key={asset} value={asset}>{label}</option>)}
                </select>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">کارمزد تبدیل: ۰.۱٪</div>
            </div>

            {message && (
              <div className={`border p-2.5 rounded-lg text-xs leading-relaxed ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10">
              <TrendingUp className="w-4 h-4" />
              ثبت تبدیل
            </button>
          </form>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-200 mb-4">قیمت‌های منتخب</h3>
          <div className="space-y-2">
            {tickers.map(ticker => (
              <div key={ticker.symbol} className="flex items-center justify-between bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <span className="font-bold text-slate-200">{ticker.faName}</span>
                <span className="font-mono text-slate-400">{ticker.priceIRT.toLocaleString()} تومان</span>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
