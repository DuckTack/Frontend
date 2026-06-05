import { apiClient } from "./apiClient";
import type { IssueType } from "./histories";

export const VENDOR_REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산"] as const;
export type VendorRegion = (typeof VENDOR_REGIONS)[number];
export type ExpertVendorSort = "price" | "rating" | "name";

export type ExpertVendor = {
  /** 화면 렌더링/라우팅용 안정 key. 제휴 업체는 companyId, 카카오 업체는 kakaoPlaceId 기반으로 만든다. */
  id: string;

  /** 제휴 업체 DB PK. 제휴 업체일 때만 존재한다. */
  companyId?: string;

  /** 카카오 장소 ID. 외부 업체일 때 리뷰 조회/작성 기준으로 사용한다. */
  kakaoPlaceId?: string;

  /** 카카오 장소 페이지 URL. 외부 업체의 "카카오에서 보기"에 사용한다. */
  placeUrl?: string;

  name: string;
  region: string;
  minPrice: number;

  /** 카드 표시용 평균 별점. null 이면 아직 리뷰 없음. */
  avgRating: number | null;

  /** 기존 화면 정렬 호환용. avgRating 이 없으면 0으로 둔다. */
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

  /** true = 제휴 업체, false = 카카오 외부 검색 업체 */
  isPartner?: boolean;
};

export type NearbyCompanyRequest = {
  latitude: number;
  longitude: number;
  region: string;
  keyword?: string;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * 지역 탭만 눌렀을 때도 카카오 외부 업체를 검색하기 위한 지역 중심 좌표.
 * 백엔드 nearby API는 lat/lon 파라미터를 받는다.
 */
export const REGION_COORDS: Record<VendorRegion, Coordinates> = {
  서울: { latitude: 37.5665, longitude: 126.9780 },
  경기: { latitude: 37.2636, longitude: 127.0286 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  울산: { latitude: 35.5384, longitude: 129.3114 },
};

function toNumberOrUndefined(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function extractListFromResponse(data: any): any[] {
  const body = data?.data ?? data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.data)) return body.data;

  return [];
}

function toBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "t" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return false;
}

function kakaoPlaceUrlFromId(kakaoPlaceId?: string) {
  if (!kakaoPlaceId) return undefined;
  return `https://place.map.kakao.com/${kakaoPlaceId}`;
}

function issueTypeToKeyword(issueType: IssueType): string {
  const raw = String(issueType ?? "").toUpperCase();

  if (raw.includes("CRACK")) return "균열 보수";
  if (raw.includes("LEAK")) return "누수 수리";
  if (raw.includes("MOLD")) return "곰팡이 제거";
  if (raw.includes("PEEL")) return "벽지 시공";
  if (raw.includes("PAINT")) return "벽지 시공";
  if (raw.includes("CORROSION")) return "부식 수리";
  if (raw.includes("BULGE")) return "하자 보수";
  if (raw.includes("ELECTRIC")) return "전기 수리";
  if (raw.includes("GAS")) return "가스 설비";

  return "집수리";
}

function sortPartnerFirstByName(vendors: ExpertVendor[]): ExpertVendor[] {
  return [...vendors].sort((a, b) => {
    const partnerDiff = Number(!!b.isPartner) - Number(!!a.isPartner);
    if (partnerDiff !== 0) return partnerDiff;

    return String(a.name ?? "").localeCompare(String(b.name ?? ""), "ko");
  });
}

function normalizeVendor(raw: any): ExpertVendor {
  const rawId = raw?.id ?? raw?.companyId ?? raw?.vendorId;
  const kakaoPlaceId = raw?.kakaoPlaceId ? String(raw.kakaoPlaceId) : undefined;
  const placeUrl = raw?.placeUrl ? String(raw.placeUrl) : kakaoPlaceUrlFromId(kakaoPlaceId);

  // /api/experts/vendors 는 제휴업체 전용 엔드포인트이므로 기본값은 true.
  const isPartner =
      raw?.partner === false || raw?.isPartner === false || raw?.partner === "false" || raw?.isPartner === "false"
          ? false
          : true;

  const id =
      rawId !== null && rawId !== undefined && rawId !== ""
          ? String(rawId)
          : kakaoPlaceId
              ? `kakao-${kakaoPlaceId}`
              : String(raw?.name ?? "");

  return {
    id,

    companyId:
        isPartner && rawId !== null && rawId !== undefined && rawId !== ""
            ? String(rawId)
            : undefined,

    kakaoPlaceId,
    placeUrl,

    name: String(raw?.name ?? raw?.kakaoPlaceName ?? ""),
    region: String(raw?.region ?? raw?.serviceRegionLabel ?? ""),
    minPrice: Number(raw?.minPrice ?? raw?.minEstimatedQuoteKrw ?? 0),
    maxPrice: toNumberOrUndefined(raw?.maxEstimatedQuoteKrw ?? raw?.maxPrice),

    avgRating:
        raw?.avgRating === null || raw?.avgRating === undefined
            ? null
            : Number(raw.avgRating),

    rating: Number(raw?.avgRating ?? raw?.rating ?? 0),
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

    addressLine:
        raw?.addressLine
            ? String(raw.addressLine)
            : raw?.address
                ? String(raw.address)
                : undefined,

    serviceRegionLabel: raw?.serviceRegionLabel ? String(raw.serviceRegionLabel) : undefined,
    distanceKm: toNumberOrUndefined(raw?.distanceKm),

    isPartner,
  };
}

