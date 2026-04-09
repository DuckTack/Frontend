import { apiClient } from "./apiClient";
import type { IssueType } from "./histories";

export const VENDOR_REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산"] as const;
export type VendorRegion = (typeof VENDOR_REGIONS)[number];
export type ExpertVendorSort = "price" | "rating" | "name";

export type ExpertVendor = {
  id: string;
  name: string;
  region: string;
  minPrice: number;
  rating: number;
  reviewCount: number;
  intro: string;
  coverageAreas: string[];
  phone?: string;
};

function normalizeVendor(raw: any): ExpertVendor {
  return {
    id: String(raw?.id ?? raw?.vendorId ?? ""),
    name: String(raw?.name ?? ""),
    region: String(raw?.region ?? ""),
    minPrice: Number(raw?.minPrice ?? 0),
    rating: Number(raw?.rating ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    intro: String(raw?.intro ?? ""),
    coverageAreas: Array.isArray(raw?.coverageAreas) ? raw.coverageAreas.map(String) : [],
    phone: raw?.phone ? String(raw.phone) : undefined,
  };
}

export async function listExpertVendors(params: {
  region: string;
  issueType: IssueType;
  sortKey: ExpertVendorSort;
  direction: "asc" | "desc";
}): Promise<ExpertVendor[]> {
  const res = await apiClient.get("/api/experts/vendors", {
    params: {
      region: params.region,
      issueType: params.issueType,
      sort: `${params.sortKey}_${params.direction}`,
    },
  });
  const body = res.data?.data ?? res.data;
  const list = Array.isArray(body?.content) ? body.content : Array.isArray(body) ? body : [];
  return list.map(normalizeVendor);
}
