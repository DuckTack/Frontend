import { apiClient } from "./apiClient";

export type ReviewItem = {
  id: number;
  authorUsername: string;
  rating: number;
  content: string;
  createdAt: string;
};

export type ReviewSummary = {
  avgRating: number;
  reviewCount: number;
  reviews: ReviewItem[];
};

export type CreateReviewRequest = {
  companyId?: number;
  kakaoPlaceId?: string;
  kakaoPlaceName?: string;
  kakaoPlacePhone?: string;
  kakaoPlaceAddress?: string;
  kakaoPlaceLat?: number;
  kakaoPlaceLng?: number;
  historyId?: number;
  rating: number;
  content?: string;
};

export async function getReviews(params: {
  companyId?: string | number;
  kakaoPlaceId?: string;
}): Promise<ReviewSummary> {
  const res = await apiClient.get("/api/reviews", { params });
  const body = res.data?.data ?? res.data;
  return {
    avgRating: body?.avgRating ?? 0,
    reviewCount: body?.reviewCount ?? 0,
    reviews: Array.isArray(body?.reviews) ? body.reviews : [],
  };
}

export async function createReview(req: CreateReviewRequest): Promise<ReviewItem> {
  const res = await apiClient.post("/api/reviews", req);
  return res.data?.data ?? res.data;
}
