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
  latitude?: number;
  longitude?: number;
  addressLine?: string;
  serviceRegionLabel?: string;
};

function toNumberOrUndefined(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeVendor(raw: any): ExpertVendor {
  return {
    id: String(raw?.id ?? raw?.vendorId ?? ""),
    name: String(raw?.name ?? ""),
    region: String(raw?.region ?? raw?.serviceRegionLabel ?? ""),
    minPrice: Number(raw?.minPrice ?? raw?.minEstimatedQuoteKrw ?? 0),
    rating: Number(raw?.rating ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    intro: String(raw?.intro ?? raw?.capabilityNote ?? ""),
    coverageAreas: Array.isArray(raw?.coverageAreas)
      ? raw.coverageAreas.map(String)
      : raw?.serviceRegionLabel
        ? [String(raw.serviceRegionLabel)]
        : [],
    phone: raw?.phone ? String(raw.phone) : undefined,
    latitude: toNumberOrUndefined(raw?.latitude ?? raw?.lat),
    longitude: toNumberOrUndefined(raw?.longitude ?? raw?.lng),
    addressLine: raw?.addressLine ? String(raw.addressLine) : undefined,
    serviceRegionLabel: raw?.serviceRegionLabel ? String(raw.serviceRegionLabel) : undefined,
  };
}

// TODO(backend): 업체 거리 계산을 프론트에서 하려면 vendor 응답에 latitude/longitude가 필요합니다.
// 초기에는 프론트가 사용자 GPS를 받고 하버사인 거리 계산을 수행하도록 맞춰두었습니다.
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
