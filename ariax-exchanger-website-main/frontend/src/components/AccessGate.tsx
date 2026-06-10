import type { ReactNode } from "react";
import { canonicalRole, hasRole, type AppRole } from "../security/rbac";

type AccessGateProps = {
  role?: string | null;
  allow: AppRole[];
  fallback?: ReactNode;
  children: ReactNode;
};

export default function AccessGate({ role, allow, fallback = null, children }: AccessGateProps) {
  return hasRole(canonicalRole(role), allow) ? <>{children}</> : <>{fallback}</>;
}

