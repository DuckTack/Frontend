import { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";

import {
  listHistories,
  deleteHistory,
  HistorySummary,
  IssueType,
} from "../src/api/histories";
import {
  getReportStatusMapForHistoryIds,
  ReportStatus,
} from "../src/api/reports";

const MAIN_BLUE = "#3b82f6";
const HEADER_BG = "#fff";

function cleanName(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  const text = String(value).trim();

  if (!text) return undefined;
  if (text === "undefined") return undefined;
  if (text === "null") return undefined;
  if (text === "전문업체") return undefined;
  if (text.startsWith("업체 #")) return undefined;

  return text;
}

export default function Histories() {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportStatus, setReportStatus] = useState<Record<string, ReportStatus>>({});
  const [selectedFilter, setSelectedFilter] = useState("전체");

  function getHistoryId(h: HistorySummary): string {
    const raw: any = (h as any).historyId ?? (h as any).id ?? (h as any).diagnosisId;
    return String(raw ?? "");
  }

  function getReviewCompanyId(item: HistorySummary): string | undefined {
    const raw = item.companyId ?? item.expertVendorId;
    if (raw === null || raw === undefined || raw === "") return undefined;
    return String(raw);
  }

  function getReviewKakaoPlaceId(item: HistorySummary): string | undefined {
    const raw = item.kakaoPlaceId;
    if (raw === null || raw === undefined || raw === "") return undefined;
    return String(raw);
  }

  function getReviewVendorName(item: HistorySummary): string | undefined {
    const anyItem: any = item;

    return (
        cleanName(anyItem.expertVendorName) ||
        cleanName(anyItem.companyName) ||
        cleanName(anyItem.vendorName) ||
        cleanName(anyItem.kakaoPlaceName)
    );
  }

  function isReportReady(item: HistorySummary): boolean {
    const historyId = getHistoryId(item);
    return reportStatus[historyId] === "READY";
  }

  function canWriteReview(item: HistorySummary): boolean {
    const hasCompany = Boolean(getReviewCompanyId(item) || getReviewKakaoPlaceId(item));
    return hasCompany && isReportReady(item);
  }

  async function fetchList() {
    try {
      setLoading(true);

      const data = await listHistories();
      setItems(data || []);

      const ids = (data || []).map((d) => getHistoryId(d)).filter(Boolean);

      if (ids.length > 0) {
        const map = await getReportStatusMapForHistoryIds(ids);
        setReportStatus(map);
      } else {
        setReportStatus({});
      }
    } catch {
      Alert.alert("불러오기 실패", "서버 상태를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
      useCallback(() => {
        fetchList();
      }, [])
  );

  function deleteItem(id: string) {
    Alert.alert("삭제", "이 진단 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            setItems((prev) => prev.filter((it) => getHistoryId(it) !== id));
            await deleteHistory(id);
          } catch {
            Alert.alert("삭제 실패", "다시 시도해주세요.");
            fetchList();
          }
        },
      },
    ]);
  }

  function handleReviewPress(item: HistorySummary) {
    const historyId = getHistoryId(item);
    const companyId = getReviewCompanyId(item);
    const kakaoPlaceId = getReviewKakaoPlaceId(item);
    const vendorDisplayName = getReviewVendorName(item);

    if (!isReportReady(item)) {
      Alert.alert("리뷰 작성 불가", "리포트 완료 후 리뷰 작성이 가능합니다.");
      return;
    }

    if (!companyId && !kakaoPlaceId) {
      Alert.alert("리뷰 작성 불가", "연결된 업체가 있는 기록에서만 리뷰를 작성할 수 있습니다.");
      return;
    }

    if (!vendorDisplayName) {
      Alert.alert(
          "업체명 확인 필요",
          "연결된 업체 ID는 있지만 업체명이 내려오지 않았습니다. 백엔드 HistoryService에서 expertVendorName을 확인해주세요."
      );
    }

    const reviewVendorId = companyId ?? kakaoPlaceId ?? historyId;

    router.push({
      pathname: "/expert-reviews/[vendorId]",
      params: {
        vendorId: reviewVendorId,
        historyId,

        companyId,
        companyName: vendorDisplayName,
        vendorName: vendorDisplayName,

        kakaoPlaceId,
        kakaoPlaceName: vendorDisplayName,
        kakaoPlacePhone: (item as any).kakaoPlacePhone,
        kakaoPlaceAddress: (item as any).kakaoPlaceAddress,
        kakaoPlaceLat:
            (item as any).kakaoPlaceLat != null
                ? String((item as any).kakaoPlaceLat)
                : undefined,
        kakaoPlaceLng:
            (item as any).kakaoPlaceLng != null
                ? String((item as any).kakaoPlaceLng)
                : undefined,

        readOnly: "false",
        from: "history",
      },
    } as any);
  }

  const issueLabel = (t?: string | null) => {
    switch (String(t || "").toUpperCase()) {
      case "CRACK":
        return "균열";
      case "LEAK":
        return "누수";
      case "MOLD":
        return "곰팡이";
      case "PEEL":
        return "벗겨짐";
      case "CORROSION":
        return "부식";
      case "BULGE":
        return "들뜸";
      case "DAMAGE":
        return "파손";
      case "ELECTRIC":
        return "전기";
      case "GAS":
        return "가스";
      default:
        return "기타";
    }
  };

  const getIssueIcon = (t?: string | null) => {
    switch (String(t || "").toUpperCase()) {
      case "LEAK":
        return { emoji: "💧", color: "#eff6ff" };
      case "CRACK":
        return { emoji: "🧱", color: "#f5f3ff" };
      case "MOLD":
        return { emoji: "🦠", color: "#f0fdf4" };
      case "PEEL":
        return { emoji: "🎨", color: "#fff7ed" };
      case "CORROSION":
        return { emoji: "🛠️", color: "#fef3c7" };
      case "BULGE":
        return { emoji: "🧩", color: "#f0f9ff" };
      case "DAMAGE":
        return { emoji: "🔧", color: "#fff7ed" };
      case "ELECTRIC":
        return { emoji: "⚡", color: "#fefce8" };
      case "GAS":
        return { emoji: "🔥", color: "#fff1f2" };
      default:
        return { emoji: "🏠", color: "#f8fafc" };
    }
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (selectedFilter !== "전체") {
      result = result.filter((it) => issueLabel(it.issueType) === selectedFilter);
    }

    return result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [items, selectedFilter]);

  return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>진단 히스토리</Text>
          <Text style={styles.headerSub}>우리 집 안전 기록을 한눈에 확인하세요</Text>
        </View>

        <View style={styles.filterWrapper}>
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
          >
            {["전체", "균열", "누수", "곰팡이", "벗겨짐", "부식", "들뜸", "파손", "전기", "가스", "기타"].map(
                (filter) => (
                    <Pressable
                        key={filter}
                        onPress={() => setSelectedFilter(filter)}
                        style={[
                          styles.filterBadge,
                          selectedFilter === filter && styles.filterBadgeActive,
                        ]}
                    >
                      <Text
                          style={[
                            styles.filterText,
                            selectedFilter === filter && styles.filterTextActive,
                          ]}
                      >
                        {filter}
                      </Text>
                    </Pressable>
                )
            )}
          </ScrollView>
        </View>

        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.listContainer}>
            {loading && items.length === 0 ? (
                <ActivityIndicator size="large" color={MAIN_BLUE} style={{ marginTop: 40 }} />
            ) : filteredItems.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                      name="document-text-outline"
                      size={48}
                      color="#e2e8f0"
                      style={{ marginBottom: 12 }}
                  />
                  <Text style={styles.emptyText}>해당하는 진단 기록이 없습니다.</Text>
                </View>
            ) : (
                filteredItems.map((it) => {
                  const id = getHistoryId(it);
                  const status = reportStatus[id];
                  const iconData = getIssueIcon(it.issueType);
                  const isHighRisk = it.riskScore > 70;
                  const isLowRisk = it.riskScore < 30;
                  const reviewAvailable = canWriteReview(it);
                  const vendorDisplayName = getReviewVendorName(it);

                  console.log("history review debug", {
                    id,
                    status,
                    companyId: it.companyId,
                    expertVendorId: it.expertVendorId,
                    kakaoPlaceId: it.kakaoPlaceId,
                    expertVendorName: (it as any).expertVendorName,
                    companyName: (it as any).companyName,
                    kakaoPlaceName: (it as any).kakaoPlaceName,
                    resolvedVendorName: vendorDisplayName,
                  });

                  return (
                      <View key={id} style={styles.historyCard}>
                        <Pressable
                            style={styles.cardMain}
                            onPress={() =>
                                router.push({
                                  pathname: "/result",
                                  params: { historyId: id },
                                })
                            }
                        >
                          <View style={[styles.iconBox, { backgroundColor: iconData.color }]}>
                            <Text style={{ fontSize: 26 }}>{iconData.emoji}</Text>
                          </View>

                          <View style={styles.cardContent}>
                            <View style={styles.cardHeaderRow}>
                              <Text style={styles.cardTypeText}>{issueLabel(it.issueType)}</Text>

                              <View
                                  style={[
                                    styles.severityBadge,
                                    {
                                      backgroundColor: isHighRisk
                                          ? "#fef2f2"
                                          : isLowRisk
                                              ? "#f0fdf4"
                                              : "#fff7ed",
                                    },
                                  ]}
                              >
                                <Text
                                    style={[
                                      styles.severityText,
                                      {
                                        color: isHighRisk
                                            ? "#ef4444"
                                            : isLowRisk
                                                ? "#10b981"
                                                : "#f97316",
                                      },
                                    ]}
                                >
                                  {isHighRisk ? "위험" : isLowRisk ? "낮음" : "보통"}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.cardFooterRow}>
                              <View style={styles.footerLeft}>
                                <Feather name="calendar" size={12} color="#94a3b8" />
                                <Text style={styles.cardDateText}>{it.createdAt || ""}</Text>
                              </View>

                              <Text
                                  style={[
                                    styles.statusText,
                                    {
                                      color:
                                          status === "READY"
                                              ? "#10b981"
                                              : status === "GENERATING"
                                                  ? "#3b82f6"
                                                  : "#94a3b8",
                                    },
                                  ]}
                              >
                                {status === "READY"
                                    ? "리포트 완료"
                                    : status === "GENERATING"
                                        ? "분석 중"
                                        : "분석 대기"}
                              </Text>
                            </View>

                            <View style={styles.costRow}>
                              <View>
                                <Text style={styles.costLabel}>위험도 지수</Text>
                                <Text
                                    style={[
                                      styles.costValue,
                                      { color: isHighRisk ? "#ef4444" : MAIN_BLUE },
                                    ]}
                                >
                                  {it.riskScore}%
                                </Text>
                              </View>

                              <TouchableOpacity
                                  onPress={() => deleteItem(id)}
                                  style={styles.deleteIconButton}
                              >
                                <Feather name="trash-2" size={18} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Pressable>

                        {status === "READY" && (
                            <Pressable
                                onPress={() => {
                                  if (!reviewAvailable || it.reviewWritten) return;
                                  handleReviewPress(it);
                                }}
                                disabled={it.reviewWritten || !reviewAvailable}
                                style={[
                                  styles.reviewWriteBtn,
                                  (it.reviewWritten || !reviewAvailable) && styles.reviewWriteBtnDisabled,
                                ]}
                            >
                              <Feather
                                  name={it.reviewWritten ? "check" : reviewAvailable ? "edit-3" : "lock"}
                                  size={15}
                                  color={it.reviewWritten || !reviewAvailable ? "#94a3b8" : MAIN_BLUE}
                              />

                              <Text
                                  style={[
                                    styles.reviewWriteText,
                                    (it.reviewWritten || !reviewAvailable) &&
                                    styles.reviewWriteTextDisabled,
                                  ]}
                              >
                                {it.reviewWritten
                                    ? "리뷰 작성 완료"
                                    : reviewAvailable
                                        ? "리뷰 작성"
                                        : "업체 연결 후 리뷰 가능"}
                              </Text>
                            </Pressable>
                        )}
                      </View>
                  );
                })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 16,
    backgroundColor: HEADER_BG,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },

  headerSub: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },

  filterWrapper: {
    backgroundColor: "#fff",
    paddingBottom: 20,
    paddingTop: 8,
  },

  filterScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },

  filterBadge: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
  },

  filterBadgeActive: {
    backgroundColor: MAIN_BLUE,
  },

  filterText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },

  filterTextActive: {
    color: "#fff",
  },

  listContainer: {
    paddingHorizontal: 24,
  },

  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },

  cardMain: {
    flexDirection: "row",
    gap: 12,
  },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  cardContent: {
    flex: 1,
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTypeText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
  },

  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  severityText: {
    fontSize: 11,
    fontWeight: "800",
  },

  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cardDateText: {
    fontSize: 12,
    color: "#94a3b8",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f8fafc",
  },

  costLabel: {
    fontSize: 11,
    color: "#94a3b8",
  },

  costValue: {
    fontSize: 17,
    fontWeight: "800",
    color: MAIN_BLUE,
  },

  deleteIconButton: {
    padding: 8,
  },

  reviewWriteBtn: {
    marginTop: 14,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  reviewWriteBtnDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },

  reviewWriteText: {
    color: MAIN_BLUE,
    fontSize: 13,
    fontWeight: "800",
  },

  reviewWriteTextDisabled: {
    color: "#94a3b8",
  },

  emptyBox: {
    padding: 80,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
  },
});