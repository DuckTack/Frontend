import { useEffect, useState } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet, Platform,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { getReviews, createReview, ReviewSummary } from "../../src/api/reviews";

const MAIN_BLUE = "#3b82f6";

function StarRow({ rating, size = 16, onSelect }: { rating: number; size?: number; onSelect?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable key={s} onPress={() => onSelect?.(s)} disabled={!onSelect} hitSlop={6}>
          <FontAwesome
            name={s <= rating ? "star" : "star-o"}
            size={size}
            color={s <= rating ? "#f59e0b" : "#cbd5e1"}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function ExpertReviews() {
  const { vendorId, vendorName, companyId, kakaoPlaceId, kakaoPlacePhone, kakaoPlaceAddress, kakaoPlaceLat, kakaoPlaceLng } = useLocalSearchParams<{
    vendorId?: string;
    vendorName?: string;
    companyId?: string;
    kakaoPlaceId?: string;
    kakaoPlacePhone?: string;
    kakaoPlaceAddress?: string;
    kakaoPlaceLat?: string;
    kakaoPlaceLng?: string;
  }>();

  const [stats, setStats] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 작성 폼
  const [showForm, setShowForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [content, setContent] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await getReviews({
        companyId: companyId || undefined,
        kakaoPlaceId: kakaoPlaceId || undefined,
      });
      setStats(data);
    } catch {
      setStats({ avgRating: 0, reviewCount: 0, reviews: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [companyId, kakaoPlaceId]);

  async function handleSubmit() {
    if (selectedRating === 0) {
      Alert.alert("별점을 선택해주세요");
      return;
    }
    try {
      setSubmitting(true);
      await createReview({
        companyId: companyId ? Number(companyId) : undefined,
        kakaoPlaceId: kakaoPlaceId || undefined,
        kakaoPlaceName: kakaoPlaceId ? (vendorName || undefined) : undefined,
        kakaoPlacePhone: kakaoPlacePhone || undefined,
        kakaoPlaceAddress: kakaoPlaceAddress || undefined,
        kakaoPlaceLat: kakaoPlaceLat ? Number(kakaoPlaceLat) : undefined,
        kakaoPlaceLng: kakaoPlaceLng ? Number(kakaoPlaceLng) : undefined,
        rating: selectedRating,
        content: content.trim() || undefined,
      });
      Alert.alert("리뷰가 등록되었습니다 🎉");
      setShowForm(false);
      setSelectedRating(0);
      setContent("");
      load();
    } catch (e: any) {
      Alert.alert("등록 실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = stats?.avgRating ?? 0;
  const reviewCount = stats?.reviewCount ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>리뷰</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 업체명 + 별점 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.vendorName}>{vendorName || "업체"}</Text>
          <View style={styles.summaryRow}>
            <StarRow rating={Math.round(avgRating)} size={22} />
            <Text style={styles.avgText}>{avgRating > 0 ? avgRating.toFixed(1) : "-"}</Text>
          </View>
          <Text style={styles.reviewCountText}>리뷰 {reviewCount}개</Text>
        </View>

        {/* 리뷰 작성 버튼 */}
        {!showForm ? (
          <Pressable style={styles.writeBtn} onPress={() => setShowForm(true)}>
            <Feather name="edit-2" size={16} color="#fff" />
            <Text style={styles.writeBtnText}>리뷰 작성하기</Text>
          </Pressable>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>리뷰 작성</Text>
            <View style={styles.starSelect}>
              <Text style={styles.formLabel}>별점</Text>
              <StarRow rating={selectedRating} size={28} onSelect={setSelectedRating} />
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="경험을 공유해주세요 (선택)"
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
              value={content}
              onChangeText={setContent}
            />
            <Text style={styles.charCount}>{content.length}/500</Text>
            <View style={styles.formBtnRow}>
              <Pressable style={styles.cancelBtn} onPress={() => { setShowForm(false); setSelectedRating(0); setContent(""); }}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </Pressable>
              <Pressable style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitBtnText}>등록</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* 리뷰 목록 */}
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color={MAIN_BLUE} />
          </View>
        ) : stats?.reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="message-circle" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>아직 리뷰가 없어요{"\n"}첫 리뷰를 남겨보세요!</Text>
          </View>
        ) : (
          stats?.reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{r.authorUsername?.charAt(0)?.toUpperCase() ?? "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewUsername}>{r.authorUsername}</Text>
                  <StarRow rating={r.rating} size={13} />
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                </Text>
              </View>
              {r.content ? (
                <Text style={styles.reviewContent}>{r.content}</Text>
              ) : null}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16, backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", flex: 1, textAlign: "center" },
  backBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: "#f8fafc",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f1f5f9",
  },
  scroll: { padding: 20, gap: 16 },

  summaryCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center", gap: 8,
  },
  vendorName: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avgText: { fontSize: 28, fontWeight: "900", color: "#f59e0b" },
  reviewCountText: { fontSize: 14, color: "#64748b" },

  writeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: MAIN_BLUE, borderRadius: 16, height: 52,
  },
  writeBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  formCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: "#e2e8f0", gap: 14,
  },
  formTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  starSelect: { flexDirection: "row", alignItems: "center", gap: 12 },
  formLabel: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  textInput: {
    borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12,
    padding: 14, fontSize: 14, color: "#1e293b", minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: { fontSize: 12, color: "#94a3b8", textAlign: "right", marginTop: -8 },
  formBtnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  submitBtn: {
    flex: 2, height: 48, borderRadius: 12, backgroundColor: MAIN_BLUE,
    alignItems: "center", justifyContent: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  emptyBox: { padding: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15, color: "#94a3b8", textAlign: "center", lineHeight: 22 },

  reviewCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#f1f5f9", gap: 10,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: MAIN_BLUE,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  reviewUsername: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 3 },
  reviewDate: { fontSize: 12, color: "#94a3b8" },
  reviewContent: { fontSize: 14, color: "#475569", lineHeight: 20 },
});
