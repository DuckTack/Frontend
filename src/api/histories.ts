import { apiClient } from "./apiClient";

export type IssueType = "CRACK" | "LEAK" | "MOLD" | "DAMAGE" | "ELECTRIC" | "GAS" | "ETC";
export type DiagnosisStatus = "ANALYZING" | "COMPLETED" | "FAILED";
export type Recommendation = "DIY" | "PRO";

export type HistorySummary = {
  id: string | number;
  historyId: string | number;
  diagnosisId?: string | number;
  status: DiagnosisStatus;
  riskScore: number;
  issueType: IssueType;
  createdAt: string;
  recommendation: Recommendation;
  imageUris?: string[];
  diagnosisImageKeys?: string[];
  cause?: string;
  naturalOrHuman?: string;
  caution?: string;
  /** 제휴 업체 리뷰 작성용 DB PK */
  companyId?: string;
  /** 기존/예약 API 호환용 업체 ID */
  expertVendorId?: string;
  expertVendorName?: string;
  /** 카카오 업체 리뷰 작성용 필드 */
  kakaoPlaceId?: string;
  kakaoPlaceName?: string;
  kakaoPlacePhone?: string;
  kakaoPlaceAddress?: string;
  kakaoPlaceLat?: number;
  kakaoPlaceLng?: number;
  reviewWritten?: boolean;
  report?: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
  } | null;
};

export type HistoryDetail = HistorySummary;

function toRecommendation(riskScore: number): Recommendation {
  return riskScore >= 70 ? "PRO" : "DIY";
}

function stringList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function toNumberOrUndefined(value: any): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function pickImageUris(raw: any): string[] {
  const direct = stringList(raw?.imageUris ?? raw?.imageUrls ?? raw?.diagnosisImageUrls ?? raw?.beforeImageUrls ?? raw?.diagnosis?.beforeImageUrls);
  if (direct.length > 0) return direct;

  const imageObjects = Array.isArray(raw?.images)
    ? raw.images
    : Array.isArray(raw?.diagnosisImages)
      ? raw.diagnosisImages
      : [];

  return imageObjects
    .map((img: any) => img?.url ?? img?.imageUrl ?? img?.fileUrl ?? img?.uri)
    .map((uri: any) => String(uri ?? ""))
    .filter(Boolean);
}

function pickImageKeys(raw: any): string[] {
  const direct = stringList(raw?.imageKeys ?? raw?.diagnosisImageKeys ?? raw?.beforeImageKeys ?? raw?.fileKeys ?? raw?.diagnosis?.beforeImageKeys);
  if (direct.length > 0) return direct;

  const imageObjects = Array.isArray(raw?.images)
    ? raw.images
    : Array.isArray(raw?.diagnosisImages)
      ? raw.diagnosisImages
      : [];

  return imageObjects
    .map((img: any) => img?.storageKey ?? img?.fileKey ?? img?.key)
    .map((key: any) => String(key ?? ""))
    .filter(Boolean);
}

function normalizeHistoryItem(raw: any): HistorySummary {
  const riskScore = Number(raw?.riskScore ?? 0);
  const id = raw?.id ?? raw?.historyId;
  return {
    id,
    historyId: raw?.historyId ?? id,
    diagnosisId: raw?.diagnosisId,
    status: (raw?.status ?? "ANALYZING") as DiagnosisStatus,
    riskScore,
    issueType: (raw?.issueType ?? "ETC") as IssueType,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    recommendation: (raw?.recommendation as Recommendation) ?? toRecommendation(riskScore),
    imageUris: pickImageUris(raw),
    diagnosisImageKeys: pickImageKeys(raw),
    cause: raw?.cause ? String(raw.cause) : undefined,
    naturalOrHuman: raw?.naturalOrHuman ? String(raw.naturalOrHuman) : undefined,
    caution: raw?.caution ? String(raw.caution) : undefined,
    companyId: raw?.companyId ? String(raw.companyId) : raw?.expertCompanyId ? String(raw.expertCompanyId) : undefined,
    expertVendorId: raw?.expertVendorId ? String(raw.expertVendorId) : raw?.vendorId ? String(raw.vendorId) : undefined,
    expertVendorName: raw?.expertVendorName ? String(raw.expertVendorName) : raw?.vendorName ? String(raw.vendorName) : raw?.kakaoPlaceName ? String(raw.kakaoPlaceName) : undefined,
    kakaoPlaceId: raw?.kakaoPlaceId ? String(raw.kakaoPlaceId) : undefined,
    kakaoPlaceName: raw?.kakaoPlaceName ? String(raw.kakaoPlaceName) : raw?.expertVendorName ? String(raw.expertVendorName) : raw?.vendorName ? String(raw.vendorName) : undefined,
    kakaoPlacePhone: raw?.kakaoPlacePhone ? String(raw.kakaoPlacePhone) : raw?.vendorPhone ? String(raw.vendorPhone) : undefined,
    kakaoPlaceAddress: raw?.kakaoPlaceAddress ? String(raw.kakaoPlaceAddress) : raw?.vendorAddress ? String(raw.vendorAddress) : undefined,
    kakaoPlaceLat: toNumberOrUndefined(raw?.kakaoPlaceLat ?? raw?.vendorLatitude),
    kakaoPlaceLng: toNumberOrUndefined(raw?.kakaoPlaceLng ?? raw?.vendorLongitude),
    reviewWritten: Boolean(raw?.reviewWritten ?? raw?.hasReview ?? false),
    report: raw?.report ?? null,
  };
}

export async function listHistories(): Promise<HistorySummary[]> {
  const res = await apiClient.get("/api/histories", {
    params: { page: 0, size: 50, sort: "createdAt,desc" },
  });
  const page = res.data?.data ?? res.data;
  const content = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
  return content.map(normalizeHistoryItem);
}

export async function getHistoryDetail(id: string | number): Promise<HistoryDetail> {
  const res = await apiClient.get(`/api/histories/${id}`);
  return normalizeHistoryItem(res.data?.data ?? res.data);
}

export async function deleteHistory(id: string | number): Promise<void> {
  await apiClient.delete("/api/histories", {
    data: { ids: [Number(id)] },
  });
}
