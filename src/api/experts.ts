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
  /** 제휴 업체 여부. true = 관리자가 등록한 제휴 업체, false/undefined = 네이버 지역검색 결과 */
  isPartner?: boolean;
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
    // /api/experts/vendors 결과는 모두 관리자 등록 제휴 업체로 가정
    isPartner: raw?.isPartner === false ? false : true,
  };
}

export async function listExpertVendors(params: {
  region: string;
  issueType: IssueType;
  sortKey: ExpertVendorSort;
  direction: "asc" | "desc";
}): Promise<ExpertVendor[]> {
  // 백엔드 /api/experts/vendors 는 sortKey 와 direction 을 분리된 파라미터로 받는다.
  const res = await apiClient.get("/api/experts/vendors", {
    params: {
      region: params.region,
      issueType: params.issueType,
      sortKey: params.sortKey,
      direction: params.direction,
    },
  });
  const body = res.data?.data ?? res.data;
  const list = Array.isArray(body?.content) ? body.content : Array.isArray(body) ? body : [];
  return list.map(normalizeVendor);
}

/**
 * 백엔드 GET /api/companies/nearby?lat=..&lon=..&keyword=..
 * 응답: ApiResponse<List<NearbyCompanyResponse{ id, name, phone, address, latitude, longitude, distanceKm, isPartner }>>
 *  - id 는 네이버 비제휴 업체의 경우 null (프론트에서 안정적 key 를 합성해 준다)
 *  - 필드명은 address (addressLine 아님)
 */
export async function listNearbyCompanies(params: NearbyCompanyRequest & { keyword?: string }): Promise<ExpertVendor[]> {
  const res = await apiClient.get("/api/companies/nearby", {
    params: {
      lat: params.latitude,
      lon: params.longitude,
      // 지역명을 키워드로 전달(백엔드가 "{keyword} 수리 업체" 로 네이버 지역검색 수행).
      // 호출부에서 명시적 keyword 를 넘기면 그것을 우선한다.
      keyword: params.keyword ?? params.region,
    },
  });
  const body = res.data?.data ?? res.data;
  const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  return list.map((item: any, index: number) => {
    const rawId = item?.id;
    const name = String(item?.name ?? "");
    const lat = toNumberOrUndefined(item?.latitude);
    const lng = toNumberOrUndefined(item?.longitude);
    // 네이버 결과는 id 가 null 이므로, React key 충돌과 merge 버그를 막기 위해 안정적 합성 id 를 만든다.
    const id =
      rawId !== null && rawId !== undefined && rawId !== ""
        ? String(rawId)
        : `nearby-${name}-${lat ?? "x"}-${lng ?? "y"}-${index}`;
    return {
      id,
      name,
      region: params.region,
      minPrice: Number(item?.minEstimatedQuoteKrw ?? item?.minPrice ?? 0),
      maxPrice: toNumberOrUndefined(item?.maxEstimatedQuoteKrw ?? item?.maxPrice),
      rating: Number(item?.rating ?? 0),
      reviewCount: Number(item?.reviewCount ?? 0),
      intro: String(item?.intro ?? ""),
      coverageAreas: [],
      phone: item?.phone ? String(item.phone) : undefined,
      latitude: lat,
      longitude: lng,
      // 백엔드 NearbyCompanyResponse 는 address 필드를 사용한다.
      addressLine:
        item?.addressLine ? String(item.addressLine)
        : item?.address ? String(item.address)
        : undefined,
      serviceRegionLabel: item?.serviceRegionLabel ? String(item.serviceRegionLabel) : params.region,
      distanceKm: toNumberOrUndefined(item?.distanceKm),
      // 백엔드 NearbyCompanyResponse.isPartner 를 그대로 전달 (제휴 여부)
      isPartner: Boolean(item?.isPartner),
    };
  });
}
