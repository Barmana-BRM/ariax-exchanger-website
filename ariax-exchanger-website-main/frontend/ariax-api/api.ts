// src/services/api.ts
// ═══════════════════════════════════════════════════════════════
//  سرویس API — اتصال React به بک‌اند PHP/MySQL
// ═══════════════════════════════════════════════════════════════

const BASE_URL = "http://localhost/ariax-api";

// ── ذخیره توکن در localStorage ────────────────────────────────
function getToken(): string {
  return localStorage.getItem("ariax_token") ?? "";
}

function setToken(token: string): void {
  localStorage.setItem("ariax_token", token);
}

function clearToken(): void {
  localStorage.removeItem("ariax_token");
  localStorage.removeItem("ariax_user");
}

// ── درخواست پایه ──────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? `خطای سرور: ${res.status}`);
  }

  return data as T;
}

// ═══════════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════════
export const authApi = {
  async login(username: string, password: string) {
    const data = await request<{ token: string; user: any }>("auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    localStorage.setItem("ariax_user", JSON.stringify(data.user));
    return data.user;
  },

  async register(payload: {
    nationalId: string;
    phone: string;
    fullName: string;
    username: string;
    password: string;
  }) {
    return request("auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  logout() {
    clearToken();
  },

  getCurrentUser() {
    const raw = localStorage.getItem("ariax_user");
    return raw ? JSON.parse(raw) : null;
  },
};

// ═══════════════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════════════
export const usersApi = {
  async getAll() {
    const data = await request<{ users: any[] }>("users");
    return data.users;
  },

  async updateKyc(userId: string, kycStatus: string, rejectionReason?: string) {
    return request(`users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ kycStatus, rejectionReason }),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════════════════════════════
export const txApi = {
  async getAll() {
    const data = await request<{ transactions: any[] }>("transactions");
    return data.transactions;
  },

  async create(payload: {
    type: "deposit" | "withdraw" | "trade";
    asset: "IRT" | "BTC" | "ETH" | "USDT" | "TRX";
    amount: number;
    destination?: string;
  }) {
    return request("transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════════════════════
export const messagesApi = {
  async getAll() {
    const data = await request<{ messages: any[] }>("messages");
    return data.messages;
  },

  async send(message: string) {
    return request("messages", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
};

// ═══════════════════════════════════════════════════════════════
//  TASKS
// ═══════════════════════════════════════════════════════════════
export const tasksApi = {
  async getAll() {
    const data = await request<{ tasks: any[] }>("tasks");
    return data.tasks;
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

// ═══════════════════════════════════════════════════════════════
//  MARKET
// ═══════════════════════════════════════════════════════════════
export const marketApi = {
  async getPrices() {
    const data = await request<{ market: any[] }>("market");
    return data.market;
  },
};

// ═══════════════════════════════════════════════════════════════
//  STATS (ادمین)
// ═══════════════════════════════════════════════════════════════
export const statsApi = {
  async get() {
    const data = await request<{ stats: any }>("stats");
    return data.stats;
  },
};
