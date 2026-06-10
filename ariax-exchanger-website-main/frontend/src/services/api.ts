// src/services/api.ts
// =================================================================
//  سرویس API — اتصال React به بک‌اند PHP/MySQL
// =================================================================

import { canonicalRole, type AppRole } from "../security/rbac";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/ariax-api";
export const API_BASE = BASE_URL;

export function apiNetworkError(err: unknown): Error {
  if (err instanceof TypeError && /fetch|network|failed/i.test(err.message)) {
    return new Error(
      "اتصال به سرور برقرار نشد. ابتدا بک‌اند را اجرا کنید (npm run api) یا XAMPP/Apache را روشن کنید."
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${BASE_URL}/${path.replace(/^\//, "")}`;
}

// ذخیره توکن در localStorage
function clearLegacyAuthStorage(): void {
  localStorage.removeItem("ariax_token");
  localStorage.removeItem("ariax_user");
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? 0));
  return Number.isFinite(n) ? n : 0;
}

const MARKET_META = {
  BTC: { name: "Bitcoin", faName: "بیت‌کوین" },
  ETH: { name: "Ethereum", faName: "اتریوم" },
  USDT: { name: "Tether", faName: "تتر" },
  TRX: { name: "Tron", faName: "ترون" },
} as const;

function buildMarketHistory(row: any) {
  const currentPrice = num(row.priceIRT ?? row.price_irt);
  const high24h = num(row.high24h ?? row.high_24h) || currentPrice;
  const low24h = num(row.low24h ?? row.low_24h) || currentPrice;
  const volume24h = num(row.volume24h ?? row.volume_24h);
  const points: number = 24;
  const base = low24h > 0 ? low24h : currentPrice;
  const span = Math.max(high24h - base, Math.max(currentPrice * 0.015, 1));
  const end = currentPrice > 0 ? currentPrice : high24h;
  const averageVolume = Math.max(Math.round(volume24h / points), 1);

  return Array.from({ length: points }, (_, index) => {
    const progress = points === 1 ? 1 : index / (points - 1);
    const wave = Math.sin(progress * Math.PI * 1.5) * span * 0.12;
    const price = Math.max(1, Math.round(base + (end - base) * progress + wave));
    return {
      time: `${String(index).padStart(2, "0")}:00`,
      price,
      volume: averageVolume,
    };
  });
}

export function mapMarketTicker(row: any) {
  const symbol = String(row.symbol ?? "").toUpperCase() as keyof typeof MARKET_META;
  const meta = MARKET_META[symbol] ?? { name: symbol || "Unknown", faName: symbol || "نامشخص" };
  const priceIRT = num(row.priceIRT ?? row.price_irt);
  const priceUSD = num(row.priceUSD ?? row.price_usd);
  const change24h = num(row.change24h ?? row.change_24h);
  const volume24h = num(row.volume24h ?? row.volume_24h);
  const high24h = num(row.high24h ?? row.high_24h) || priceIRT;
  const low24h = num(row.low24h ?? row.low_24h) || priceIRT;

  return {
    symbol,
    name: meta.name,
    faName: meta.faName,
    priceIRT,
    priceUSD,
    change24h,
    volume24h,
    high24h,
    low24h,
    history: buildMarketHistory({
      priceIRT,
      high24h,
      low24h,
      volume24h,
    }),
  };
}

export function normalizeUser(u: any) {
  const kycStatus = u.kycStatus ?? u.kyc_status ?? "unverified";
  const kycDetails = u.kycDetails ?? (u.full_name || u.national_id ? {
    fullName: u.full_name ?? u.name ?? "",
    nationalId: u.national_id ?? "",
    phone: u.phone ?? "",
    email: u.email ?? undefined,
    timestamp: u.submitted_at ?? u.created_at ?? "",
    rejectionReason: u.rejection_reason ?? undefined,
    nationalIdImage: u.national_id_image ?? undefined,
    selfieImage: u.selfie_image ?? undefined,
    supportingDocument: u.supporting_document ?? undefined,
    draftToken: u.draft_token ?? undefined,
    currentStep: u.current_step ?? undefined,
    step1Status: u.step1_status ?? undefined,
    step2Status: u.step2_status ?? undefined,
    step3Status: u.step3_status ?? undefined,
    overallStatus: u.overall_status ?? undefined,
    faceMatchScore: u.face_match_score ?? undefined,
    homeAddress: u.home_address ?? undefined,
  } : undefined);
  const normalizedKyc = kycDetails ? {
    ...kycDetails,
    nationalIdImage: kycDetails.nationalIdImage ? assetUrl(kycDetails.nationalIdImage) : undefined,
    selfieImage: kycDetails.selfieImage ? assetUrl(kycDetails.selfieImage) : undefined,
    supportingDocument: kycDetails.supportingDocument ? assetUrl(kycDetails.supportingDocument) : undefined,
  } : undefined;
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    password: u.password ?? "",
    role: canonicalRole(u.role),
    avatarColor: u.avatarColor ?? u.avatar_color ?? "#3b82f6",
    kycStatus,
    kycVerified: kycStatus === "verified",
    kycDetails: normalizedKyc,
    balances: u.balances ?? {
      IRT: num(u.balance_irt),
      BTC: num(u.balance_btc),
      ETH: num(u.balance_eth),
      USDT: num(u.balance_usdt),
      TRX: num(u.balance_trx),
    },
    cryptoAddresses: u.cryptoAddresses ?? {
      BTC: u.addr_btc ?? "",
      USDT: u.addr_usdt ?? "",
      TRX: u.addr_trx ?? "",
    },
    cardNo: u.cardNo ?? u.card_no ?? "",
    shibaNo: u.shibaNo ?? u.shiba_no ?? "",
  };
}

export function mapTransaction(row: any) {
  return {
    id: row.id,
    userId: row.userId ?? row.user_id,
    userName: row.userName ?? row.user_name,
    type: row.type,
    asset: row.asset,
    amount: num(row.amount),
    fee: num(row.fee),
    timestamp: row.timestamp ?? row.created_at ?? "",
    status: row.status,
    destination: row.destination ?? "",
    txId: row.txId ?? row.tx_id,
    homeAddress: row.homeAddress ?? row.home_address ?? "",
    postalCode: row.postalCode ?? row.postal_code ?? "",
    requiresExtended: !!(row.requiresExtended ?? row.requires_extended),
  };
}

export function mapMessage(row: any) {
  return {
    id: String(row.id),
    senderId: row.senderId ?? row.sender_id,
    senderName: row.senderName ?? row.sender_name,
    message: row.message,
    timestamp: row.timestamp ?? row.created_at ?? "",
  };
}

export function mapTask(row: any) {
  return {
    id: String(row.id),
    title: row.title,
    assignedTo: row.assignedTo ?? row.assigned_to,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at ?? "",
    category: row.category,
  };
}

export function mapTicket(row: any) {
  return {
    id: String(row.id),
    userId: row.userId ?? row.user_id,
    userName: row.userName ?? row.user_name,
    subject: row.subject,
    category: row.category,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at ?? "",
    updatedAt: row.updatedAt ?? row.updated_at ?? "",
  };
}

export function mapTicketMessage(row: any) {
  return {
    id: String(row.id),
    ticketId: String(row.ticketId ?? row.ticket_id),
    senderId: row.senderId ?? row.sender_id,
    senderName: row.senderName ?? row.sender_name,
    senderRole: row.senderRole ?? row.sender_role,
    message: row.message,
    timestamp: row.timestamp ?? row.created_at ?? "",
  };
}

export async function loadAppData(role: AppRole) {
  const [transactions, tickets] = await Promise.all([
    txApi.getAll(),
    ticketsApi.getAll(),
  ]);
  const users = role === "user" ? [] : await usersApi.getAll();
  return { transactions, tickets, users };
}

// درخواست پایه
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });
  } catch (err) {
    throw apiNetworkError(err);
  }

  if (res.status === 401 && !path.startsWith("auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        res = await fetch(`${BASE_URL}/${path}`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(options.headers ?? {}),
          },
          ...options,
        });
      } catch (err) {
        throw apiNetworkError(err);
      }
    }
  }

  const raw = (await res.text()).replace(/^\uFEFF/, "");
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      const snippet = raw.trim().slice(0, 200).replace(/\s+/g, " ");
      throw new Error(snippet || `خطای سرور: ${res.status}`);
    }
  }

  if (!res.ok) {
    throw new Error(data.error ?? `خطای سرور: ${res.status}`);
  }

  return data as T;
}

