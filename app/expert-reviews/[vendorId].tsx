import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, FontAwesome } from "@expo/vector-icons";

import {
  getReviews,
  createReview,
  deleteMyReview,
  updateMyReview,
  ReviewSummary,
} from "../../src/api/reviews";
import { getMe, Me } from "../../src/api/users";

const C = {
  primary:    "#4F46E5",
  primaryBg:  "#EDEDFF",
  primaryDim: "#C7D2FE",
  text:       "#0F172A",
  sub:        "#64748B",
  border:     "#E2E8F0",
  bg:         "#F8FAFC",
  card:       "#FFFFFF",
};

// ─── 헬퍼 ───────────────────────────────────────────
function cleanName(value?: string | string[]) {
  if (Array.isArray(value)) value = value[0];
  if (!value) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text === "undefined" || text === "null") return undefined;
  if (text === "전문업체" || text.startsWith("업체 #")) return undefined;
  return text;
}

function formatReviewDate(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  let date: Date | null = null;
  if (typeof value === "number") {
    date = new Date(value < 100000000000 ? value * 1000 : value);
  } else {
    const text = String(value).trim();
    date = /^\d+(\.\d+)?$/.test(text)
      ? new Date(Number(text) < 100000000000 ? Number(text) * 1000 : Number(text))
      : new Date(text);
  }
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function isSameUsername(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// ─── 별점 컴포넌트 ───────────────────────────────────
function StarRow({ rating, size = 16, onSelect, color = "#F59E0B" }: {
  rating: number; size?: number; onSelect?: (r: number) => void; color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable key={s} onPress={() => onSelect?.(s)} disabled={!onSelect} hitSlop={6}>
          <FontAwesome name={s <= rating ? "star" : "star-o"} size={size} color={s <= rating ? color : "#D1D5DB"} />
        </Pressable>
      ))}
    </View>
  );
}

