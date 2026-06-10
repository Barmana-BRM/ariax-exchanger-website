import React, { useState, useEffect } from 'react';
import { User, Transaction, KYCDetails } from '../types';
import { 
  UserCheck, 
  FileText, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  UploadCloud, 
  AlertCircle, 
  Eye, 
  Fingerprint, 
  Search,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface KYCManagerProps {
  users: User[];
  activeUser: User;
  onUpdateUserKYC: (userId: string, status: User['kycStatus'], details?: KYCDetails) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp' | 'status'>) => void;
}

export default function KYCManager({
  users,
  activeUser,
  onUpdateUserKYC,
  onAddTransaction
}: KYCManagerProps) {
  // Input fields
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalCardPhoto, setNationalCardPhoto] = useState<File | null>(null);
  const [nationalCardPhotoPreview, setNationalCardPhotoPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Status logs and steps
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
  const [currentCheckStep, setCurrentCheckStep] = useState<number>(0);
  const [passedChecks, setPassedChecks] = useState<string[]>([]);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failed' | null>(null);
  const [verificationErrorMsg, setVerificationErrorMsg] = useState<string>('');

  // Simulating sample databases for testing matching
  const [showTesterHelp, setShowTesterHelp] = useState(true);

  // Synchronise input with current active user if they want a quick fill
  const handleQuickFill = () => {
    setFullName(activeUser.name);
    // Preset matching mocks
    if (activeUser.id === 'sahar') {
      setNationalId('0012345678');
      setPhone('09121111111');
    } else if (activeUser.id === 'saghar') {
      setNationalId('0087654321');
      setPhone('09122222222');
    } else if (activeUser.id === 'reza') {
      setNationalId('0091112223');
      setPhone('09123333333');
    } else if (activeUser.id === 'ali') {
      setNationalId('0077778888');
      setPhone('09124444444');
    }
  };

  const handleImageUpload = (file: File) => {
    if (file.type.startsWith('image/')) {
      setNationalCardPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNationalCardPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Mock checking pipeline logic asserting name & national ID & phone matching
  const runSmartKYCCheck = () => {
    if (!fullName || !nationalId || !phone) {
      alert('لطفاً تمامی فیلدهای الزامی را پر کنید.');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setVerificationErrorMsg('');
    setVerificationLogs([]);
    setCurrentCheckStep(0);
    setPassedChecks([]);

    const steps = [
      'بررسی ساختاری کدملی و قالب شماره تماس همراه...',
      'مکاتبه پروتکل امن با ثبت احوال کشور بابت تطابق نام با کدملی...',
      'استعلام همزمان سامانه "شاهکار" بابت تطابق کدملی با مالکیت خط همراه...',
      'پردازش کامپیوتری فایل پیوست کارت ملی (بینایی ماشین OCR)...',
      'تایید نهایی امضای دیجیتال و وضعیت ریسک مالی...'
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setVerificationLogs(prev => [...prev, `${steps[current]}`]);
        setCurrentCheckStep(current + 1);
        current++;
      } else {
        clearInterval(interval);
        performFinalMatchingDecision();
      }
    }, 1200);
  };

  const performFinalMatchingDecision = () => {
    // 1. Check National Code validity (10 digits check)
    if (nationalId.length !== 10 || isNaN(Number(nationalId))) {
      setVerificationResult('failed');
      setVerificationErrorMsg('کد ملی نامعتبر است! باید دقیقاً ۱۰ رقم عددی باشد.');
      setIsVerifying(false);
      return;
    }

    // 2. Check phone number format (11 digits, starts with 09)
    if (!/^09\d{9}$/.test(phone)) {
      setVerificationResult('failed');
      setVerificationErrorMsg('شماره تلفن همراه نامعتبر است! باید با ۰۹ شروع شده و شامل ۱۱ رقم باشد.');
      setIsVerifying(false);
      return;
    }

    // 3. Document attachment check
    if (!nationalCardPhotoPreview) {
      setVerificationResult('failed');
      setVerificationErrorMsg('آپلود تصویر یا سند کارت ملی جهت ثبت در پروند الزامی است.');
      setIsVerifying(false);
      return;
    }

    // 4. Matches name, code, phone to the SAME PERSON (Crucial Requirement!)
    // To prove that "کارت ملی و کدملی و شماره تماس به اسم یک نفر باشد"
    // Let's assert a mock registry check database inside our system.
    const mockNationalRegister = [
      { name: 'سحر عباسی', nationalId: '0012345678', phone: '09121111111' },
      { name: 'ساغر عباسی', nationalId: '0087654321', phone: '09122222222' },
      { name: 'رضا علوی', nationalId: '0091112223', phone: '09123333333' },
      { name: 'علی کریمی', nationalId: '0077778888', phone: '09124444444' }
    ];

    // Find if there is any citizen in register holding this exact configuration
    // To make it flexible, we can search if the input name is matched but phone or code belongs to another person.
    const normalizedInputName = fullName.trim();
    
    // Check match
    const perfectMatch = mockNationalRegister.find(citizen => 
      citizen.nationalId === nationalId && 
      citizen.phone === phone && 
      (citizen.name === normalizedInputName || normalizedInputName.includes(citizen.name) || citizen.name.includes(normalizedInputName))
    );

    if (perfectMatch) {
      // SUCCESS! Every credential belongs to the SAME person (e.g. Sahar, Saghar, Reza, Ali)
      setVerificationResult('success');
      onUpdateUserKYC(activeUser.id, 'verified', {
        fullName: normalizedInputName,
        nationalId,
        phone,
        documentUrl: nationalCardPhotoPreview,
        timestamp: new Date().toLocaleString('fa-IR')
      });
      
      onAddTransaction({
        userId: activeUser.id,
        userName: activeUser.name,
        type: 'trade',
        asset: 'IRT',
        amount: 0,
        fee: 0,
        destination: `تغییر وضعیت احراز هویت به "تایید شده" پس از انطباق سامانه شاهکار و ثبت احوال`
      });

    } else {
      // MISMATCH detected!
      setVerificationResult('failed');
      
      // Let's pinpoint where the mismatch happened to demonstrate the live check:
      const idMatch = mockNationalRegister.find(c => c.nationalId === nationalId);
      const phoneMatch = mockNationalRegister.find(c => c.phone === phone);

      if (idMatch && idMatch.name !== normalizedInputName) {
        setVerificationErrorMsg(`⚠️ عدم انطباق کدملی با ثبت احوال: شماره ملی ${nationalId} متعلق به "${idMatch.name}" می‌باشد، اما نام وارد شده "${normalizedInputName}" است.`);
      } else if (phoneMatch && phoneMatch.nationalId !== nationalId) {
        setVerificationErrorMsg(`⚠️ عدم انطباق سامانه شاهکار: کدملی وارد شده (${nationalId}) مالک خط تلفن همراه ${phone} نیست. این خط تحت کدملی دیگری به ثبت رسیده است.`);
      } else if (idMatch && phoneMatch && idMatch.nationalId !== phoneMatch.nationalId) {
        setVerificationErrorMsg(`⚠️ پرونده مغایرتی چندگانه: مالک خط همراه (${phoneMatch.name}) با مالک کدملی (${idMatch.name}) تفاوت هویتی دارد. اطلاعات مربوط به یک شخص واحد نیست!`);
      } else {
        setVerificationErrorMsg('🚫 عدم احراز هویت یکپارچه: جزئیات کدملی ثبت شده، اطلاعات سیم‌کارت و شناسنامه متعلق به یک شخص هماهنگ نمی‌باشند. لطفاً یکی از اطلاعات دقیق همکاران در راهنما را وارد کنید تا انطباق تایید شود.');
      }

      onUpdateUserKYC(activeUser.id, 'rejected', {
        fullName: normalizedInputName,
        nationalId,
        phone,
        rejectionReason: 'عدم انطباق هویتی شاهکار و ثبت‌احوال'
      });
    }

    setIsVerifying(false);
  };

  const handleResetKyc = () => {
    onUpdateUserKYC(activeUser.id, 'unverified');
    setFullName('');
    setNationalId('');
    setPhone('');
    setNationalCardPhoto(null);
    setNationalCardPhotoPreview(null);
    setVerificationResult(null);
    setVerificationErrorMsg('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" style={{ direction: 'rtl' }} id="kyc-section">
      <div className="flex flex-col lg:flex-row items-stretch gap-6">
        
        {/* Left Part: KYC status and Form */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl">
              <Fingerprint className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">دروازه احراز هویت یکپارچه کدملی، کارت ملی و شاهکار</h3>
              <p className="text-xs text-slate-400 mt-1">تطابق برخط شماره همراه، اطلاعات ثبت‌احوال و کارت شناسایی با مالک واحد</p>
            </div>
          </div>

          {/* Render Active User Verification Status banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">اپراتور تحت بررسی</span>
                <span className="text-xs font-bold text-slate-200">{activeUser.name}</span>
              </div>
              <div className="text-left font-mono text-[10px] text-slate-400">
                موقعیت: {activeUser.role}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">وضعیت احراز هویت فعلی</span>
                <span className="text-xs font-bold mt-1 block">
                  {activeUser.kycStatus === 'verified' && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> تایید شده تیمی
                    </span>
                  )}
                  {activeUser.kycStatus === 'pending' && (
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin" /> در حال بررسی
                    </span>
                  )}
                  {activeUser.kycStatus === 'rejected' && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> رد شده (مغایرت اطلاعات)
                    </span>
                  )}
                  {activeUser.kycStatus === 'unverified' && (
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> فاقد پرونده هویتی
                    </span>
                  )}
                </span>
              </div>
              {activeUser.kycStatus !== 'unverified' && (
                <button
                  onClick={handleResetKyc}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded"
                >
                  حذف پرونده برای تست مجدد
                </button>
              )}
            </div>
          </div>

          {/* Form logic */}
          {activeUser.kycStatus === 'verified' ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-xl space-y-4">
              <div className="flex items-start gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">حساب کاربری با موفقیت تایید و احراز هویت گردید!</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    این کاربر مدارک هویتی خود را ثبت کرده و مطابق برگه استعلام با سیستم هویتی کشور فدرال انطباق هویتی دارد.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/80 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block">نام دارنده حساب:</span>
                  <strong className="text-slate-200 mt-0.5 block">{activeUser.kycDetails?.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">کد ملی ثبت شده:</span>
                  <strong className="text-slate-200 mt-0.5 block font-mono">{activeUser.kycDetails?.nationalId}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">شماره سیم کارت همراه تایید شده:</span>
                  <strong className="text-slate-200 mt-0.5 block font-mono">{activeUser.kycDetails?.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">تاریخ تایید و امضای سیستم:</span>
                  <strong className="text-emerald-400 mt-0.5 block font-mono">{activeUser.kycDetails?.timestamp}</strong>
                </div>
              </div>

              {activeUser.kycDetails?.documentUrl && (
                <div className="pt-2">
                  <span className="text-slate-400 text-xs block mb-2">تصویر سند بارگذاری شده کارت ملی:</span>
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 max-w-xs bg-slate-950">
                    <img src={activeUser.kycDetails.documentUrl} alt="National Card" className="max-h-36 mx-auto object-contain opacity-80 hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-indigo-950/20 p-3 rounded-lg border border-indigo-900/30">
                <span className="text-xs text-slate-300 font-medium">فرم ثبت اطلاعات و آپلود تصاویر مدارک هویتی:</span>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] text-emerald-400 hover:underline font-semibold"
                >
                  📥 پر کردن خودکار اطلاعات صحیح {activeUser.name} جهت تست
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-2 font-medium">نام و نام خانوادگی کامل:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلا: سحر عباسی"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none text-xs focus:border-emerald-500"
                    id="kyc-fullname-input"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">باید با نام ثبت‌احوال کدملی همخوانی داشته باشد.</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2 font-medium">شماره کدملی ۱۰ رقمی:</label>
                  <input
                    type="text"
                    maxLength={10}
                    required
                    placeholder="مثلا: 0012345678"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none font-mono text-xs focus:border-emerald-500"
                    id="kyc-national-input"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">بدون خط تیره - متعلق به متقاضی.</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-2 font-medium">شماره تماس (سیم کارت همراه):</label>
                  <input
                    type="text"
                    maxLength={11}
                    required
                    placeholder="مثلا: 09121111111"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 outline-none font-mono text-xs focus:border-emerald-500"
                    id="kyc-phone-input"
                  />
                  <span className="text-[10px] text-amber-500 mt-1 block font-medium">⚠️ استعلام شاهکار: سیم کارت حتما باید به اسم کدملی بالا باشد.</span>
                </div>
              </div>

              {/* National Identity card upload area */}
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-medium">آپلود اسکن کارت ملی هوشمند یا شناسنامه:</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    dragOver ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-755 hover:border-slate-500 bg-slate-950/40'
                  }`}
                  onClick={() => document.getElementById('kyc-file-picker')?.click()}
                >
                  <input
                    type="file"
                    id="kyc-file-picker"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files && e.target.files[0] && handleImageUpload(e.target.files[0])}
                  />

                  {nationalCardPhotoPreview ? (
                    <div className="space-y-2">
                      <div className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> فایل سند با موفقیت پیوست گردید
                      </div>
                      <img src={nationalCardPhotoPreview} alt="Card preview" className="max-h-28 mx-auto rounded object-cover border border-slate-800" />
                      <span className="text-[10px] text-slate-500 block">فرمت تصویر سازگار • جهت تعویض کلیک کنید</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadCloud className="w-10 h-10 text-slate-500 mx-auto" />
                      <p className="text-xs text-slate-300 font-medium">تصویر کارت ملی را به اینجا بکشید یا برای انتخاب کلیک کنید</p>
                      <span className="text-[10px] text-slate-500 block">پشتیبانی از پسوندهای JPG, PNG, WEBP (حداکثر ۵ مگابایت)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {isVerifying ? (
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-sans">
                      <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                      سیستم هوشمند تطبیق یکپارچه هویتی در حال استعلام‌گیری است...
                    </span>
                    <span className="font-mono text-emerald-400">{Math.round((currentCheckStep / 5) * 100)}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${(currentCheckStep / 5) * 100}%` }}
                    />
                  </div>
                  {/* Step status display logs */}
                  <div className="space-y-1 font-mono text-[10px] text-slate-400">
                    {verificationLogs.map((log, index) => (
                      <div key={index} className="flex items-center gap-1.5 text-emerald-300/90 leading-relaxed">
                        <span className="text-emerald-500">▶</span>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={runSmartKYCCheck}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                  id="start-kyc-btn"
                >
                  <Fingerprint className="w-4 h-4" />
                  بررسی انطباق مدارک و ثبت احراز هویت (Inquire State)
                </button>
              )}

              {/* Show errors or rejected state */}
              {verificationResult === 'failed' && (
                <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                    <XCircle className="w-4 h-4" /> عدم انطباق یکپارچه مدارک! به دلیل مغایرت هویت رد شد.
                  </div>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed mr-5">
                    {verificationErrorMsg}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Part: Quick testing help information */}
        {showTesterHelp && (
          <div className="w-full lg:w-80 bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  راهنمای تست تطابقِ کدملی و شاهکار
                </span>
                <button 
                  onClick={() => setShowTesterHelp(false)}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  بستن
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                طبق قوانین بانک مرکزی و پلیس فتا، جهت جلوگیری از فیشینگ و اجاره کارت، صرافی مأمور است سیستم پرداخت را بدین شکل استعلام و بررسی کند:
              </p>

              <div className="space-y-3 pt-1">
                {/* Rule list with indicators */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-805 text-[10px]">
                  <strong className="text-slate-300 block mb-1">کدملی ⇄ تصویر کارت ملی:</strong>
                  <span className="text-slate-400 leading-relaxed block">
                    سیستم OCR درگاه بررسی می‌کند نام بر روی کارت با نام دارنده کد ملی مطابقت داشته باشد.
                  </span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-805 text-[10px]">
                  <strong className="text-slate-300 block mb-1">کدملی ⇄ شماره سیم‌کارت:</strong>
                  <span className="text-slate-400 leading-relaxed block">
                    سامانه شاهکار عدم تعلق سیم‌کارت به کد ملی را رد کرده و تراکنش را باطل می‌سازد.
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 text-[10px] space-y-2">
                <span className="text-amber-400 block font-bold">📋 مشخصات دقیق همکاران جهت تست موفق:</span>
                <div className="space-y-1.5 font-mono text-[9px] text-slate-400">
                  <div><strong>سحر:</strong> کدملی: 0012345678 • همراه: 09121111111</div>
                  <div><strong>ساغر:</strong> کدملی: 0087654321 • همراه: 09122222222</div>
                  <div><strong>رضا:</strong> کدملی: 0091112223 • همراه: 09123333333</div>
                  <div><strong>علی:</strong> کدملی: 0077778888 • همراه: 09124444444</div>
                </div>
                <span className="text-[9px] text-emerald-400 block pt-1 leading-relaxed">
                  💡 تذکر: اگر مقادیر بالا را وارد کنید سیستم به درستی احراز می‌کند. در غیر این صورت پیغام دقیق مغایرت نمایش داده می‌شود.
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-900 text-[10px] text-slate-500 leading-relaxed">
              ساکنین صرافی می‌توانند بابت صحت‌سنجی اطلاعات هر زمان نیاز بود پنل را بررسی کنند. تایید مدارک صرافی به صورت آنی در تراز و امضا اعمال می‌شود.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
