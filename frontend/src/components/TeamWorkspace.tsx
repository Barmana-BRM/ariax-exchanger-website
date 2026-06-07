import React, { useState } from 'react';
import { User, Transaction, TeamTask, TeamMessage } from '../types';
import { 
  Users, 
  MessageSquare, 
  CheckSquare, 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  TrendingUp, 
  ShieldCheck, 
  UserPlus, 
  Briefcase,
  Layers,
  Send
} from 'lucide-react';

interface TeamWorkspaceProps {
  users: User[];
  activeUser: User;
  onSelectUser: (user: User) => void;
  transactions: Transaction[];
  tasks: TeamTask[];
  onAddTask: (task: Omit<TeamTask, 'id' | 'createdAt'>) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TeamTask['status']) => void;
  onDeleteTask: (taskId: string) => void;
  messages: TeamMessage[];
  onAddMessage: (senderId: string, senderName: string, text: string) => void;
  btcPriceIRT: number;
  ethPriceIRT: number;
  usdtPriceIRT: number;
  trxPriceIRT: number;
}

export default function TeamWorkspace({
  users,
  activeUser,
  onSelectUser,
  transactions,
  tasks,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  messages,
  onAddMessage,
  btcPriceIRT,
  ethPriceIRT,
  usdtPriceIRT,
  trxPriceIRT
}: TeamWorkspaceProps) {
  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState<string>(users[0]?.id || '');
  const [taskCategory, setTaskCategory] = useState<TeamTask['category']>('support');

  // New message state
  const [newMessageText, setNewMessageText] = useState('');

  // Transactions table filters
  const [txFilterType, setTxFilterType] = useState<'all' | 'deposit' | 'withdraw' | 'trade'>('all');
  const [txFilterUser, setTxFilterUser] = useState<string>('all');

  // Calculate Aggregated Reserves (Total Team Treasury value in Tomans)
  const calculateTotalReserves = () => {
    let grandTotal = 0;
    users.forEach(u => {
      grandTotal += u.balances.IRT;
      grandTotal += u.balances.USDT * usdtPriceIRT;
      grandTotal += u.balances.BTC * btcPriceIRT;
      grandTotal += u.balances.ETH * ethPriceIRT;
      grandTotal += u.balances.TRX * trxPriceIRT;
    });
    return Math.round(grandTotal);
  };

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      assignedTo: taskAssignee,
      status: 'todo',
      category: taskCategory,
    });
    setTaskTitle('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    onAddMessage(activeUser.id, activeUser.name, newMessageText.trim());
    setNewMessageText('');
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      const matchType = txFilterType === 'all' || t.type === txFilterType;
      const matchUser = txFilterUser === 'all' || t.userId === txFilterUser;
      return matchType && matchUser;
    });
  };

  // Helper colors for task categories
  const getCategoryLabel = (cat: TeamTask['category']) => {
    const labels: Record<TeamTask['category'], { title: string; classes: string }> = {
      wallet: { title: 'کیف‌پول و تسویه', classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
      support: { title: 'پشتیبانی', classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
      technical: { title: 'امنیت و توسعه', classes: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
      liquidity: { title: 'تأمین نقدینگی', classes: 'bg-amber-500/10 text-amber-500 border border-amber-500/20' },
    };
    return labels[cat] || { title: 'نامشخص', classes: 'bg-slate-500/10 text-slate-400 border border-slate-700' };
  };

  return (
    <div className="space-y-6" id="teamwork-section">
      
      {/* SECTION HEADER: TOTAL RESERVES & PARTNERS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Treasury Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl border border-indigo-900/40 relative overflow-hidden flex flex-col justify-between" style={{ direction: 'rtl' }}>
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
          <div>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">صندوق ذخیره ارزی تیمی (AriaEx Pool)</span>
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black font-mono text-slate-100 tracking-tight">
              {calculateTotalReserves().toLocaleString()} <span className="text-xs font-sans font-normal text-indigo-300">تومان</span>
            </h2>
            <p className="text-[11px] text-indigo-300/80 mt-1.5 leading-relaxed">
              محاسبه لحظه‌ای ذخایر انباشته ریالی + دلاری و رمزارزی هر ۴ شریک تجاری بر اساس نرخ کارگزاری
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 border-t border-slate-800/80 pt-4 mt-6 text-center font-mono text-xs">
            <div className="bg-indigo-900/20 p-2 rounded-lg border border-indigo-900/30">
              <span className="text-[10px] text-slate-400 block font-sans">تتر تیمی</span>
              <span className="text-slate-200 font-bold">{users.reduce((acc, u) => acc + u.balances.USDT, 0).toLocaleString()} <span className="text-[9px] font-sans">₮</span></span>
            </div>
            <div className="bg-indigo-900/20 p-2 rounded-lg border border-indigo-900/30">
              <span className="text-[10px] text-slate-400 block font-sans">ریال تیمی</span>
              <span className="text-emerald-400 font-bold">{(users.reduce((acc, u) => acc + u.balances.IRT, 0)/1000000).toFixed(1)}M</span>
            </div>
            <div className="bg-indigo-900/20 p-2 rounded-lg border border-indigo-900/30">
              <span className="text-[10px] text-slate-400 block font-sans">ترون تیمی</span>
              <span className="text-slate-200 font-bold">{users.reduce((acc, u) => acc + u.balances.TRX, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Partners Account Quick Switch / Role Summary */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800" style={{ direction: 'rtl' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                تیم کارگاهی صرافی (۴ نفره ما)
              </h3>
              <p className="text-xs text-slate-400 mt-1">با کلیک روی کارت هر عضو، به حساب او سوییچ کنید تا واریز/برداشت و معامله ثبت کند:</p>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">Team Mode ACTIVE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {users.map((u) => {
              const isActive = u.id === activeUser.id;
              const assetTotalValue = u.balances.IRT + (u.balances.USDT * usdtPriceIRT) + (u.balances.BTC * btcPriceIRT) + (u.balances.ETH * ethPriceIRT) + (u.balances.TRX * trxPriceIRT);
              
              return (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u)}
                  className={`text-right p-4 rounded-xl border transition-all ${
                    isActive 
                      ? 'bg-slate-800/80 border-emerald-500 shadow-md shadow-emerald-500/5' 
                      : 'bg-slate-950/60 border-slate-850 hover:border-slate-700'
                  }`}
                  id={`user-selector-btn-${u.id}`}
                >
                  {/* Name banner */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${u.avatarColor}`} />
                    <span className="text-xs font-bold text-slate-100">{u.name}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 line-clamp-1 mb-2 font-medium">
                    {u.role}
                  </div>

                  <div className="border-t border-slate-800/80 pt-2 text-left">
                    <div className="text-[10px] text-slate-500 block font-sans">تراز تخمینی کل</div>
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {Math.round(assetTotalValue).toLocaleString()} ت
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* MID LAYER: SHARED TEAM CHAT vs TASKBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Collaborative Task Board (7 columns) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between" style={{ direction: 'rtl' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                بورد تسک‌ها و کنترل وظایف صرافی
              </h3>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                {tasks.filter(t => t.status !== 'done').length} تسک مانده
              </span>
            </div>

            {/* Quick Task Creation mini inline form */}
            <form onSubmit={handleTaskSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="md:col-span-6">
                <input
                  type="text"
                  required
                  placeholder="عنوان تسک تیمی جدید..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 outline-none px-3.5 py-1.5 rounded-md text-xs"
                  id="task-title-input"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 outline-none px-2 py-1.5 rounded-md text-xs cursor-pointer"
                  id="task-assignee-select"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 outline-none px-2 py-1.5 rounded-md text-xs cursor-pointer"
                  id="task-cat-select"
                >
                  <option value="support">پشتیبانی</option>
                  <option value="wallet">ولتها / مالی</option>
                  <option value="technical">توسعه/امنیت</option>
                  <option value="liquidity">نقدینگی</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <button
                  type="submit"
                  className="w-full h-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center rounded-md p-1.5 transition-colors"
                  id="add-task-btn"
                  title="افزودن تسک"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Task Checklist Lists */}
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  هیچ تسک ثبت‌شده‌ای در تخته کارگاه وجود ندارد.
                </div>
              ) : (
                tasks.map((task) => {
                  const assignedUser = users.find(u => u.id === task.assignedTo);
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`p-3 rounded-lg flex items-center justify-between border transition-colors ${
                        task.status === 'done' 
                          ? 'bg-slate-950/20 border-slate-900 opacity-60' 
                          : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Status Toggle Circle Checkboxes */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextState: Record<TeamTask['status'], TeamTask['status']> = {
                              'todo': 'in_progress',
                              'in_progress': 'done',
                              'done': 'todo'
                            };
                            onUpdateTaskStatus(task.id, nextState[task.status]);
                          }}
                          className="text-slate-400 hover:text-emerald-400 transition-all"
                          id={`toggle-task-${task.id}`}
                        >
                          {task.status === 'todo' && <Circle className="w-5 h-5" />}
                          {task.status === 'in_progress' && <PlayCircle className="w-5 h-5 text-indigo-400" />}
                          {task.status === 'done' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        </button>

                        <div>
                          <span className={`text-xs font-medium block ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {task.title}
                          </span>
                          
                          {/* Foot labels */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${getCategoryLabel(task.category).classes}`}>
                              {getCategoryLabel(task.category).title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans">
                              واگذار شده به: <strong className="text-slate-400 font-normal">{assignedUser?.name || 'کلیت صرافی'}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right actions: Delete Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                        id={`delete-task-${task.id}`}
                        title="حذف تسک"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mt-4 leading-relaxed bg-slate-950 p-2 rounded-lg font-sans border border-slate-800">
            💡 <strong>دستورالعمل تیمی:</strong> کلیک به روی آیکون دایره وضعیت هر تسک را به ترتیب تغییر می‌دهد: <span className="text-slate-400">ثبت اولیه (سفید)</span> ➔ <span className="text-indigo-400 font-semibold">درحال انجام (آبی)</span> ➔ <span className="text-emerald-400 font-semibold">تکمیل موفق (سبز)</span>.
          </p>
        </div>

        {/* Live Team Intercom Messenger (5 columns) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between h-[480px]">
          <div className="h-[92%] flex flex-col justify-between overflow-hidden">
            {/* Messenger Header */}
            <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-slate-800" style={{ direction: 'rtl' }}>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">بایگانی گفتگوهای کارگاهی</h3>
                <span className="text-[10px] text-slate-500 block">ارسال پیام از جانب: <strong className="text-emerald-400">{activeUser.name}</strong></span>
              </div>
            </div>

            {/* Chat message streams list */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin select-text">
              {messages.map((msg) => {
                const sender = users.find(u => u.id === msg.senderId);
                const isMe = msg.senderId === activeUser.id;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`} 
                    style={{ direction: isMe ? 'ltr' : 'rtl' }}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-bold">{sender?.name || msg.senderName}</span>
                      <span className="text-[9px] font-sans text-slate-500">({sender?.role})</span>
                    </div>

                    <div className={`p-2.5 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                      isMe 
                        ? 'bg-emerald-500 text-slate-950 font-medium rounded-tl-none' 
                        : 'bg-slate-800 text-slate-100 rounded-tr-none'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form write areas */}
          <form onSubmit={handleSendMessage} className="flex bg-slate-950 rounded-lg overflow-hidden border border-slate-700" style={{ direction: 'rtl' }}>
            <input
              type="text"
              required
              placeholder="نوشتن پیام تیمی جدید..."
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="w-full bg-transparent px-3 py-2 outline-none text-xs text-slate-100"
              id="chat-message-input"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 flex items-center justify-center transition-colors"
              id="send-chat-btn"
              title="ارسال پیام"
            >
              <Send className="w-3.5 h-3.5 fill-slate-950" />
            </button>
          </form>
        </div>

      </div>

      {/* FOOT LAYER: REAL-TIME AUDIT LEDGER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" style={{ direction: 'rtl' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              دفتر حسابگری کل تراکنش‌های صرافی (Audit Ledger)
            </h3>
            <p className="text-xs text-slate-400 mt-1">تراز مشترک کلیه واریز، برداشت و برآوردهای معامله و تسویه تیمی</p>
          </div>

          {/* Filters controls */}
          <div className="flex flex-wrap gap-2">
            <select
              value={txFilterType}
              onChange={(e) => setTxFilterType(e.target.value as any)}
              className="bg-slate-800 border border-slate-750 text-slate-300 px-3 py-1.5 rounded-lg text-xs cursor-pointer outline-none"
              id="filter-type"
            >
              <option value="all">همه تراکنش‌ها</option>
              <option value="deposit">سپرده / واریز</option>
              <option value="withdraw">برداشت / خروج</option>
              <option value="trade">سواپ / معامله</option>
            </select>

            <select
              value={txFilterUser}
              onChange={(e) => setTxFilterUser(e.target.value)}
              className="bg-slate-800 border border-slate-750 text-slate-300 px-3 py-1.5 rounded-lg text-xs cursor-pointer outline-none"
              id="filter-user"
            >
              <option value="all">کلیه کاربران تجاری</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">شناسه ردیف</th>
                <th className="py-3 px-4">ذینفع / شریک</th>
                <th className="py-3 px-4">نوع عملیات</th>
                <th className="py-3 px-4">میزان دارایی</th>
                <th className="py-3 px-4">کارمزد صرافی</th>
                <th className="py-3 px-4">جزئیات مقصد و تسویه حساب</th>
                <th className="py-3 px-4">زمان وقوع</th>
                <th className="py-3 px-4">وضعیت امنیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {getFilteredTransactions().length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                    تراکنشی متناسب با فیلتر انتخابی شما در دفتر کل ثبت نشده است.
                  </td>
                </tr>
              ) : (
                getFilteredTransactions().map((t) => {
                  let badgeTypeClass = '';
                  let badgeTypeText = '';
                  if (t.type === 'deposit') {
                    badgeTypeClass = 'bg-emerald-500/10 text-emerald-400';
                    badgeTypeText = 'واریز / سپرده';
                  } else if (t.type === 'withdraw') {
                    badgeTypeClass = 'bg-rose-500/10 text-rose-400';
                    badgeTypeText = 'خروج / برداشت';
                  } else {
                    badgeTypeClass = 'bg-sky-500/10 text-sky-400';
                    badgeTypeText = 'سواپ داخلی';
                  }

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 select-all">#{t.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-100">{t.userName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium ${badgeTypeClass}`}>
                          {badgeTypeText}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-100">
                        {t.amount.toLocaleString()} {t.asset === 'IRT' ? 'تومان' : t.asset}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {t.fee > 0 ? `${t.fee.toLocaleString()} ${t.asset === 'IRT' ? 'تومان' : t.asset}` : 'حداقل (۰)'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate" title={t.destination}>
                        {t.destination}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{t.timestamp}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-sans">تایید امضا شده</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
