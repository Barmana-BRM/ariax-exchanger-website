export const APP_ROLES = [
  "user",
  "kyc_operator",
  "support",
  "finance_manager",
  "admin",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  user: "کاربر عادی",
  kyc_operator: "اپراتور KYC",
  support: "پشتیبان",
  finance_manager: "مدیر مالی",
  admin: "ادمین کل سیستم",
};

export const ROLE_GROUPS = {
  admin: ["admin"] as AppRole[],
  staff: ["admin", "kyc_operator", "support", "finance_manager"] as AppRole[],
  kyc: ["admin", "kyc_operator"] as AppRole[],
  finance: ["admin", "finance_manager"] as AppRole[],
  support: ["admin", "support"] as AppRole[],
  user: ["user", "admin"] as AppRole[],
} as const;

export type AppPermission =
  | "profile.view_own"
  | "profile.update_own"
  | "kyc.submit_own"
  | "kyc.view_own"
  | "kyc.view_all"
  | "kyc.review_all"
  | "tickets.create_own"
  | "tickets.view_own"
  | "tickets.reply_own"
  | "tickets.view_all"
  | "tickets.reply_all"
  | "transactions.create_own"
  | "transactions.view_own"
  | "transactions.view_all"
  | "transactions.review_all"
  | "stats.view"
  | "market.view"
  | "messages.view_all"
  | "messages.create_all"
  | "tasks.view_all"
  | "tasks.create_all"
  | "tasks.update_all";

const ROLE_PERMISSIONS: Record<AppRole, AppPermission[] | ["*"]> = {
  user: [
    "profile.view_own",
    "profile.update_own",
    "kyc.submit_own",
    "kyc.view_own",
    "tickets.create_own",
    "tickets.view_own",
    "tickets.reply_own",
    "transactions.create_own",
    "transactions.view_own",
    "market.view",
  ],
  kyc_operator: [
    "kyc.view_all",
    "kyc.review_all",
    "tickets.view_all",
    "tickets.reply_all",
    "market.view",
  ],
  support: [
    "tickets.view_all",
    "tickets.reply_all",
    "messages.view_all",
    "messages.create_all",
    "tasks.view_all",
    "tasks.create_all",
    "tasks.update_all",
    "market.view",
  ],
  finance_manager: [
    "transactions.view_all",
    "transactions.review_all",
    "stats.view",
    "market.view",
    "tickets.view_all",
  ],
  admin: ["*"],
};

export function canonicalRole(role?: string | null): AppRole {
  switch ((role ?? "user").toLowerCase()) {
    case "super_admin":
    case "system_admin":
    case "root":
    case "admin":
      return "admin";
    case "kyc":
    case "kyc_admin":
    case "kyc_manager":
    case "kyc_operator":
      return "kyc_operator";
    case "support":
    case "support_agent":
    case "support_operator":
      return "support";
    case "finance":
    case "finance_admin":
    case "finance_manager":
    case "accounting":
      return "finance_manager";
    case "user":
    default:
      return "user";
  }
}

export function hasRole(role: string | null | undefined, allowed: AppRole[]): boolean {
  const resolved = canonicalRole(role);
  return allowed.includes(resolved);
}

export function canAccess(role: string | null | undefined, permission: AppPermission): boolean {
  const resolved = canonicalRole(role);
  const permissions = ROLE_PERMISSIONS[resolved];
  if (permissions.length === 1 && permissions[0] === "*") return true;
  return (permissions as AppPermission[]).includes(permission);
}

export function canAccessAny(role: string | null | undefined, permissions: AppPermission[]): boolean {
  return permissions.some((permission) => canAccess(role, permission));
}
