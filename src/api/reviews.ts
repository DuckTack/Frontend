import { apiClient } from "./apiClient";

export type ReviewTarget = {
  companyId?: string | number | null;
  kakaoPlaceId?: string | null;
  kakaoPlaceName?: string | null;
  kakaoPlacePhone?: string | null;
  kakaoPlaceAddress?: string | null;
  kakaoPlaceLat?: number | string | null;
  kakaoPlaceLng?: number | string | null;
};

export type ExpertReview = {
  id: string | number;
  authorUsername: string;
  rating: number;
  content: string;
  createdAt: string;
};

export type ExpertReviewSummary = {
  avgRating: number;
  reviewCount: number;
  reviews: ExpertReview[];
};

export type CreateExpertReviewRequest = ReviewTarget & {
  rating: number;
  content?: string;
};

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeReview(raw: any): ExpertReview {
  return {
    id: raw?.id ?? raw?.reviewId ?? `${raw?.authorUsername ?? "review"}-${raw?.createdAt ?? Date.now()}`,
    authorUsername: String(raw?.authorUsername ?? raw?.writerName ?? raw?.username ?? "사용자"),
    rating: Number(raw?.rating ?? 0),
    content: String(raw?.content ?? raw?.reviewContent ?? raw?.comment ?? ""),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  };
}

function normalizeReviewSummary(raw: any): ExpertReviewSummary {
  const data = raw?.data ?? raw;
  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];

  return {
    avgRating: Number(data?.avgRating ?? 0),
    reviewCount: Number(data?.reviewCount ?? reviews.length ?? 0),
    reviews: reviews.map(normalizeReview),
  };
}

export function getReviewTargetKey(target: ReviewTarget): string | null {
  if (target.companyId !== null && target.companyId !== undefined && String(target.companyId) !== "") {
    return `company-${String(target.companyId)}`;
  }
  if (target.kakaoPlaceId) {
    return `kakao-${String(target.kakaoPlaceId)}`;
  }
  return null;
}

function buildReviewQuery(target: ReviewTarget) {
  if (target.companyId !== null && target.companyId !== undefined && String(target.companyId) !== "") {
    return { companyId: target.companyId };
  }
  if (target.kakaoPlaceId) {
    return { kakaoPlaceId: target.kakaoPlaceId };
  }
  throw new Error("REVIEW_INVALID_TARGET");
}

function buildCreateBody(req: CreateExpertReviewRequest) {
  const body: Record<string, any> = {
    rating: req.rating,
    content: (req.content ?? "").trim(),
  };

  if (req.companyId !== null && req.companyId !== undefined && String(req.companyId) !== "") {
    body.companyId = Number(req.companyId);
    return body;
  }

  if (req.kakaoPlaceId) {
    body.kakaoPlaceId = String(req.kakaoPlaceId);
    body.kakaoPlaceName = String(req.kakaoPlaceName ?? "");
    if (req.kakaoPlacePhone) body.kakaoPlacePhone = String(req.kakaoPlacePhone);
    if (req.kakaoPlaceAddress) body.kakaoPlaceAddress = String(req.kakaoPlaceAddress);

    const lat = toNumberOrUndefined(req.kakaoPlaceLat);
    const lng = toNumberOrUndefined(req.kakaoPlaceLng);
    if (lat !== undefined) body.kakaoPlaceLat = lat;
    if (lng !== undefined) body.kakaoPlaceLng = lng;
    return body;
  }

  throw new Error("REVIEW_INVALID_TARGET");
}

export function getReviewApiErrorMessage(error: any): string {
  const code = error?.response?.data?.error?.code;
  const message = error?.response?.data?.error?.message;

  if (message) return String(message);
  if (code === "AUTH_FAILED") return "로그인이 필요합니다.";
  if (code === "COMPANY_NOT_FOUND") return "업체 정보를 찾을 수 없습니다.";
  if (code === "REVIEW_DUPLICATE") return "이미 이 업체에 리뷰를 작성했습니다.";
  if (code === "REVIEW_INVALID_TARGET") return "리뷰를 연결할 업체 정보가 없습니다.";
  return "리뷰 API 연결 상태를 확인해주세요.";
}

export async function getExpertReviewSummary(target: ReviewTarget): Promise<ExpertReviewSummary> {
  const res = await apiClient.get("/api/reviews", {
    params: buildReviewQuery(target),
  });
  return normalizeReviewSummary(res.data);
}

export async function listExpertReviews(target: ReviewTarget): Promise<ExpertReview[]> {
  const summary = await getExpertReviewSummary(target);
  return summary.reviews;
}

export async function createExpertReview(req: CreateExpertReviewRequest): Promise<ExpertReview> {
  const res = await apiClient.post("/api/reviews", buildCreateBody(req));
  return normalizeReview(res.data?.data ?? res.data);
}
