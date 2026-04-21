import { apiClient } from "./apiClient";
import type { IssueType } from "./histories";

export type AdminUserListItem = {
  id: number;
  username: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  residenceType?: string;
  rentType?: string;
  role?: string;
};

export type AdminUserDetail = {
  id: number;
  username: string;
  email?: string;
  role: "USER" | "ADMIN" | string;
  phoneNumber?: string;
  address?: string;
  residenceType?: string;
  rentType?: string;
  createdAt: string;
};

export type AdminUserHistorySummary = {
  historyId: number;
  createdAt: string;
  issueType: IssueType;
  riskScore: number;
  status: string;
  recommendation: "DIY" | "PRO";
  report: boolean;
};

export type AdminCompanyListItem = {
  id: number;
  name: string;
  address: string;
};

export type AdminCompanyDetail = {
  id: number;
  name: string;
  businessRegistrationNumber?: string;
  representativeName?: string;
  phone?: string;
  email?: string;
  addressLine?: string;
  postalCode?: string;
  serviceRegionLabel?: string;
  specialties?: IssueType[];
  minEstimatedQuoteKrw?: number;
  maxEstimatedQuoteKrw?: number;
  capabilityNote?: string;
  active: boolean;
  adminMemo?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAdminCompanyRequest = {
  name: string;
  businessRegistrationNumber?: string;
  representativeName?: string;
  phone?: string;
  email?: string;
  addressLine?: string;
  postalCode?: string;
  serviceRegionLabel?: string;
  specialties?: IssueType[];
  minEstimatedQuoteKrw?: number;
  maxEstimatedQuoteKrw?: number;
  capabilityNote?: string;
  active?: boolean;
  adminMemo?: string;
};

function unwrap<T>(raw: any): T {
  return (raw?.data ?? raw) as T;
}

function unwrapPage<T>(raw: any): T[] {
  const body = raw?.data ?? raw;
  if (Array.isArray(body?.content)) return body.content as T[];
  if (Array.isArray(body)) return body as T[];
  return [];
}

function normalizeRecommendation(riskScore: number): "DIY" | "PRO" {
  return Number(riskScore ?? 0) >= 70 ? "PRO" : "DIY";
}

function normalizeAdminUser(raw: any): AdminUserListItem {
  return {
    id: Number(raw?.id ?? 0),
    username: String(raw?.username ?? raw?.name ?? ""),
    email: raw?.email ? String(raw.email) : undefined,
    phoneNumber: raw?.phoneNumber ? String(raw.phoneNumber) : undefined,
    address: raw?.address ? String(raw.address) : undefined,
    residenceType: raw?.residenceType ? String(raw.residenceType) : undefined,
    rentType: raw?.rentType ? String(raw.rentType) : undefined,
    role: raw?.role ? String(raw.role) : undefined,
  };
}

function normalizeAdminUserDetail(raw: any): AdminUserDetail {
  return {
    id: Number(raw?.id ?? 0),
    username: String(raw?.username ?? raw?.name ?? ""),
    email: raw?.email ? String(raw.email) : undefined,
    role: String(raw?.role ?? "USER"),
    phoneNumber: raw?.phoneNumber ? String(raw.phoneNumber) : undefined,
    address: raw?.address ? String(raw.address) : undefined,
    residenceType: raw?.residenceType ? String(raw.residenceType) : undefined,
    rentType: raw?.rentType ? String(raw.rentType) : undefined,
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  };
}

function normalizeUserHistory(raw: any): AdminUserHistorySummary {
  return {
    historyId: Number(raw?.id ?? raw?.historyId ?? 0),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    issueType: (raw?.issueType ?? "ETC") as IssueType,
    riskScore: Number(raw?.riskScore ?? 0),
    status: String(raw?.status ?? "UNKNOWN"),
    recommendation: normalizeRecommendation(Number(raw?.riskScore ?? 0)),
    report: Boolean(raw?.report),
  };
}

export async function detectAdmin(): Promise<boolean> {
  try {
    await apiClient.get("/api/admin/users", { params: { page: 0, size: 1 } });
    return true;
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) return false;
    return false;
  }
}

export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  const res = await apiClient.get("/api/admin/users", {
    params: { page: 0, size: 100, sort: "id,desc" },
  });
  return unwrapPage<any>(res.data).map(normalizeAdminUser);
}

export async function getAdminUserDetail(id: number): Promise<AdminUserDetail> {
  const res = await apiClient.get(`/api/admin/users/${id}`);
  return normalizeAdminUserDetail(unwrap<any>(res.data));
}

export async function listAdminUserHistories(id: number): Promise<AdminUserHistorySummary[]> {
  const res = await apiClient.get(`/api/admin/users/${id}/histories`);
  return unwrapPage<any>(res.data).map(normalizeUserHistory);
}

export async function listAdminCompanies(activeOnly?: boolean): Promise<AdminCompanyListItem[]> {
  const res = await apiClient.get("/api/admin/companies", {
    params: { page: 0, size: 100, sort: "id,desc", activeOnly },
  });
  return unwrapPage<AdminCompanyListItem>(res.data);
}

export async function getAdminCompanyDetail(id: number): Promise<AdminCompanyDetail> {
  const res = await apiClient.get(`/api/admin/companies/${id}`);
  const data = unwrap<any>(res.data);
  return {
    ...data,
    specialties: Array.isArray(data?.specialties) ? data.specialties : [],
    active: Boolean(data?.active),
  };
}

export async function createAdminCompany(req: CreateAdminCompanyRequest): Promise<AdminCompanyDetail> {
  const res = await apiClient.post("/api/admin/companies", req);
  return unwrap<AdminCompanyDetail>(res.data);
}

export async function updateAdminCompany(id: number, req: Partial<CreateAdminCompanyRequest>): Promise<AdminCompanyDetail> {
  const res = await apiClient.put(`/api/admin/companies/${id}`, req);
  return unwrap<AdminCompanyDetail>(res.data);
}

export async function setAdminCompanyActive(id: number, active: boolean): Promise<AdminCompanyDetail> {
  const res = await apiClient.patch(`/api/admin/companies/${id}/active`, { active });
  return unwrap<AdminCompanyDetail>(res.data);
}
