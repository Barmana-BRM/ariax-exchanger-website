import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Copy, CreditCard, Info, QrCode, Wallet } from 'lucide-react';
import { Transaction, User } from '../types';

interface WalletActionsProps {
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

export default function WalletActions({ activeUser, onUpdateBalances, onAddTransaction }: WalletActionsProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [depAsset, setDepAsset] = useState<Transaction['asset']>('IRT');
  const [depAmount, setDepAmount] = useState('');
  const [depTxId, setDepTxId] = useState('');
  const [depCardSource, setDepCardSource] = useState('');
  const [depBankName, setDepBankName] = useState('');
  const [withAsset, setWithAsset] = useState<Transaction['asset']>('IRT');
  const [withAmount, setWithAmount] = useState('');
  const [withDestination, setWithDestination] = useState('');
  const [withCardOwner, setWithCardOwner] = useState('');
  const [withNetwork, setWithNetwork] = useState('TRC20');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getCryptoAddress = (asset: Transaction['asset']) => {
    if (asset === 'BTC') return activeUser.cryptoAddresses.BTC;
    if (asset === 'TRX') return activeUser.cryptoAddresses.TRX;
    return activeUser.cryptoAddresses.USDT;
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const getFee = (asset: Transaction['asset']) => {
    if (asset === 'IRT') return 5000;
    if (asset === 'USDT') return 1;
    if (asset === 'BTC') return 0.0003;
    if (asset === 'ETH') return 0.003;
    return 5;
  };

  const handleDepositSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const amount = Number(depAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'لطفا مبلغ معتبر وارد کنید.' });
      return;
    }

    if (depAsset === 'IRT') {
      if (depCardSource.length < 16) {
        setMessage({ type: 'error', text: 'شماره کارت مبدا باید ۱۶ رقمی باشد.' });
        return;
      }
      if (!depBankName.trim()) {
        setMessage({ type: 'error', text: 'نام بانک صادرکننده را وارد کنید.' });
        return;
      }
    } else if (depTxId.trim().length < 10) {
      setMessage({ type: 'error', text: 'هش تراکنش شبکه را وارد کنید.' });
      return;
    }

    const nextBalances = { ...activeUser.balances };
    nextBalances[depAsset] = Number((nextBalances[depAsset] + amount).toFixed(depAsset === 'BTC' || depAsset === 'ETH' ? 6 : 2));
    onUpdateBalances(activeUser.id, nextBalances);

    onAddTransaction({
      userId: activeUser.id,
      userName: activeUser.name,
      type: 'deposit',
      asset: depAsset,
      amount,
      fee: 0,
      destination: depAsset === 'IRT'
        ? `واریز از ${depBankName}، کارت ${depCardSource.substring(0, 4)}...${depCardSource.substring(12)}`
        : `واریز رمزارز، هش ${depTxId.substring(0, 8)}...`
    });

