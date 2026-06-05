import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
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

const MAIN_BLUE = "#3b82f6";

function cleanName(value?: string | string[]) {
  if (Array.isArray(value)) {
    value = value[0];
  }

  if (!value) return undefined;

  const text = String(value).trim();

  if (!text) return undefined;
  if (text === "undefined") return undefined;
  if (text === "null") return undefined;
  if (text === "전문업체") return undefined;
  if (text.startsWith("업체 #")) return undefined;

  return text;
}

function formatReviewDate(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  let date: Date | null = null;

  if (typeof value === "number") {
    const timestamp = value < 100000000000 ? value * 1000 : value;
    date = new Date(timestamp);
  } else {
    const text = String(value).trim();

    if (/^\d+(\.\d+)?$/.test(text)) {
      const numeric = Number(text);
      const timestamp = numeric < 100000000000 ? numeric * 1000 : numeric;
      date = new Date(timestamp);
    } else {
      date = new Date(text);
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function isSameUsername(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function StarRow({
                   rating,
                   size = 16,
                   onSelect,
                 }: {
  rating: number;
  size?: number;
  onSelect?: (r: number) => void;
}) {
  return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4, 5].map((s) => (
            <Pressable
                key={s}
                onPress={() => onSelect?.(s)}
                disabled={!onSelect}
                hitSlop={6}
            >
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
  const {
    vendorId,
    vendorName,
    companyId,
    companyName,
    kakaoPlaceId,
    kakaoPlaceName,
    kakaoPlacePhone,
    kakaoPlaceAddress,
    kakaoPlaceLat,
    kakaoPlaceLng,
    historyId,
    readOnly,
    from,
  } = useLocalSearchParams<{
    vendorId?: string;
    vendorName?: string;
    companyId?: string;
    companyName?: string;
    kakaoPlaceId?: string;
    kakaoPlaceName?: string;
    kakaoPlacePhone?: string;
    kakaoPlaceAddress?: string;
    kakaoPlaceLat?: string;
    kakaoPlaceLng?: string;
    historyId?: string;
    readOnly?: string;
    from?: string;
  }>();

  const isReadOnly = readOnly === "true" || from === "expert";

  const displayVendorName = useMemo(() => {
    return (
        cleanName(vendorName) ||
        cleanName(companyName) ||
        cleanName(kakaoPlaceName) ||
        "업체명 없음"
    );
  }, [vendorName, companyName, kakaoPlaceName]);

  const [me, setMe] = useState<Me | null>(null);
  const [stats, setStats] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<number | string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [content, setContent] = useState("");

  async function load() {
    try {
      setLoading(true);

      const [reviewData, meData] = await Promise.all([
        getReviews({
          companyId: companyId || undefined,
          kakaoPlaceId: kakaoPlaceId || undefined,
        }),
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
    console.log("review screen params", {
      vendorId,
      vendorName,
      companyId,
      companyName,
      kakaoPlaceId,
      kakaoPlaceName,
      historyId,
      displayVendorName,
    });

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, kakaoPlaceId, historyId]);

  function resetForm() {
    setShowForm(false);
    setEditingReviewId(null);
    setSelectedRating(0);
    setContent("");
  }

  function startCreateReview() {
    setEditingReviewId(null);
    setSelectedRating(0);
    setContent("");
    setShowForm(true);
  }

  function startEditReview(review: any) {
    setEditingReviewId(review.id);
    setSelectedRating(Number(review.rating || 0));
    setContent(review.content || "");
    setShowForm(true);
  }

  async function handleDeleteReview(reviewId: number | string) {
    Alert.alert("리뷰 삭제", "작성한 리뷰를 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingReviewId(reviewId);

            await deleteMyReview(reviewId);

            Alert.alert("삭제 완료", "작성한 리뷰가 삭제되었습니다.");
            if (String(editingReviewId) === String(reviewId)) {
              resetForm();
            }
            await load();
          } catch (e: any) {
            console.log("리뷰 삭제 실패:", {
              status: e?.response?.status,
              data: e?.response?.data,
              message: e?.message,
            });

            Alert.alert(
                "삭제 실패",
                e?.response?.data?.message ||
                "리뷰를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요."
            );
          } finally {
            setDeletingReviewId(null);
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (selectedRating === 0) {
      Alert.alert("별점을 선택해주세요");
      return;
    }

    try {
      setSubmitting(true);

      if (editingReviewId) {
        await updateMyReview(editingReviewId, {
          rating: selectedRating,
          content: content.trim() || undefined,
        });

        Alert.alert("수정 완료", "리뷰가 수정되었습니다.");
      } else {
        await createReview({
          historyId: historyId ? Number(historyId) : undefined,

          companyId: companyId ? Number(companyId) : undefined,
          kakaoPlaceId: kakaoPlaceId || undefined,
          kakaoPlaceName: kakaoPlaceId ? displayVendorName : undefined,
          kakaoPlacePhone: kakaoPlacePhone || undefined,
          kakaoPlaceAddress: kakaoPlaceAddress || undefined,
          kakaoPlaceLat: kakaoPlaceLat ? Number(kakaoPlaceLat) : undefined,
          kakaoPlaceLng: kakaoPlaceLng ? Number(kakaoPlaceLng) : undefined,
          rating: selectedRating,
          content: content.trim() || undefined,
        });

        Alert.alert("등록 완료", "리뷰가 등록되었습니다.");
      }

      resetForm();
      await load();
    } catch (e: any) {
      console.log(editingReviewId ? "리뷰 수정 실패:" : "리뷰 등록 실패:", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });

      Alert.alert(
          editingReviewId ? "수정 실패" : "등록 실패",
          e?.response?.data?.message || "다시 시도해주세요."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = stats?.avgRating ?? 0;
  const reviewCount = stats?.reviewCount ?? 0;
  const reviews = stats?.reviews ?? [];

  const myReviewForHistory = historyId
      ? reviews.find((r) => String(r.historyId) === String(historyId))
      : undefined;

  const canWriteReview = !isReadOnly && Boolean(historyId) && !myReviewForHistory;
  const canManageMyReview = !isReadOnly && Boolean(myReviewForHistory);

  return (
      <SafeAreaView edges={["top"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
          </Pressable>

          <Text style={styles.headerTitle} numberOfLines={1}>
            리뷰
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.vendorName}>{displayVendorName}</Text>

            <View style={styles.summaryRow}>
              <StarRow rating={Math.round(avgRating)} size={22} />
              <Text style={styles.avgText}>
                {avgRating > 0 ? avgRating.toFixed(1) : "-"}
              </Text>
            </View>

            <Text style={styles.reviewCountText}>리뷰 {reviewCount}개</Text>
          </View>

          {isReadOnly ? (
              <View style={styles.readOnlyNotice}>
                <Feather name="info" size={16} color="#64748b" />
                <Text style={styles.readOnlyNoticeText}>
                  전문가 목록에서는 리뷰 조회만 가능합니다.
                </Text>
              </View>
          ) : showForm ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {editingReviewId ? "내 리뷰 수정" : "리뷰 작성"}
                </Text>

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
                  <Pressable
                      style={styles.cancelBtn}
                      onPress={resetForm}
                  >
                    <Text style={styles.cancelBtnText}>취소</Text>
                  </Pressable>

                  <Pressable
                      style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                      onPress={handleSubmit}
                      disabled={submitting}
                  >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.submitBtnText}>
                          {editingReviewId ? "수정 완료" : "등록"}
                        </Text>
                    )}
                  </Pressable>
                </View>
              </View>
          ) : canWriteReview ? (
              <Pressable style={styles.writeBtn} onPress={startCreateReview}>
                <Feather name="edit-2" size={16} color="#fff" />
                <Text style={styles.writeBtnText}>리뷰 작성하기</Text>
              </Pressable>
          ) : canManageMyReview ? (
              <View style={styles.myReviewManageNotice}>
                <Feather name="check-circle" size={17} color={MAIN_BLUE} />
                <Text style={styles.myReviewManageText}>
                  이미 작성한 리뷰가 있습니다.{"\n"}아래의 내 리뷰에서 수정하거나 삭제할 수 있습니다.
                </Text>
              </View>
          ) : (
              <View style={styles.readOnlyNotice}>
                <Feather name="lock" size={16} color="#64748b" />
                <Text style={styles.readOnlyNoticeText}>
                  히스토리에서 연결된 업체만 리뷰를 작성할 수 있습니다.
                </Text>
              </View>
          )}

          {loading ? (
              <View style={styles.emptyBox}>
                <ActivityIndicator color={MAIN_BLUE} />
              </View>
          ) : reviews.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="message-circle" size={40} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  {isReadOnly
                      ? "아직 등록된 리뷰가 없어요"
                      : "아직 리뷰가 없어요\n첫 리뷰를 남겨보세요!"}
                </Text>
              </View>
          ) : (
              reviews.map((r) => {
                const isMyReview = isSameUsername(r.authorUsername, me?.username);
                const deleting = deletingReviewId === r.id;

                return (
                    <View key={r.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarText}>
                            {r.authorUsername?.charAt(0)?.toUpperCase() ?? "?"}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.usernameRow}>
                            <Text style={styles.reviewUsername} numberOfLines={1}>
                              {r.authorUsername}
                            </Text>

                            {isMyReview ? (
                                <View style={styles.myReviewBadge}>
                                  <Text style={styles.myReviewBadgeText}>내 리뷰</Text>
                                </View>
                            ) : null}
                          </View>

                          <StarRow rating={r.rating} size={13} />
                        </View>

                        <Text style={styles.reviewDate}>
                          {formatReviewDate((r as any).createdAt)}
                        </Text>
                      </View>

                      {r.content ? (
                          <Text style={styles.reviewContent}>{r.content}</Text>
                      ) : null}

                      {isMyReview && !isReadOnly ? (
                          <View style={styles.myReviewActionRow}>
                            <Pressable
                                onPress={() => startEditReview(r)}
                                disabled={deleting || submitting}
                                style={styles.editReviewButton}
                            >
                              <Feather name="edit-3" size={14} color={MAIN_BLUE} />
                              <Text style={styles.editReviewText}>수정</Text>
                            </Pressable>

                            <Pressable
                                onPress={() => handleDeleteReview(r.id)}
                                disabled={deleting}
                                style={[styles.deleteReviewButton, deleting && { opacity: 0.6 }]}
                            >
                              {deleting ? (
                                  <ActivityIndicator size="small" color="#dc2626" />
                              ) : (
                                  <>
                                    <Feather name="trash-2" size={14} color="#dc2626" />
                                    <Text style={styles.deleteReviewText}>삭제</Text>
                                  </>
                              )}
                            </Pressable>
                          </View>
                      ) : null}
                    </View>
                );
              })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 14,
    backgroundColor: "#fff",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 16 },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    gap: 8,
  },

  vendorName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avgText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#f59e0b",
  },

  reviewCountText: {
    fontSize: 14,
    color: "#64748b",
  },

  readOnlyNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
  },

  readOnlyNoticeText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },

  writeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: MAIN_BLUE,
    borderRadius: 16,
    height: 52,
  },

  writeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },

  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
  },

  formTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },

  starSelect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  formLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },

  textInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 100,
    textAlignVertical: "top",
  },

  charCount: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: -8,
  },

  formBtnRow: {
    flexDirection: "row",
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: MAIN_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  emptyBox: {
    padding: 60,
    alignItems: "center",
    gap: 12,
  },

  emptyText: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
  },

  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    gap: 10,
  },

  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MAIN_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },

  reviewUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    maxWidth: 130,
  },

  myReviewBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  myReviewBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: MAIN_BLUE,
  },

  reviewDate: {
    fontSize: 12,
    color: "#94a3b8",
  },

  reviewContent: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },

  myReviewManageNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  myReviewManageText: {
    flex: 1,
    color: "#1e40af",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },

  myReviewActionRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },

  editReviewButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  editReviewText: {
    fontSize: 12,
    fontWeight: "800",
    color: MAIN_BLUE,
  },

  deleteReviewButton: {
    marginTop: 4,
    alignSelf: "flex-end",
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  deleteReviewText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
  },
});
