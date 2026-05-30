import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  Alert,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import ScreenState from "../src/components/ScreenState";
import { getLastDiagnosisResult, DiagnosisApiResult } from "../src/api/diagnosis";
import { getDiyGuide, DiyGuide, DiyMaterial } from "../src/api/guides";
import { IssueType } from "../src/api/histories";
import { apiClient } from "../src/api/apiClient";

const MAIN_BLUE = "#3b82f6";

type FeedbackValue = "LIKE" | "DISLIKE";

type ProductCategory =
    | "CRACK"
    | "MOLD"
    | "PEEL"
    | "LEAK"
    | "CORROSION"
    | "BULGE"
    | "ETC"
    | "DAMAGE"
    | "ELECTRIC"
    | "GAS";

type ProductItem = {
  id: number;
  name: string;
  productId?: string | null;
  coupangUrl?: string | null;
  imageUrl?: string | null;
  category: ProductCategory;
};

type HistoryDetailLike = {
  id?: string | number;
  historyId?: string | number;
  diagnosisId?: string | number;
  issueType?: string;
  mainDefect?: string;
  main_defect?: string;
  riskScore?: number;
  riskScore100?: number;
  status?: string;
  guide?: any;
  diagnosisResult?: any;
};

function normalizeIssueType(value?: unknown): ProductCategory {
  const raw = String(value || "").toUpperCase();

  if (raw.includes("CRACK") || raw.includes("균열")) return "CRACK";
  if (raw.includes("MOLD") || raw.includes("곰팡이")) return "MOLD";
  if (raw.includes("PEEL") || raw.includes("벗겨짐") || raw.includes("박리")) return "PEEL";
  if (raw.includes("LEAK") || raw.includes("누수")) return "LEAK";
  if (raw.includes("CORROSION") || raw.includes("부식") || raw.includes("녹")) return "CORROSION";
  if (raw.includes("BULGE") || raw.includes("들뜸")) return "BULGE";
  if (raw.includes("DAMAGE") || raw.includes("파손")) return "DAMAGE";
  if (raw.includes("ELECTRIC") || raw.includes("전기")) return "ELECTRIC";
  if (raw.includes("GAS") || raw.includes("가스")) return "GAS";

  return "ETC";
}

function extractApiData(data: any): any {
  return data?.data ?? data;
}

function extractList(data: any): any[] {
  const body = extractApiData(data);

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.data)) return body.data;

  return [];
}

function getRiskScore(value: any): number {
  const raw =
      value?.riskScore100 ??
      value?.riskScore ??
      value?.diagnosisResult?.riskScore100 ??
      value?.diagnosisResult?.riskScore;

  const num = Number(raw);

  if (Number.isNaN(num)) return 0;
  return num;
}

function getCategoryFromHistory(history: HistoryDetailLike, fallback?: unknown): ProductCategory {
  const source =
      history?.issueType ??
      history?.mainDefect ??
      history?.main_defect ??
      history?.diagnosisResult?.issueType ??
      history?.diagnosisResult?.mainDefect ??
      history?.diagnosisResult?.main_defect ??
      fallback;

  return normalizeIssueType(source);
}

function getCategoryFromDiagnosisResult(
    result: DiagnosisApiResult,
    fallback?: unknown
): ProductCategory {
  const source =
      (result as any)?.issueType ??
      (result as any)?.mainDefect ??
      (result as any)?.main_defect ??
      (result as any)?.guide?.issueType ??
      (result as any)?.guide?.mainDefect ??
      fallback;

  return normalizeIssueType(source);
}

async function fetchHistoryDetail(historyId: string): Promise<HistoryDetailLike> {
  const res = await apiClient.get(`/api/histories/${historyId}`);
  return extractApiData(res.data) as HistoryDetailLike;
}

async function fetchActiveProducts(category: ProductCategory): Promise<DiyMaterial[]> {
  try {
    console.log("🛒 [DIY] 상품 조회 요청 category:", category);

    const res = await apiClient.get("/api/products", {
      params: { category },
    });

    console.log("🛒 [DIY] 상품 조회 응답:", JSON.stringify(res.data, null, 2));

    const products = extractList(res.data) as ProductItem[];

    const mapped = products
        .filter((p) => p?.coupangUrl)
        .map((p) => ({
          id: `db-product-${p.id}`,
          name: p.name,
          approxCost: "쿠팡에서 확인",
          reason: "관리자가 등록한 추천 수리 물품입니다.",
          note: "쿠팡 파트너스",
          buyUrl: p.coupangUrl || undefined,
        }));

    console.log("🛒 [DIY] 화면 표시 상품:", mapped);

    return mapped;
  } catch (e: any) {
    console.log("❌ [DIY] DB 상품 조회 실패:", {
      message: e?.message,
      status: e?.response?.status,
      data: e?.response?.data,
      url: e?.config?.url,
      params: e?.config?.params,
    });

    return [];
  }
}

