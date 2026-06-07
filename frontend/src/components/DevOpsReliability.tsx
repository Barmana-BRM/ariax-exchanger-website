import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Cloud,
  Container,
  Cpu,
  DatabaseBackup,
  GitBranch,
  HardDrive,
  Network,
  RefreshCw,
  RotateCcw,
  Scale,
  Server,
  ShieldCheck,
  Workflow
} from 'lucide-react';

type ServiceStatus = 'healthy' | 'warning' | 'recovering';

interface RuntimeNode {
  name: string;
  zone: string;
  cpu: number;
  memory: number;
  pods: number;
  status: ServiceStatus;
}

const statusClasses: Record<ServiceStatus, string> = {
  healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  recovering: 'bg-sky-500/10 text-sky-400 border-sky-500/20'
};

const statusLabels: Record<ServiceStatus, string> = {
  healthy: 'پایدار',
  warning: 'نیازمند توجه',
  recovering: 'در حال بازیابی'
};

export default function DevOpsReliability() {
  const [traffic, setTraffic] = useState(64);
  const [desiredReplicas, setDesiredReplicas] = useState(6);
  const [lastRecoveryCheck, setLastRecoveryCheck] = useState('چند ثانیه پیش');

  useEffect(() => {
    const interval = setInterval(() => {
      setTraffic(prev => {
        const next = Math.max(38, Math.min(92, prev + Math.round(Math.random() * 10 - 5)));
        setDesiredReplicas(next > 78 ? 9 : next > 62 ? 7 : 5);
        return next;
      });
      setLastRecoveryCheck('همین الان');
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nodes = useMemo<RuntimeNode[]>(() => ([
    { name: 'ariaex-node-01', zone: 'tehran-a', cpu: Math.min(96, traffic + 9), memory: 72, pods: 18, status: traffic > 84 ? 'warning' : 'healthy' },
    { name: 'ariaex-node-02', zone: 'tehran-b', cpu: Math.max(32, traffic - 7), memory: 66, pods: 16, status: 'healthy' },
    { name: 'ariaex-node-03', zone: 'tehran-c', cpu: Math.max(28, traffic - 15), memory: 58, pods: 14, status: traffic > 82 ? 'recovering' : 'healthy' }
  ]), [traffic]);

  const services = [
    { name: 'exchange-web', replicas: desiredReplicas, icon: Cloud, latency: 38, status: 'healthy' as ServiceStatus },
    { name: 'wallet-api', replicas: 4, icon: Server, latency: 54, status: traffic > 84 ? 'warning' as ServiceStatus : 'healthy' as ServiceStatus },
    { name: 'kyc-worker', replicas: 3, icon: Workflow, latency: 72, status: 'healthy' as ServiceStatus },
    { name: 'market-stream', replicas: 5, icon: Activity, latency: 25, status: 'healthy' as ServiceStatus }
  ];

  const reliabilityMetrics = [
    { title: 'Uptime ماه جاری', value: '99.98%', helper: 'SLO هدف: 99.9%', icon: ShieldCheck, accent: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Load Balancer RPS', value: `${(traffic * 18).toLocaleString()}`, helper: 'تقسیم بار بین ۳ Zone', icon: Network, accent: 'text-sky-400', bg: 'bg-sky-500/10' },
    { title: 'Auto Scaling', value: `${desiredReplicas} Pod`, helper: 'بر اساس CPU و صف تراکنش', icon: Scale, accent: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'Recovery RTO', value: '4m 30s', helper: 'آخرین مانور بازیابی موفق', icon: RotateCcw, accent: 'text-indigo-400', bg: 'bg-indigo-500/10' }
  ];

  const playbooks = [
    { title: 'Failover خودکار دیتابیس', detail: 'Replica آماده در Zone پشتیبان با Health Probe فعال', step: '۱ کلیک' },
    { title: 'Rollback نسخه معیوب', detail: 'بازگشت به آخرین Image پایدار با استراتژی RollingUpdate', step: '< ۲ دقیقه' },
    { title: 'Disaster Recovery', detail: 'Backup رمزنگاری شده، Restore تست شده و Runbook عملیاتی', step: 'RPO ۵ دقیقه' },
    { title: 'Incident Command', detail: 'ثبت رخداد، مالک سرویس، Severity و مسیر Escalation', step: 'آماده' }
  ];

  return (
    <div className="space-y-6" id="devops-reliability-section" style={{ direction: 'rtl' }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden relative">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-sky-500/10 to-transparent pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-sky-500/10 p-3 rounded-xl border border-sky-500/20">
              <Container className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100">DevOps و پایداری زیرساخت</h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                مانیتورینگ Kubernetes، Load Balancer، Auto Scaling، Recovery و آمادگی عملیاتی صرافی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-slate-300 font-bold">Production Cluster Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {reliabilityMetrics.map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 font-bold">{metric.title}</span>
                <div className={`${metric.bg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${metric.accent}`} />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-100 tracking-tight">{metric.value}</div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{metric.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-sky-400" />
                Load Balancer و مسیر ترافیک
              </h3>
              <p className="text-xs text-slate-500 mt-1">ترافیک کاربران بین سرویس های اصلی و Zone های کلاستر پخش می شود</p>
            </div>
            <span className="text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-full px-2 py-1 font-mono">
              {traffic}% Traffic Pressure
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {nodes.map(node => (
              <div key={node.name} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{node.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{node.zone}</p>
                  </div>
                  <span className={`text-[9px] border rounded-full px-2 py-0.5 ${statusClasses[node.status]}`}>{statusLabels[node.status]}</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>CPU</span>
                      <span className="font-mono">{node.cpu}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${node.cpu > 84 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${node.cpu}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Memory</span>
                      <span className="font-mono">{node.memory}%</span>
                    </div>
                    <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${node.memory}%` }}></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500">Pods</span>
                    <span className="font-mono text-slate-200">{node.pods}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-100">سیاست Auto Scaling</span>
              </div>
              <span className="text-[10px] text-slate-500">min 3 / max 12 pods</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-500 block mb-1">Trigger CPU</span>
                <span className="font-mono font-bold text-slate-200">70%</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-500 block mb-1">Queue Depth</span>
                <span className="font-mono font-bold text-slate-200">1,200 events</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <span className="text-slate-500 block mb-1">Cooldown</span>
                <span className="font-mono font-bold text-slate-200">90s</span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Container className="w-4 h-4 text-emerald-400" />
              سرویس های Kubernetes
            </h3>
            <span className="text-[10px] text-slate-500">namespace: ariaex-prod</span>
          </div>

          <div className="space-y-3">
            {services.map(service => {
              const Icon = service.icon;
              return (
                <div key={service.name} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-800 p-2 rounded-lg">
                        <Icon className="w-4 h-4 text-slate-300" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 font-mono">{service.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">{service.replicas} replicas فعال</p>
                      </div>
                    </div>
                    <span className={`text-[9px] border rounded-full px-2 py-0.5 ${statusClasses[service.status]}`}>{statusLabels[service.status]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
                      <span className="text-slate-500">Latency</span>
                      <span className="font-mono text-slate-200 float-left">{service.latency}ms</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
                      <span className="text-slate-500">Readiness</span>
                      <span className="font-mono text-emerald-400 float-left">100%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <DatabaseBackup className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Recovery و Backup</h3>
          </div>

          <div className="space-y-3">
            {playbooks.map(playbook => (
              <div key={playbook.title} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{playbook.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{playbook.detail}</p>
                  </div>
                  <span className="text-[9px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                    {playbook.step}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-200">آخرین تست بازیابی</div>
              <div className="text-[10px] text-slate-500 mt-1">{lastRecoveryCheck} - Snapshot سالم و قابل Restore</div>
            </div>
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
          </div>
        </div>

        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              مسیر استقرار و کنترل رخداد
            </h3>
            <span className="text-[10px] text-slate-500">CI/CD: protected production</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { title: 'Build', desc: 'TypeScript + Vite', icon: Cpu, color: 'text-sky-400' },
              { title: 'Scan', desc: 'Secrets + Image scan', icon: ShieldCheck, color: 'text-emerald-400' },
              { title: 'Deploy', desc: 'Rolling update', icon: Container, color: 'text-amber-400' },
              { title: 'Observe', desc: 'Logs + SLO alert', icon: Activity, color: 'text-indigo-400' }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 relative">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`w-5 h-5 ${item.color}`} />
                    <span className="text-[10px] font-mono text-slate-600">0{index + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <div className="md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-100">Alert Rules</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">خطای 5xx بیشتر از ۱٪ در ۵ دقیقه</span>
                  <span className="text-amber-400">Severity 2</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">تاخیر Wallet API بیشتر از ۲۰۰ms</span>
                  <span className="text-sky-400">Severity 3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">عدم موفقیت Backup شبانه</span>
                  <span className="text-rose-400">Severity 1</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-100">Storage</span>
              </div>
              <div className="text-3xl font-black font-mono text-slate-100">68%</div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">ظرفیت Persistent Volume برای لاگ، صف رویداد و Snapshot دیتابیس</p>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