// ════════════════════════════════════════════════════
export default function ExpertReviews() {
  const {
    vendorId, vendorName, companyId, companyName,
    kakaoPlaceId, kakaoPlaceName, kakaoPlacePhone,
    kakaoPlaceAddress, kakaoPlaceLat, kakaoPlaceLng,
    historyId, readOnly, from,
  } = useLocalSearchParams<{
    vendorId?: string; vendorName?: string; companyId?: string; companyName?: string;
    kakaoPlaceId?: string; kakaoPlaceName?: string; kakaoPlacePhone?: string;
    kakaoPlaceAddress?: string; kakaoPlaceLat?: string; kakaoPlaceLng?: string;
    historyId?: string; readOnly?: string; from?: string;
  }>();

  const isReadOnly = readOnly === "true" || from === "expert";

  const displayVendorName = useMemo(() =>
    cleanName(vendorName) || cleanName(companyName) || cleanName(kakaoPlaceName) || "업체명 없음",
    [vendorName, companyName, kakaoPlaceName]
  );

  const [me,             setMe]             = useState<Me | null>(null);
  const [stats,          setStats]          = useState<ReviewSummary | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]     = useState(false);
  const [deletingId,     setDeletingId]     = useState<number | string | null>(null);
  const [editingId,      setEditingId]      = useState<number | string | null>(null);
  const [showForm,       setShowForm]       = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [content,        setContent]        = useState("");

  async function load() {
    try {
      setLoading(true);
      const [reviewData, meData] = await Promise.all([
        getReviews({ companyId: companyId || undefined, kakaoPlaceId: kakaoPlaceId || undefined }),
        getMe().catch(() => null),
      ]);
      setStats(reviewData);
      setMe(meData);
    } catch (e) {
      console.log("리뷰 조회 실패:", e);
      setStats({ avgRating: 0, reviewCount: 0, reviews: [] });
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log("review screen params", { vendorId, vendorName, companyId, companyName, kakaoPlaceId, kakaoPlaceName, historyId, displayVendorName });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, kakaoPlaceId, historyId]);

  function resetForm() { setShowForm(false); setEditingId(null); setSelectedRating(0); setContent(""); }
  function startCreate() { setEditingId(null); setSelectedRating(0); setContent(""); setShowForm(true); }
  function startEdit(review: any) { setEditingId(review.id); setSelectedRating(Number(review.rating || 0)); setContent(review.content || ""); setShowForm(true); }

  async function handleDelete(reviewId: number | string) {
    Alert.alert("리뷰 삭제", "작성한 리뷰를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제", style: "destructive",
        onPress: async () => {
          try {
            setDeletingId(reviewId);
            await deleteMyReview(reviewId);
            Alert.alert("삭제 완료", "작성한 리뷰가 삭제되었습니다.");
            if (String(editingId) === String(reviewId)) resetForm();
            await load();
          } catch (e: any) {
            console.log("리뷰 삭제 실패:", { status: e?.response?.status, data: e?.response?.data, message: e?.message });
            Alert.alert("삭제 실패", e?.response?.data?.message || "리뷰를 삭제하지 못했습니다.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (selectedRating === 0) { Alert.alert("별점을 선택해주세요"); return; }
    try {
      setSubmitting(true);
      if (editingId) {
        await updateMyReview(editingId, { rating: selectedRating, content: content.trim() || undefined });
        Alert.alert("수정 완료", "리뷰가 수정되었습니다.");
      } else {
        await createReview({
          historyId:        historyId ? Number(historyId) : undefined,
          companyId:        companyId ? Number(companyId) : undefined,
          kakaoPlaceId:     kakaoPlaceId || undefined,
          kakaoPlaceName:   kakaoPlaceId ? displayVendorName : undefined,
          kakaoPlacePhone:  kakaoPlacePhone || undefined,
          kakaoPlaceAddress:kakaoPlaceAddress || undefined,
          kakaoPlaceLat:    kakaoPlaceLat ? Number(kakaoPlaceLat) : undefined,
          kakaoPlaceLng:    kakaoPlaceLng ? Number(kakaoPlaceLng) : undefined,
          rating:           selectedRating,
          content:          content.trim() || undefined,
        });
        Alert.alert("등록 완료", "리뷰가 등록되었습니다.");
      }
      resetForm();
      await load();
    } catch (e: any) {
      console.log(editingId ? "리뷰 수정 실패:" : "리뷰 등록 실패:", { status: e?.response?.status, data: e?.response?.data, message: e?.message });
      Alert.alert(editingId ? "수정 실패" : "등록 실패", e?.response?.data?.message || "다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating  = stats?.avgRating  ?? 0;
  const reviewCount= stats?.reviewCount?? 0;
  const reviews    = stats?.reviews    ?? [];

  const myReviewForHistory = historyId
    ? reviews.find((r) => String(r.historyId) === String(historyId))
    : undefined;

  const canWriteReview    = !isReadOnly && Boolean(historyId) && !myReviewForHistory;
  const canManageMyReview = !isReadOnly && Boolean(myReviewForHistory);

  // ── 렌더 ──────────────────────────────────────────
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={C.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>리뷰</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 요약 카드 ── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVendorName}>{displayVendorName}</Text>
          <View style={styles.summaryRatingRow}>
            <Text style={styles.summaryScore}>
              {avgRating > 0 ? avgRating.toFixed(1) : "-"}
            </Text>
            <View style={styles.summaryStarCol}>
              <StarRow rating={Math.round(avgRating)} size={20} />
              <Text style={styles.summaryCountText}>리뷰 {reviewCount}개</Text>
            </View>
          </View>
        </View>

        {/* ── 리뷰 작성/관리 영역 ── */}
        {isReadOnly ? (
          <View style={styles.noticeRow}>
            <Feather name="info" size={14} color={C.sub} />
            <Text style={styles.noticeText}>전문가 목록에서는 리뷰 조회만 가능합니다.</Text>
          </View>
        ) : showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? "내 리뷰 수정" : "리뷰 작성"}</Text>

            {/* 별점 */}
            <View style={styles.starSelectRow}>
              <Text style={styles.formLabel}>별점</Text>
              <StarRow rating={selectedRating} size={30} onSelect={setSelectedRating} />
            </View>

            <TextInput
              style={styles.formTextInput}
              placeholder="이 업체를 이용한 경험을 공유해주세요 (선택)"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              value={content}
              onChangeText={setContent}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{content.length} / 500</Text>

            <View style={styles.formBtnRow}>
              <Pressable style={styles.formCancelBtn} onPress={resetForm}>
                <Text style={styles.formCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.formSubmitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.formSubmitText}>{editingId ? "수정 완료" : "등록하기"}</Text>
                }
              </Pressable>
            </View>
          </View>
        ) : canWriteReview ? (
          <Pressable style={styles.writeBtn} onPress={startCreate}>
            <Feather name="edit-2" size={15} color="#fff" />
            <Text style={styles.writeBtnText}>이 업체 리뷰 작성하기</Text>
          </Pressable>
        ) : canManageMyReview ? (
          <View style={styles.myReviewNotice}>
            <Feather name="check-circle" size={16} color={C.primary} />
            <Text style={styles.myReviewNoticeText}>
              이미 작성한 리뷰가 있습니다.{"\n"}아래 내 리뷰에서 수정하거나 삭제할 수 있습니다.
            </Text>
          </View>
        ) : (
          <View style={styles.noticeRow}>
            <Feather name="lock" size={14} color={C.sub} />
            <Text style={styles.noticeText}>히스토리에서 연결된 업체만 리뷰를 작성할 수 있습니다.</Text>
          </View>
        )}

        {/* ── 리뷰 목록 ── */}
        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color={C.primary} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="message-square" size={40} color="#E2E8F0" />
            <Text style={styles.emptyText}>
              {isReadOnly ? "아직 등록된 리뷰가 없어요" : "첫 번째 리뷰를 남겨보세요!"}
            </Text>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {reviews.map((r) => {
              const isMyReview = isSameUsername(r.authorUsername, me?.username);
              const deleting   = deletingId === r.id;
              return (
                <View key={r.id} style={[styles.reviewCard, isMyReview && styles.reviewCardMine]}>
                  {/* 헤더 */}
                  <View style={styles.reviewHeader}>
                    <View style={[styles.avatar, isMyReview && styles.avatarMine]}>
                      <Text style={styles.avatarText}>
                        {r.authorUsername?.charAt(0)?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.reviewUsernameRow}>
                        <Text style={styles.reviewUsername} numberOfLines={1}>
                          {r.authorUsername}
                        </Text>
                        {isMyReview && (
                          <View style={styles.myBadge}>
                            <Text style={styles.myBadgeText}>내 리뷰</Text>
                          </View>
                        )}
                      </View>
                      <StarRow rating={r.rating} size={12} />
                    </View>
                    <Text style={styles.reviewDate}>{formatReviewDate((r as any).createdAt)}</Text>
                  </View>

                  {/* 내용 */}
                  {r.content ? (
                    <Text style={styles.reviewContent}>{r.content}</Text>
                  ) : null}

                  {/* 내 리뷰 관리 버튼 */}
                  {isMyReview && !isReadOnly && (
                    <View style={styles.myReviewActions}>
                      <Pressable
                        onPress={() => startEdit(r)}
                        disabled={deleting || submitting}
                        style={styles.editBtn}
                      >
                        <Feather name="edit-3" size={13} color={C.primary} />
                        <Text style={styles.editBtnText}>수정</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(r.id)}
                        disabled={deleting}
                        style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
                      >
                        {deleting
                          ? <ActivityIndicator size="small" color="#DC2626" />
                          : <>
                              <Feather name="trash-2" size={13} color="#DC2626" />
                              <Text style={styles.deleteBtnText}>삭제</Text>
                            </>
                        }
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text, flex: 1, textAlign: "center" },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },

  // ── 요약 ──
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryVendorName: { fontSize: 19, fontWeight: "900", color: C.text, marginBottom: 14, letterSpacing: -0.3 },
  summaryRatingRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  summaryScore: { fontSize: 48, fontWeight: "900", color: "#F59E0B", lineHeight: 54 },
  summaryStarCol: { gap: 6 },
  summaryCountText: { fontSize: 13, color: C.sub, fontWeight: "600" },

  // ── 알림/안내 ──
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  noticeText: { flex: 1, fontSize: 13, color: C.sub, fontWeight: "600", lineHeight: 19 },

  myReviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: C.primaryBg,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.primaryDim,
  },
  myReviewNoticeText: { flex: 1, fontSize: 13, color: "#3730A3", fontWeight: "600", lineHeight: 20 },

  // ── 작성 버튼 ──
  writeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 16,
    height: 52,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  writeBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // ── 작성 폼 ──
  formCard: {
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    gap: 16,
  },
  formTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  formLabel: { fontSize: 13, color: C.sub, fontWeight: "700", marginRight: 14 },
  starSelectRow: { flexDirection: "row", alignItems: "center" },
  formTextInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: C.text,
    minHeight: 110,
    lineHeight: 21,
  },
  charCount: { fontSize: 12, color: "#94A3B8", textAlign: "right", marginTop: -8 },
  formBtnRow: { flexDirection: "row", gap: 10 },
  formCancelBtn: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  formCancelText: { fontSize: 14, fontWeight: "700", color: C.sub },
  formSubmitBtn: {
    flex: 2, height: 48, borderRadius: 14,
    backgroundColor: C.primary, alignItems: "center", justifyContent: "center",
  },
  formSubmitText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // ── 리뷰 목록 ──
  reviewList: { gap: 12 },
  reviewCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  reviewCardMine: { borderColor: C.primaryDim, borderWidth: 1.5 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center",
  },
  avatarMine: { backgroundColor: C.primaryBg },
  avatarText: { fontWeight: "800", fontSize: 15, color: C.sub },
  reviewUsernameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  reviewUsername: { fontSize: 14, fontWeight: "700", color: C.text, maxWidth: 130 },
  myBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryDim,
  },
  myBadgeText: { fontSize: 10, fontWeight: "800", color: C.primary },
  reviewDate: { fontSize: 12, color: "#94A3B8", marginLeft: "auto" },
  reviewContent: { fontSize: 14, color: "#475569", lineHeight: 21 },
  myReviewActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryDim,
  },
  editBtnText: { fontSize: 12, fontWeight: "800", color: C.primary },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
  },
  deleteBtnText: { fontSize: 12, fontWeight: "800", color: "#DC2626" },

  // ── 빈 상태 ──
  emptyBox: { paddingVertical: 60, alignItems: "center", gap: 14 },
  emptyText: { fontSize: 15, color: "#94A3B8", textAlign: "center", lineHeight: 22 },
});
