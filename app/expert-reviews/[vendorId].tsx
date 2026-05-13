import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, FontAwesome } from "@expo/vector-icons";

import { getExpertReviewSummary, getReviewApiErrorMessage, type ExpertReview, type ExpertReviewSummary } from "../../src/api/reviews";

const MAIN_BLUE = "#3b82f6";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function formatAvgRating(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) return "리뷰 없음";
  return value.toFixed(1);
}

export default function ExpertReviews() {
  const { vendorId, vendorName, companyId, kakaoPlaceId } = useLocalSearchParams<{
    vendorId?: string;
    vendorName?: string;
    companyId?: string;
    kakaoPlaceId?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ExpertReviewSummary>({ avgRating: 0, reviewCount: 0, reviews: [] });

  const reviews: ExpertReview[] = summary.reviews;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getExpertReviewSummary({
        companyId: companyId ?? (!kakaoPlaceId ? vendorId : undefined),
        kakaoPlaceId,
      });
      setSummary(data);
    } catch (error: any) {
      Alert.alert("리뷰 조회 실패", getReviewApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [companyId, kakaoPlaceId, vendorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>업체 리뷰</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{vendorName || "전문업체"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={MAIN_BLUE} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconBox}>
                <FontAwesome name="star" size={22} color="#f59e0b" />
              </View>
              <View>
                <Text style={styles.summaryTitle}>{formatAvgRating(summary.avgRating)}</Text>
                <Text style={styles.summaryDesc}>총 {summary.reviewCount}개의 리뷰</Text>
              </View>
            </View>

            {reviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <FontAwesome name="comment-o" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>아직 등록된 리뷰가 없습니다.</Text>
                <Text style={styles.emptyDesc}>수리 완료 후 히스토리에서 첫 리뷰를 작성할 수 있습니다.</Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View key={String(review.id)} style={styles.reviewCard}>
                  <View style={styles.reviewTopRow}>
                    <View style={styles.starRow}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FontAwesome
                          key={index}
                          name={index < review.rating ? "star" : "star-o"}
                          size={15}
                          color="#f59e0b"
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                  </View>
                  {review.content ? (
                    <Text style={styles.reviewContent}>{review.content}</Text>
                  ) : (
                    <Text style={styles.reviewContentMuted}>작성된 내용 없이 별점만 등록된 리뷰입니다.</Text>
                  )}
                  <Text style={styles.writerText}>{review.authorUsername || "사용자"}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  headerSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  scrollContent: { padding: 20, paddingBottom: 80 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 22, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "#dbeafe", flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#fffbeb", alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontSize: 22, fontWeight: "900", color: "#1e293b" },
  summaryDesc: { fontSize: 13, color: "#64748b", marginTop: 2, fontWeight: "600" },
  emptyBox: { backgroundColor: "#fff", borderRadius: 24, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#334155", marginTop: 6 },
  emptyDesc: { fontSize: 13, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
  reviewCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  reviewTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  starRow: { flexDirection: "row", gap: 3 },
  reviewDate: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  reviewContent: { fontSize: 14, color: "#334155", lineHeight: 22 },
  reviewContentMuted: { fontSize: 14, color: "#94a3b8", lineHeight: 22 },
  writerText: { marginTop: 12, fontSize: 12, color: "#94a3b8", fontWeight: "700" },
});