    setMessage({ type: 'success', text: 'واریز ثبت شد و موجودی شما به‌روزرسانی شد.' });
    setDepAmount('');
    setDepTxId('');
    setDepCardSource('');
    setDepBankName('');
  };

  const handleWithdrawSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const amount = Number(withAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'لطفا مبلغ برداشت معتبر وارد کنید.' });
      return;
    }

    if (amount > activeUser.balances[withAsset]) {
      setMessage({ type: 'error', text: 'موجودی کافی نیست.' });
      return;
    }

    if (withDestination.trim().length < 10) {
      setMessage({ type: 'error', text: withAsset === 'IRT' ? 'شماره کارت یا شبا را کامل وارد کنید.' : 'آدرس کیف پول مقصد را کامل وارد کنید.' });
      return;
    }

    if (withAsset === 'IRT' && !withCardOwner.trim()) {
      setMessage({ type: 'error', text: 'نام صاحب حساب مقصد را وارد کنید.' });
      return;
    }

    if (!agreeTerms) {
      setMessage({ type: 'error', text: 'تایید صحت اطلاعات مقصد الزامی است.' });
      return;
    }

    const fee = getFee(withAsset);
    const nextBalances = { ...activeUser.balances };
    nextBalances[withAsset] = Number((nextBalances[withAsset] - amount).toFixed(withAsset === 'BTC' || withAsset === 'ETH' ? 6 : 2));
    onUpdateBalances(activeUser.id, nextBalances);

    onAddTransaction({
      userId: activeUser.id,
      userName: activeUser.name,
      type: 'withdraw',
      asset: withAsset,
      amount,
      fee,
      destination: withAsset === 'IRT'
        ? `برداشت ریالی به نام ${withCardOwner}، مقصد ${withDestination.substring(0, 6)}...`
        : `برداشت رمزارز روی شبکه ${withNetwork}، مقصد ${withDestination.substring(0, 8)}...`
    });

    setMessage({ type: 'success', text: 'درخواست برداشت ثبت شد.' });
    setWithAmount('');
    setWithDestination('');
    setWithCardOwner('');
    setAgreeTerms(false);
  };

  const netPayout = () => {
    const amount = Number(withAmount);
    if (!amount || amount <= 0) return 0;
    return Math.max(0, amount - getFee(withAsset));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="wallet-actions-section" style={{ direction: 'rtl' }}>
      <aside className="xl:col-span-4 h-full">
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">کیف پول {activeUser.name}</h3>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              موجودی‌های حساب شما در این بخش نمایش داده می‌شود.
            </p>

            <div className="space-y-3">
              {(['IRT', 'USDT', 'BTC', 'ETH', 'TRX'] as Transaction['asset'][]).map(asset => (
                <div key={asset} className="bg-slate-800/50 hover:bg-slate-800/80 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">{assetLabel[asset]}</span>
                      <span className="text-xs font-bold text-slate-300">{asset}</span>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-sm font-bold text-slate-100">{activeUser.balances[asset].toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              شماره شبای شما:
              <span className="font-mono text-slate-300 tracking-wider text-xs block mt-1 select-all">{activeUser.shibaNo}</span>
            </p>
          </div>
        </section>
      </aside>

      <section className="xl:col-span-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-full flex flex-col">
          <div className="flex border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => {
                setActiveTab('deposit');
                setMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'deposit' ? 'border-emerald-500 text-emerald-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>واریز</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('withdraw');
                setMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'withdraw' ? 'border-rose-500 text-rose-400 bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>برداشت</span>
            </button>
          </div>

          <div className="p-6 flex-1">
            {activeTab === 'deposit' && (
              <form onSubmit={handleDepositSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">دارایی برای واریز</label>
                    <select value={depAsset} onChange={(event) => setDepAsset(event.target.value as Transaction['asset'])} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-mono text-sm">
                      {Object.entries(assetLabel).map(([asset, label]) => <option key={asset} value={asset}>{label} ({asset})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">مقدار</label>
                    <input type="number" step="any" value={depAmount} onChange={(event) => setDepAmount(event.target.value)} placeholder="ثبت مبلغ..." className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-mono text-sm" />
                  </div>
                </div>

                {depAsset === 'IRT' ? (
                  <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">شماره کارت مبدا</label>
                        <input maxLength={16} value={depCardSource} onChange={(event) => setDepCardSource(event.target.value.replace(/\D/g, ''))} placeholder={activeUser.cardNo} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none font-mono text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">نام بانک</label>
                        <input value={depBankName} onChange={(event) => setDepBankName(event.target.value)} placeholder="مثلا بانک ملی" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none text-xs" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-800 space-y-4">
                    <div className="flex flex-col md:flex-row gap-5 items-center">
                      <div className="flex-1 w-full space-y-3">
                        <span className="text-xs font-bold text-slate-300 block">آدرس واریز {depAsset}</span>
                        <div className="flex bg-slate-950 rounded-lg overflow-hidden border border-slate-700 max-w-lg">
                          <span className="flex-1 px-3 py-2 text-xs font-mono text-slate-300 overflow-x-auto whitespace-nowrap">{getCryptoAddress(depAsset)}</span>
                          <button type="button" onClick={() => copyText(getCryptoAddress(depAsset))} className="bg-slate-800 hover:bg-slate-700 px-3 flex items-center justify-center text-slate-400 hover:text-slate-100 border-r border-slate-700" title="کپی آدرس">
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-700 flex flex-col items-center justify-center w-24 h-24">
                        <QrCode className="w-12 h-12 text-slate-400" />
                        <span className="text-[9px] text-slate-500 font-sans mt-1">QR</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-800/80 pt-3">
                      <label className="block text-xs text-slate-400 mb-2 font-medium">هش تراکنش</label>
                      <input value={depTxId} onChange={(event) => setDepTxId(event.target.value)} placeholder="f7027b407a16..." className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none font-mono text-xs text-left" dir="ltr" />
                    </div>
                  </div>
                )}

                {message && <MessageBox message={message} />}

                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/15">
                  ثبت واریز
                </button>
              </form>
            )}

            {activeTab === 'withdraw' && (
              <form onSubmit={handleWithdrawSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">دارایی برای برداشت</label>
                    <select value={withAsset} onChange={(event) => setWithAsset(event.target.value as Transaction['asset'])} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-500 font-mono text-sm">
                      {Object.entries(assetLabel).map(([asset, label]) => <option key={asset} value={asset}>{label} ({asset})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">مقدار برداشت</label>
                    <input type="number" step="any" value={withAmount} onChange={(event) => setWithAmount(event.target.value)} placeholder="ثبت مبلغ..." className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-2.5 outline-none focus:border-rose-500 font-mono text-sm" />
                    <button type="button" onClick={() => setWithAmount(activeUser.balances[withAsset].toString())} className="text-[11px] text-rose-400 mt-1">
                      موجودی: {activeUser.balances[withAsset].toLocaleString()} {withAsset}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-800 space-y-4">
                  {withAsset === 'IRT' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">شماره کارت یا شبا مقصد</label>
                        <input value={withDestination} onChange={(event) => setWithDestination(event.target.value)} placeholder="IR54 0120 0000..." className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none font-mono text-xs" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">نام صاحب حساب</label>
                        <input value={withCardOwner} onChange={(event) => setWithCardOwner(event.target.value)} placeholder="نام دارنده حساب" className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none text-xs" />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">آدرس کیف پول مقصد</label>
                        <input value={withDestination} onChange={(event) => setWithDestination(event.target.value)} placeholder="TF9f9S49GHa..." className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 outline-none font-mono text-xs" dir="ltr" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">شبکه انتقال</label>
                        <select value={withNetwork} onChange={(event) => setWithNetwork(event.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none text-xs font-mono">
                          <option value="TRC20">TRC20</option>
                          <option value="ERC20">ERC20</option>
                          <option value="Segwit">Bitcoin Segwit</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-3 flex justify-between text-xs text-slate-300 font-mono">
                    <span>مبلغ دریافتی پس از کارمزد</span>
                    <span className="font-bold text-rose-400">{netPayout().toLocaleString()} {withAsset}</span>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed cursor-pointer select-none">
                  <input type="checkbox" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} className="mt-1 accent-rose-500 w-4 h-4 cursor-pointer" />
                  صحت اطلاعات مقصد و شبکه انتقال را تایید می‌کنم.
                </label>

                {message && <MessageBox message={message} />}

                <button type="submit" className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-rose-500/15">
                  ثبت برداشت
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MessageBox({ message }: { message: { type: 'success' | 'error'; text: string } }) {
  return (
    <div className={`border p-3 rounded-xl text-xs leading-relaxed ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
      {message.text}
    </div>
  );
}
