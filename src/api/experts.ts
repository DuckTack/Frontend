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
  distanceKm?: number;
  maxPrice?: number;
};

export type NearbyCompanyRequest = {
  latitude: number;
  longitude: number;
  region: string;
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
    maxPrice: toNumberOrUndefined(raw?.maxEstimatedQuoteKrw),
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
    distanceKm: toNumberOrUndefined(raw?.distanceKm),
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

export async function listNearbyCompanies(params: NearbyCompanyRequest): Promise<ExpertVendor[]> {
  const res = await apiClient.post("/api/companies/nearby", {
    latitude: params.latitude,
    longitude: params.longitude,
    region: params.region,
  });
  const body = res.data?.data ?? res.data;
  const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  return list.map((item: any) => ({
    id: String(item?.id ?? ""),
    name: String(item?.name ?? ""),
    region: params.region,
    minPrice: Number(item?.minEstimatedQuoteKrw ?? 0),
    maxPrice: toNumberOrUndefined(item?.maxEstimatedQuoteKrw),
    rating: Number(item?.rating ?? 0),
    reviewCount: Number(item?.reviewCount ?? 0),
    intro: String(item?.intro ?? ""),
    coverageAreas: [],
    phone: item?.phone ? String(item.phone) : undefined,
    addressLine: item?.addressLine ? String(item.addressLine) : undefined,
    serviceRegionLabel: item?.serviceRegionLabel ? String(item.serviceRegionLabel) : params.region,
    distanceKm: toNumberOrUndefined(item?.distanceKm),
  }));
}
