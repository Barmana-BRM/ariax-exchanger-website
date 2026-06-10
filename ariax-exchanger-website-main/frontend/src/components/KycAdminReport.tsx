import { useEffect, useMemo, useState } from "react";
import type { KycReportRow } from "../types";
import { kycApi } from "../services/kycApi";

const STATUS_LABEL: Record<string, string> = {
  draft: "پیش‌نویس",
  pending_review: "در انتظار بررسی",
  approved: "تأیید شده",
  rejected: "رد شده",
  pending: "در انتظار",
};

const STEP_LABEL: Record<string, string> = {
  approved: "تأیید",
  rejected: "رد",
  pending: "در انتظار",
};

const STEP_NAMES = ["اطلاعات پایه", "سلفی زنده", "تکمیلی"];

function tone(status: string) {
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "pending_review":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    default:
      return "bg-slate-700/50 text-slate-400 border-slate-600/50";
  }
}

export default function KycAdminReport() {
  const [rows, setRows] = useState<KycReportRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<"all" | KycReportRow["overallStatus"]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const data = await kycApi.getReport();
      setRows(data.rows);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "بارگذاری گزارش ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((row) => row.overallStatus === filter)),
    [rows, filter]
  );

  async function reviewOverall(id: number, overallStatus: "approved" | "rejected") {
    setBusyKey(`all-${id}`);
    setError("");
    try {
      await kycApi.review(id, {
        overallStatus,
        rejectionReason: overallStatus === "rejected" ? reasons[id] || "مدارک ناقص" : undefined,
      });
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "بررسی پرونده ناموفق بود");
    } finally {
      setBusyKey(null);
    }
  }

  async function reviewStep(id: number, step: 1 | 2 | 3, status: "approved" | "rejected") {
    setBusyKey(`${id}-${step}-${status}`);
    setError("");
    try {
      await kycApi.reviewStep(id, {
        step,
        status,
        rejectionReason: status === "rejected" ? reasons[id] || `مرحله ${step} رد شد` : undefined,
      });
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "بررسی مرحله ناموفق بود");
    } finally {
      setBusyKey(null);
    }
  }

  const summaryCards = [
    { id: "draft", label: "پیش‌نویس", color: "text-slate-300" },
    { id: "pending_review", label: "در انتظار بررسی", color: "text-amber-400" },
    { id: "approved", label: "تأیید شده", color: "text-emerald-400" },
    { id: "rejected", label: "رد شده", color: "text-red-400" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">گزارش مراحل KYC</h3>
          <p className="text-[11px] text-slate-500 mt-1">هر مرحله را جداگانه تأیید یا رد کنید</p>
        </div>
        <button
          type="button"
          onClick={() => void loadReport()}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
        >
          بروزرسانی
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setFilter(card.id as typeof filter)}
            className={`rounded-xl border p-3 text-right transition-colors ${
              filter === card.id ? "border-emerald-500/40 bg-emerald-500/5" : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
            }`}
          >
            <div className="text-[11px] text-slate-500">{card.label}</div>
            <div className={`text-xl font-bold mt-1 ${card.color}`}>{summary[card.id] ?? 0}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="همه" />
        {summaryCards.map((card) => (
          <span key={card.id}>
            <FilterChip
              active={filter === card.id}
              onClick={() => setFilter(card.id as typeof filter)}
              label={card.label}
            />
          </span>
        ))}
      </div>

      {loading && <div className="text-xs text-slate-400">در حال بارگذاری گزارش...</div>}
      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>}

      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
          موردی برای نمایش وجود ندارد
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/80 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-right">نام</th>
                <th className="px-3 py-2 text-right">کد ملی</th>
                <th className="px-3 py-2 text-right">مرحله جاری</th>
                <th className="px-3 py-2 text-right min-w-[320px]">بررسی مراحل</th>
                <th className="px-3 py-2 text-right">امتیاز چهره</th>
                <th className="px-3 py-2 text-right">وضعیت کلی</th>
                <th className="px-3 py-2 text-right">تأیید نهایی</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const steps: Array<{ num: 1 | 2 | 3; status: KycReportRow["step1Status"] }> = [
                  { num: 1, status: row.step1Status },
                  { num: 2, status: row.step2Status },
                  { num: 3, status: row.step3Status },
                ];
                return (
                  <tr key={row.id} className="border-t border-slate-800/80 hover:bg-slate-800/30 align-top">
                    <td className="px-3 py-2 text-slate-200">{row.fullName}</td>
                    <td className="px-3 py-2 text-slate-400 font-mono" dir="ltr">{row.nationalId}</td>
                    <td className="px-3 py-2 text-slate-400">{row.currentStep}/3</td>
                    <td className="px-3 py-2">
                      <div className="space-y-2">
                        {steps.map(({ num, status }) => (
                          <div key={num} className="rounded-lg border border-slate-800 bg-slate-900/40 p-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] text-slate-500">مرحله {num}: {STEP_NAMES[num - 1]}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] ${tone(status)}`}>
                                {STEP_LABEL[status] ?? status}
                              </span>
                            </div>
                            {status === "pending" && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() => void reviewStep(row.id, num, "approved")}
                                  className="flex-1 rounded bg-emerald-500/10 border border-emerald-500/20 py-1 text-[10px] text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                                >
                                  تأیید
                                </button>
                                <button
                                  type="button"
                                  disabled={busyKey !== null}
                                  onClick={() => void reviewStep(row.id, num, "rejected")}
                                  className="flex-1 rounded bg-red-500/10 border border-red-500/20 py-1 text-[10px] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                >
                                  رد
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{row.faceMatchScore ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded border ${tone(row.overallStatus)}`}>
                        {STATUS_LABEL[row.overallStatus] ?? row.overallStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 min-w-[160px]">
                      {row.overallStatus !== "approved" && row.overallStatus !== "rejected" ? (
                        <div className="space-y-1">
                          <input
                            className="w-full rounded border border-slate-700 bg-slate-900/60 px-2 py-1 text-[10px] text-slate-300 outline-none"
                            placeholder="دلیل رد"
                            value={reasons[row.id] ?? ""}
                            onChange={(event) => setReasons((prev) => ({ ...prev, [row.id]: event.target.value }))}
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void reviewOverall(row.id, "approved")}
                              className="flex-1 rounded bg-emerald-500/10 border border-emerald-500/20 py-1 text-emerald-400 hover:bg-emerald-500/20"
                            >
                              تأیید کل
                            </button>
                            <button
                              type="button"
                              disabled={busyKey !== null}
                              onClick={() => void reviewOverall(row.id, "rejected")}
                              className="flex-1 rounded bg-red-500/10 border border-red-500/20 py-1 text-red-400 hover:bg-red-500/20"
                            >
                              رد کل
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">{row.reviewedAt ?? row.submittedAt ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] border transition-colors ${
        active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 text-slate-400 hover:border-slate-600"
      }`}
    >
      {label}
    </button>
  );
}
