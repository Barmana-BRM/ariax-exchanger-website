import React, { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, WalletCards, Zap } from 'lucide-react';
import { User } from '../types';

export type AuthRole = 'admin' | 'user';

export interface AuthSession {
  role: AuthRole;
  userId: string;
  displayName: string;
}

interface AuthPageProps {
  users: User[];
  onLogin: (session: AuthSession) => void;
}

const adminAccount = {
  username: 'admin',
  password: 'admin123'
};

const normalAccount = {
  username: 'user',
  password: 'user123'
};

export default function AuthPage({ users, onLogin }: AuthPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const defaultUser = users[0];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedUsername = username.trim().toLowerCase();

    if (normalizedUsername === adminAccount.username && password === adminAccount.password) {
      onLogin({
        role: 'admin',
        userId: defaultUser?.id || '',
        displayName: 'ادمین سیستم'
      });
      return;
    }

    if (normalizedUsername === normalAccount.username && password === normalAccount.password && defaultUser) {
      onLogin({
        role: 'user',
        userId: defaultUser.id,
        displayName: defaultUser.name
      });
      return;
    }

    setError('نام کاربری یا رمز عبور درست نیست.');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4" style={{ direction: 'rtl' }}>
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-500 p-3 rounded-xl shadow-lg shadow-emerald-500/20">
                <Zap className="w-6 h-6 text-slate-950 fill-slate-950" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-100">ورود به آریا اکس</h1>
                <p className="text-xs text-slate-400 mt-1">دسترسی جداگانه ادمین و کاربر عادی</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-bold text-slate-100">حساب ادمین</div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono text-left" dir="ltr">admin / admin123</div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <WalletCards className="w-5 h-5 text-sky-400" />
                  <div>
                    <div className="text-sm font-bold text-slate-100">حساب کاربر عادی</div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono text-left" dir="ltr">user / user123</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-6 border-t border-slate-800 pt-5">
            ورود با حساب ادمین، بخش‌های مدیریتی را فعال می‌کند. ورود با حساب کاربر عادی، فقط اطلاعات همان کاربر را نمایش می‌دهد.
          </div>
        </section>

        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-black text-slate-100">احراز هویت</h2>
            <p className="text-xs text-slate-400 mt-1">اطلاعات حساب را وارد کنید.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-username" className="block text-xs font-bold text-slate-300 mb-2">نام کاربری</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <UserRound className="w-4 h-4 text-slate-500 mr-3" />
                <input
                  id="login-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full bg-transparent px-3 py-3 text-sm text-slate-100 outline-none text-left font-mono"
                  dir="ltr"
                  autoComplete="username"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-300 mb-2">رمز عبور</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500">
                <LockKeyhole className="w-4 h-4 text-slate-500 mr-3" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-transparent px-3 py-3 text-sm text-slate-100 outline-none text-left font-mono"
                  dir="ltr"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="px-3 text-slate-500 hover:text-slate-200"
                  title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl py-3 text-sm font-black transition-colors shadow-lg shadow-emerald-500/15"
            >
              ورود به سامانه
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
