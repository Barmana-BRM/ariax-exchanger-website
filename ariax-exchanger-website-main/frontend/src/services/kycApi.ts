import { API_BASE, apiNetworkError } from "./api";
import type { KycDraftSnapshot, KycReportRow } from "../types";

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        return response.ok;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = (await response.text()).replace(/^\uFEFF/, "");
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(raw.trim().slice(0, 200) || `Server error: ${response.status}`);
    }
  }
  if (!response.ok) {
    throw new Error(data.error ?? `Server error: ${response.status}`);
  }
  return data as T;
}

async function jsonRequest<T>(path: string, payload?: unknown, method = "POST"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch (err) {
    throw apiNetworkError(err);
  }
  if (response.status === 401 && !path.startsWith("auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        response = await fetch(`${API_BASE}/${path}`, {
          method,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: payload === undefined ? undefined : JSON.stringify(payload),
        });
      } catch (err) {
        throw apiNetworkError(err);
      }
    }
  }
  return parseResponse<T>(response);
}

async function formRequest<T>(path: string, form: FormData, method = "POST"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
      method,
      credentials: "include",
      body: form,
    });
  } catch (err) {
    throw apiNetworkError(err);
  }
  if (response.status === 401 && !path.startsWith("auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        response = await fetch(`${API_BASE}/${path}`, {
          method,
          credentials: "include",
          body: form,
        });
      } catch (err) {
        throw apiNetworkError(err);
      }
    }
  }
  return parseResponse<T>(response);
}

export interface DraftSavePayload {
  draftToken?: string;
  step: 1 | 2 | 3;
  firstName?: string;
  lastName?: string;
  email?: string;
  nationalId?: string;
  phone?: string;
  homeAddress?: string;
  supportingDocumentType?: string;
  faceMatchScore?: number;
  faceMatchStatus?: string;
  nationalIdImage?: File | null;
  selfieImage?: File | null;
  supportingDocument?: File | null;
}

function buildDraftForm(payload: DraftSavePayload): FormData {
  const form = new FormData();
  form.append("step", String(payload.step));
  if (payload.draftToken) form.append("draftToken", payload.draftToken);
  if (payload.firstName) form.append("firstName", payload.firstName);
  if (payload.lastName) form.append("lastName", payload.lastName);
  if (payload.email) form.append("email", payload.email);
  if (payload.nationalId) form.append("nationalId", payload.nationalId);
  if (payload.phone) form.append("phone", payload.phone);
  if (payload.homeAddress) form.append("homeAddress", payload.homeAddress);
  if (payload.supportingDocumentType) form.append("supportingDocumentType", payload.supportingDocumentType);
  if (typeof payload.faceMatchScore === "number") form.append("faceMatchScore", String(payload.faceMatchScore));
  if (payload.faceMatchStatus) form.append("faceMatchStatus", payload.faceMatchStatus);
  if (payload.nationalIdImage) form.append("nationalIdImage", payload.nationalIdImage);
  if (payload.selfieImage) form.append("selfieImage", payload.selfieImage);
  if (payload.supportingDocument) form.append("supportingDocument", payload.supportingDocument);
  return form;
}

export const kycApi = {
  async saveDraft(payload: DraftSavePayload) {
    return formRequest<KycDraftSnapshot>("kyc/drafts", buildDraftForm(payload));
  },

  async getDraft(draftToken: string) {
    return jsonRequest<KycDraftSnapshot>(`kyc/drafts/${encodeURIComponent(draftToken)}`, undefined, "GET");
  },

  async getMyStatus() {
    return jsonRequest<KycDraftSnapshot>("kyc/me", undefined, "GET");
  },

  async getReport() {
    return jsonRequest<{ rows: KycReportRow[]; summary: Record<string, number> }>("kyc/report", undefined, "GET");
  },

  async review(applicationId: number, payload: { overallStatus: "approved" | "rejected"; rejectionReason?: string }) {
    return jsonRequest(`kyc/report/${applicationId}`, payload, "PUT");
  },

  async reviewStep(
    applicationId: number,
    payload: { step: 1 | 2 | 3; status: "approved" | "rejected"; rejectionReason?: string }
  ) {
    return jsonRequest<{
      success: boolean;
      step: number;
      stepStatus: string;
      step1Status: string;
      step2Status: string;
      step3Status: string;
      overallStatus: string;
    }>(`kyc/report/${applicationId}/step`, payload, "PUT");
  },
};
