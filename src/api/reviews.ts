import { apiClient } from "./apiClient";

export type ReviewItem = {
  id: number;
  historyId?: number | null;
  companyId?: number | null;
  companyName?: string | null;
  authorUsername?: string | null;
  rating: number;
  content?: string | null;
  createdAt?: string | null;
};

export type ReviewSummary = {
  avgRating: number;
  reviewCount: number;
  reviews: ReviewItem[];
};

export type ReviewStats = {
  avgRating: number;
  reviewCount: number;
};

export type CreateReviewRequest = {
  historyId?: number;

  companyId?: number;
  kakaoPlaceId?: string;
  kakaoPlaceName?: string;
  kakaoPlacePhone?: string;
  kakaoPlaceAddress?: string;
  kakaoPlaceLat?: number;
  kakaoPlaceLng?: number;

  rating: number;
  content?: string;
};

function unwrapData<T>(raw: any): T {
  return raw?.data ?? raw;
}

function normalizeReviewSummary(raw: any): ReviewSummary {
  const body = unwrapData<any>(raw);

  return {
    avgRating: Number(body?.avgRating ?? 0),
    reviewCount: Number(body?.reviewCount ?? 0),
    reviews: Array.isArray(body?.reviews) ? body.reviews : [],
  };
}

export async function getReviews(params: {
  companyId?: number | string;
  kakaoPlaceId?: string;
}): Promise<ReviewSummary> {
  const query: Record<string, any> = {};

  if (params.companyId !== undefined && params.companyId !== null && params.companyId !== "") {
    query.companyId = params.companyId;
  }

  if (params.kakaoPlaceId) {
    query.kakaoPlaceId = params.kakaoPlaceId;
  }

  const res = await apiClient.get("/api/reviews", {
    params: query,
  });

  return normalizeReviewSummary(res.data);
}

export async function createReview(req: CreateReviewRequest): Promise<ReviewItem> {
  const res = await apiClient.post("/api/reviews", {
    historyId: req.historyId,

    companyId: req.companyId,
    kakaoPlaceId: req.kakaoPlaceId,
    kakaoPlaceName: req.kakaoPlaceName,
    kakaoPlacePhone: req.kakaoPlacePhone,
    kakaoPlaceAddress: req.kakaoPlaceAddress,
    kakaoPlaceLat: req.kakaoPlaceLat,
    kakaoPlaceLng: req.kakaoPlaceLng,

    rating: req.rating,
    content: req.content,
  });

  return unwrapData<ReviewItem>(res.data);
}

export async function deleteMyReview(reviewId: number | string): Promise<void> {
  await apiClient.delete(`/api/reviews/${reviewId}/my`);
}

export async function updateMyReview(
  reviewId: number | string,
  req: {
    rating: number;
    content?: string;
  }
): Promise<ReviewItem> {
  const res = await apiClient.put(`/api/reviews/${reviewId}/my`, {
    rating: req.rating,
    content: req.content,
  });

  return unwrapData<ReviewItem>(res.data);
}

/**
 * 업체 웹/앱에서 내 업체 리뷰를 볼 때 사용.
 */
export async function getMyCompanyReviews(): Promise<ReviewSummary> {
  const res = await apiClient.get("/api/reviews/company/me");
  return normalizeReviewSummary(res.data);
}

/**
 * 관리자 리뷰 목록 조회용.
 */
export async function getAdminReviews(companyId?: number | string): Promise<ReviewItem[]> {
  const res = await apiClient.get("/api/reviews/admin", {
    params: companyId ? { companyId } : undefined,
  });

  return unwrapData<ReviewItem[]>(res.data);
}

/**
 * 관리자 리뷰 삭제용.
 * 사용자가 직접 삭제하는 기능은 deleteMyReview()를 써야 함.
 */
export async function deleteAdminReview(reviewId: number | string): Promise<void> {
  await apiClient.delete(`/api/reviews/admin/${reviewId}`);
}