export async function listExpertVendors(params: {
  region: string;
  issueType: IssueType;
  sortKey: ExpertVendorSort;
  direction: "asc" | "desc";
}): Promise<ExpertVendor[]> {
  const region = params.region as VendorRegion;
  const regionCoords = REGION_COORDS[region];

  // 위치 권한이 없어도 지역 탭만 눌렀을 때 외부 업체까지 보이게 한다.
  // 실제 사용자 거리순은 expert.tsx에서 사용자 좌표로 다시 계산한다.
  if (regionCoords) {
    try {
      const nearbyVendors = await listNearbyCompanies({
        latitude: regionCoords.latitude,
        longitude: regionCoords.longitude,
        region: params.region,
        keyword: `${params.region} ${issueTypeToKeyword(params.issueType)}`.trim(),
      });

      if (nearbyVendors.length > 0) {
        return sortPartnerFirstByName(nearbyVendors);
      }
    } catch (err) {
      console.log("[listExpertVendors] 지역 중심 업체 조회 실패. 제휴업체 API로 fallback:", err);
    }
  }

  const res = await apiClient.get("/api/experts/vendors", {
    params: {
      region: params.region,
      issueType: params.issueType,
      sortKey: params.sortKey,
      direction: params.direction,
    },
  });

  return sortPartnerFirstByName(extractListFromResponse(res.data).map(normalizeVendor));
}

/**
 * 백엔드:
 * GET /api/companies/nearby?lat=..&lon=..&keyword=..&region=..
 *
 * 제휴업체:
 * - partner=true
 * - id 있음
 * - companyId로 앱 내 예약 가능
 *
 * 카카오 외부업체:
 * - partner=false
 * - companyId 없음
 * - kakaoPlaceId/placeUrl로 전화 문의 또는 카카오 장소 연결만 가능
 */
export async function listNearbyCompanies(
    params: NearbyCompanyRequest
): Promise<ExpertVendor[]> {
  const res = await apiClient.get("/api/companies/nearby", {
    params: {
      lat: params.latitude,
      lon: params.longitude,
      keyword: params.keyword ?? params.region,
      region: params.region,
    },
  });

  const list = extractListFromResponse(res.data);

  return list.map((item: any, index: number) => {
    const rawId = item?.id;
    const name = String(item?.name ?? "");
    const lat = toNumberOrUndefined(item?.latitude);
    const lng = toNumberOrUndefined(item?.longitude);
    const kakaoPlaceId = item?.kakaoPlaceId ? String(item.kakaoPlaceId) : undefined;
    const placeUrl = item?.placeUrl ? String(item.placeUrl) : kakaoPlaceUrlFromId(kakaoPlaceId);

    // 중요:
    // Boolean("false")는 true가 되므로 절대 Boolean(...)으로 파싱하지 않는다.
    // 백엔드가 true일 때만 제휴업체로 본다.
    const isPartner = toBoolean(item?.partner ?? item?.isPartner);

    const id =
        isPartner && rawId !== null && rawId !== undefined && rawId !== ""
            ? String(rawId)
            : kakaoPlaceId
                ? `kakao-${kakaoPlaceId}`
                : `nearby-${name}-${lat ?? "x"}-${lng ?? "y"}-${index}`;

    return {
      id,

      // 외부 업체는 rawId가 있더라도 예약용 companyId를 주지 않는다.
      // 그래야 expert.tsx에서 예약 페이지로 이동하지 않는다.
      companyId:
          isPartner && rawId !== null && rawId !== undefined && rawId !== ""
              ? String(rawId)
              : undefined,

      kakaoPlaceId,
      placeUrl,

      name,

      region: item?.serviceRegionLabel
          ? String(item.serviceRegionLabel)
          : params.region,

      minPrice: Number(item?.minEstimatedQuoteKrw ?? item?.minPrice ?? 0),
      maxPrice: toNumberOrUndefined(item?.maxEstimatedQuoteKrw ?? item?.maxPrice),

      avgRating:
          item?.avgRating === null || item?.avgRating === undefined
              ? null
              : Number(item.avgRating),

      rating: Number(item?.avgRating ?? item?.rating ?? 0),
      reviewCount: Number(item?.reviewCount ?? 0),
      intro: String(item?.intro ?? ""),

      coverageAreas: item?.serviceRegionLabel
          ? [String(item.serviceRegionLabel)]
          : [params.region],

      phone: item?.phone ? String(item.phone) : undefined,
      latitude: lat,
      longitude: lng,

      addressLine:
          item?.addressLine
              ? String(item.addressLine)
              : item?.address
                  ? String(item.address)
                  : undefined,

      serviceRegionLabel: item?.serviceRegionLabel
          ? String(item.serviceRegionLabel)
          : params.region,

      distanceKm: toNumberOrUndefined(item?.distanceKm),
      isPartner,
    };
  });
}