// =================================================================
//  AUTH
// =================================================================
export const authApi = {
  async login(username: string, password: string) {
    clearLegacyAuthStorage();
    const data = await request<{ user: any }>("auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    return normalizeUser(data.user);
  },

  async register(payload: {
    username: string;
    password: string;
    draftToken?: string;
    nationalId?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    homeAddress?: string;
    faceMatchScore?: number;
    nationalIdImage?: File;
    selfieImage?: File;
    supportingDocument?: File;
  }) {
    const form = new FormData();
    if (payload.draftToken) form.append("draftToken", payload.draftToken);
    if (payload.nationalId) form.append("nationalId", payload.nationalId);
    if (payload.phone) form.append("phone", payload.phone);
    if (payload.firstName) form.append("firstName", payload.firstName);
    if (payload.lastName) form.append("lastName", payload.lastName);
    if (payload.email?.trim()) form.append("email", payload.email.trim());
    form.append("username", payload.username);
    form.append("password", payload.password);
    if (payload.homeAddress) form.append("homeAddress", payload.homeAddress);
    if (typeof payload.faceMatchScore === "number") form.append("faceMatchScore", String(payload.faceMatchScore));
    if (payload.nationalIdImage) form.append("nationalIdImage", payload.nationalIdImage);
    if (payload.selfieImage) form.append("selfieImage", payload.selfieImage);
    if (payload.supportingDocument) form.append("supportingDocument", payload.supportingDocument);

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
    } catch (err) {
      throw apiNetworkError(err);
    }
    const raw = (await res.text()).replace(/^\uFEFF/, "");
    let data: any = {};
    if (raw) {
      try { data = JSON.parse(raw); } catch {
        throw new Error(raw.trim().slice(0, 200) || `خطای سرور: ${res.status}`);
      }
    }
    if (!res.ok) throw new Error(data.error ?? `خطای سرور: ${res.status}`);
    return data;
  },

  async logout() {
    try {
      await request("auth/logout", { method: "POST" });
    } finally {
      clearLegacyAuthStorage();
    }
  },

  async getCurrentUser() {
    try {
      const data = await request<{ user: any }>("users/me");
      return normalizeUser(data.user);
    } catch {
      clearLegacyAuthStorage();
      return null;
    }
  },
};