// LLM 가이드 → DiyGuide 형식으로 변환
// 중요: LLM이 내려준 products는 화면에 표시하지 않는다.
// 상품 추천은 오직 DB products 테이블 기준으로만 표시한다.
function convertLlmToDiyGuide(data: DiagnosisApiResult): DiyGuide {
  const g = data.guide?.guide;
  if (!g) throw new Error("no guide");

  const steps = (g.steps ?? []).map((s) => {
    let text = `${s.title}: ${s.description}`;
    if (s.warning) text += `\n⚠️ ${s.warning}`;
    return text;
  });

  const cautions = [...(g.warnings ?? [])];

  return {
    title: g.title,
    steps,
    cautions: cautions.length > 0 ? cautions : undefined,
    materials: [],
  };
}

// 어떤 가이드가 오더라도 상품 목록은 DB 상품으로만 교체한다.
// DB 상품이 없으면 빈 배열 유지.
// LLM 상품 fallback 금지.
function applyDbProductsToGuide(guide: DiyGuide, dbProducts: DiyMaterial[]): DiyGuide {
  return {
    ...guide,
    materials: dbProducts,
  };
}

export default function Diy() {
  const { diagnosisId, historyId, issueType } = useLocalSearchParams<{
    diagnosisId?: string;
    historyId?: string;
    issueType?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<DiyGuide | null>(null);
  const [isLlmGuide, setIsLlmGuide] = useState(false);
  const [isCallPro, setIsCallPro] = useState(false);
  const [usedDbProducts, setUsedDbProducts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("ETC");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackValue | undefined>>({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setGuide(null);
        setUsedDbProducts(false);

        console.log("🚪 [DIY] route params:", {
          diagnosisId,
          historyId,
          issueType,
        });

        // 1순위: 히스토리에서 들어온 경우
        // 이 경우 절대 getLastDiagnosisResult()를 쓰면 안 됨.
        // 각 히스토리가 전부 최신 결과로 덮이는 문제가 생기기 때문.
        if (historyId) {
          const history = await fetchHistoryDetail(String(historyId));

          console.log("📌 [DIY] history detail:", JSON.stringify(history, null, 2));

          const category = getCategoryFromHistory(history, issueType);
          const riskScore = getRiskScore(history);

          console.log("🏷️ [DIY] history category:", category);
          console.log("⚠️ [DIY] history riskScore:", riskScore);

          setSelectedCategory(category);

          const baseGuide = await getDiyGuide(category as IssueType);
          const dbProducts = await fetchActiveProducts(category);

          setGuide(applyDbProductsToGuide(baseGuide, dbProducts));
          setUsedDbProducts(dbProducts.length > 0);
          setIsLlmGuide(false);
          setIsCallPro(riskScore >= 70);
          return;
        }

        // 2순위: historyId가 없고 diagnosisId/issueType만 있는 경우
        // 이 경우 issueType이 있으면 그걸 우선 사용.
        if (issueType) {
          const category = normalizeIssueType(issueType);

          console.log("🏷️ [DIY] issueType param category:", category);

          setSelectedCategory(category);

          const baseGuide = await getDiyGuide(category as IssueType);
          const dbProducts = await fetchActiveProducts(category);

          setGuide(applyDbProductsToGuide(baseGuide, dbProducts));
          setUsedDbProducts(dbProducts.length > 0);
          setIsLlmGuide(false);
          setIsCallPro(false);
          return;
        }

        // 3순위: 진짜 아무 정보 없이 DIY 화면에 들어온 경우만 최신 진단 사용
        // 일반 히스토리 진입에서는 여기로 오면 안 됨.
        const result = await getLastDiagnosisResult();

        console.log("🧠 [DIY] last diagnosis result:", JSON.stringify(result, null, 2));

        if (result?.guide?.guide) {
          const category = getCategoryFromDiagnosisResult(result, issueType);

          console.log("🏷️ [DIY] last result category:", category);

          setSelectedCategory(category);

          const converted = convertLlmToDiyGuide(result);
          const dbProducts = await fetchActiveProducts(category);

          setGuide(applyDbProductsToGuide(converted, dbProducts));
          setUsedDbProducts(dbProducts.length > 0);
          setIsLlmGuide(true);
          setIsCallPro((result.riskScore100 ?? 0) >= 70);
          return;
        }

        const fallbackCategory = normalizeIssueType(issueType);
        setSelectedCategory(fallbackCategory);

        const fallbackGuide = await getDiyGuide(fallbackCategory as IssueType);
        const dbProducts = await fetchActiveProducts(fallbackCategory);

        setGuide(applyDbProductsToGuide(fallbackGuide, dbProducts));
        setUsedDbProducts(dbProducts.length > 0);
        setIsLlmGuide(false);
      } catch (e: any) {
        console.log("❌ [DIY] 가이드 조회 실패:", {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
          url: e?.config?.url,
          params: e?.config?.params,
        });

        Alert.alert("불러오기 실패", "DIY 가이드를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [diagnosisId, historyId, issueType]);

  async function openBuyUrl(url?: string) {
    if (!url) {
      Alert.alert("링크 없음", "등록된 구매 링크가 없습니다.");
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert("링크 열기 실패", "상품 링크를 열 수 없습니다.");
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert("링크 열기 실패", "외부 링크를 열 수 없습니다.");
    }
  }

  function selectFeedback(materialId: string, value: FeedbackValue) {
    setFeedbackMap((prev) => ({
      ...prev,
      [materialId]: prev[materialId] === value ? undefined : value,
    }));
  }

  const materialFeedbackNote = useMemo(() => {
    const hasAny = Object.values(feedbackMap).some(Boolean);
    if (!hasAny) return null;
    return "만족도 버튼은 미리보기용입니다.";
  }, [feedbackMap]);

  if (loading || !guide) return <ScreenState loading />;

  const materials = guide.materials ?? [];

  return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
          </Pressable>

          <Text style={styles.headerTitle}>DIY 가이드</Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.mainTitle}>DIY 가이드</Text>

              {isLlmGuide ? (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>✨ AI 생성</Text>
                  </View>
              ) : (
                  <Text style={styles.mockText}>히스토리 기준</Text>
              )}
            </View>

            <Text style={styles.subDescription}>{guide.title}</Text>

            {isCallPro && (
                <View style={styles.warningBanner}>
                  <Feather name="alert-triangle" size={16} color="#b45309" />
                  <Text style={styles.warningBannerText}>
                    위험도가 높습니다. 전문가 상담을 권장하지만, 참고용으로 DIY 방법을 안내합니다.
                  </Text>
                </View>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="format-list-numbered" size={20} color={MAIN_BLUE} />
              <Text style={styles.cardTitle}>진행 순서</Text>
            </View>

            <View style={styles.stepList}>
              {guide.steps.map((s, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepIndicator}>
                      <View style={styles.stepNumberBox}>
                        <Text style={styles.stepNumber}>{i + 1}</Text>
                      </View>

                      {i < guide.steps.length - 1 && <View style={styles.stepLine} />}
                    </View>

                    <Text style={styles.stepText}>{s}</Text>
                  </View>
              ))}
            </View>
          </View>

          {guide.cautions && guide.cautions.length > 0 ? (
              <View style={[styles.card, styles.cautionCard]}>
                <View style={styles.cardHeader}>
                  <Feather name="alert-circle" size={18} color="#ef4444" />
                  <Text style={[styles.cardTitle, { color: "#ef4444" }]}>주의사항</Text>
                </View>

                <View style={{ gap: 10 }}>
                  {guide.cautions.map((c, i) => (
                      <View key={i} style={styles.cautionRow}>
                        <Text style={styles.cautionBullet}>•</Text>
                        <Text style={styles.cautionText}>{c}</Text>
                      </View>
                  ))}
                </View>
              </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="shopping-bag" size={18} color={MAIN_BLUE} />
              <Text style={styles.cardTitle}>추천 자재/도구</Text>
            </View>

            {usedDbProducts ? (
                <View style={styles.partnerNotice}>
                  <Feather name="info" size={15} color="#64748b" />
                  <Text style={styles.partnerNoticeText}>
                    이 상품 링크를 통해 구매 시 일정 수수료를 받을 수 있습니다.
                  </Text>
                </View>
            ) : null}

            {materials.length === 0 ? (
                <View style={styles.emptyProductBox}>
                  <Feather name="package" size={30} color="#cbd5e1" />
                  <Text style={styles.emptyProductTitle}>등록된 추천 물품이 없습니다.</Text>
                  <Text style={styles.emptyProductText}>
                    관리자 물품관리에서 {selectedCategory} 카테고리 상품을 등록하면 이곳에 표시됩니다.
                  </Text>
                </View>
            ) : (
                materials.map((m, i) => {
                  const feedback = feedbackMap[m.id];

                  return (
                      <View
                          key={m.id}
                          style={[
                            styles.materialItem,
                            i === materials.length - 1 && { borderBottomWidth: 0 },
                          ]}
                      >
                        <View style={styles.materialInfo}>
                          <Text style={styles.materialName}>{m.name}</Text>

                          <View style={styles.materialMeta}>
                            <Text style={styles.materialCost}>{m.approxCost || "가격 미정"}</Text>
                            {m.note ? <Text style={styles.materialNote}>| {m.note}</Text> : null}
                          </View>

                          {m.reason ? (
                              <View style={{ marginTop: 6 }}>
                                <Text style={styles.reasonText}>{m.reason}</Text>
                              </View>
                          ) : null}

                          <View style={styles.actionRow}>
                            {m.buyUrl ? (
                                <Pressable onPress={() => openBuyUrl(m.buyUrl)} style={styles.buyBtn}>
                                  <Text style={styles.buyBtnText}>🛒 쿠팡에서 보기</Text>
                                </Pressable>
                            ) : null}

                            <View style={styles.feedbackGroup}>
                              <Pressable
                                  onPress={() => selectFeedback(m.id, "LIKE")}
                                  style={[styles.fBtn, feedback === "LIKE" && styles.fBtnActive]}
                              >

                              </Pressable>

                              <Pressable
                                  onPress={() => selectFeedback(m.id, "DISLIKE")}
                                  style={[styles.fBtn, feedback === "DISLIKE" && styles.fBtnActive]}
                              >

                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </View>
                  );
                })
            )}

            {materialFeedbackNote ? (
                <Text style={styles.feedbackNote}>{materialFeedbackNote}</Text>
            ) : null}
          </View>

          <Pressable onPress={() => router.back()} style={styles.footerBackBtn}>
            <Text style={styles.footerBackBtnText}>뒤로</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
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

  scrollContent: { padding: 20 },

  titleSection: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },

  aiBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  aiBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: MAIN_BLUE,
  },

  mockText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },

  subDescription: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
    marginTop: 4,
  },

  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginTop: 12,
  },

  warningBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },

  stepList: {
    paddingLeft: 4,
  },

  stepRow: {
    flexDirection: "row",
    gap: 16,
    minHeight: 64,
  },

  stepIndicator: {
    alignItems: "center",
  },

  stepNumberBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MAIN_BLUE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  stepNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#eff6ff",
    marginVertical: 4,
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    paddingTop: 2,
  },

  cautionCard: {
    borderColor: "#fee2e2",
  },

  cautionRow: {
    flexDirection: "row",
    gap: 8,
  },

  cautionBullet: {
    color: "#ef4444",
    fontWeight: "900",
    fontSize: 16,
  },

  cautionText: {
    flex: 1,
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  partnerNotice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },

  partnerNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    fontWeight: "600",
  },

  emptyProductBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 34,
    paddingHorizontal: 18,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  emptyProductTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },

  emptyProductText: {
    marginTop: 6,
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },

  materialItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  materialInfo: { flex: 1 },

  materialName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },

  materialMeta: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },

  materialCost: {
    fontSize: 13,
    color: MAIN_BLUE,
    fontWeight: "600",
  },

  materialNote: {
    fontSize: 12,
    color: "#94a3b8",
  },

  reasonText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
  },

  actionRow: {
    marginTop: 12,
    gap: 8,
  },

  buyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },

  buyBtnText: {
    fontWeight: "700",
    color: "#1e293b",
    fontSize: 14,
  },

  feedbackGroup: {
    flexDirection: "row",
    gap: 8,
  },

  fBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#fafafa",
    alignItems: "center",
  },

  fBtnActive: {
    borderColor: MAIN_BLUE,
    backgroundColor: "#eff6ff",
  },

  feedbackNote: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 12,
    textAlign: "center",
  },

  footerBackBtn: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },

  footerBackBtnText: {
    fontWeight: "700",
    color: "#64748b",
  },
});