// =================================================================
//  USERS
// =================================================================
export const usersApi = {
  async getAll() {
    const data = await request<{ users: any[] }>("users");
    return data.users.map(normalizeUser);
  },

  async getMe() {
    const data = await request<{ user: any }>("users/me");
    return normalizeUser(data.user);
  },

  async updateProfile(payload: {
    cardNo?: string;
    shibaNo?: string;
    cryptoAddresses?: { BTC?: string; USDT?: string; TRX?: string };
  }) {
    return request("users/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updateKyc(userId: string, kycStatus: string, rejectionReason?: string) {
    return request(`users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ kycStatus, rejectionReason }),
    });
  },
};

// =================================================================
//  TRANSACTIONS
// =================================================================
export const txApi = {
  async getAll() {
    const data = await request<{ transactions: any[] }>("transactions");
    return data.transactions.map(mapTransaction);
  },

  async create(payload: {
    type: "deposit" | "withdraw" | "trade";
    asset: "IRT" | "BTC" | "ETH" | "USDT" | "TRX";
    amount: number;
    destination?: string;
    homeAddress?: string;
    postalCode?: string;
  }) {
    return request("transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async review(transactionId: string, payload: { status: "completed" | "rejected"; note?: string }) {
    return request<{ success: boolean; id: string; status: string }>(`transactions/${transactionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

// =================================================================
//  MESSAGES
// =================================================================
export const messagesApi = {
  async getAll() {
    const data = await request<{ messages: any[] }>("messages");
    return data.messages.map(mapMessage);
  },

  async send(message: string) {
    return request("messages", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
};

// =================================================================
//  TASKS
// =================================================================
export const tasksApi = {
  async getAll() {
    const data = await request<{ tasks: any[] }>("tasks");
    return data.tasks.map(mapTask);
  },

  async create(payload: {
    title: string;
    assignedTo?: string;
    category: "wallet" | "support" | "technical" | "liquidity";
  }) {
    return request("tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStatus(id: number, status: "todo" | "in_progress" | "done") {
    return request(`tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};

export const ticketsApi = {
  async getAll() {
    const data = await request<{ tickets: any[] }>("tickets");
    return data.tickets.map(mapTicket);
  },

  async getWithMessages(ticketId: string) {
    const data = await request<{ ticket: any; messages: any[] }>(`tickets/${ticketId}/messages`);
    return {
      ticket: mapTicket(data.ticket),
      messages: data.messages.map(mapTicketMessage),
    };
  },

  async create(payload: {
    subject: string;
    message: string;
    category?: "wallet" | "support" | "technical" | "kyc" | "other";
  }) {
    return request("tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async reply(ticketId: string, message: string) {
    return request(`tickets/${ticketId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  async updateStatus(ticketId: string, status: "open" | "in_progress" | "closed") {
    return request(`tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
};

// =================================================================
//  MARKET
// =================================================================
export const marketApi = {
  async getPrices() {
    const data = await request<{ market: any[] }>("market");
    return data.market.map(mapMarketTicker);
  },
};

// =================================================================
//  STATS (ادمین)
// =================================================================
export const statsApi = {
  async get() {
    const data = await request<{ stats: any }>("stats");
    return data.stats;
  },
};
