import { useEffect, useState } from "react";
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
import {
  getLastDiagnosisResult,
  getDiagnosisResult,
  DiagnosisApiResult,
} from "../src/api/diagnosis";
import { getDiyGuide, DiyGuide, DiyMaterial } from "../src/api/guides";
import { IssueType } from "../src/api/histories";
import { apiClient } from "../src/api/apiClient";

const MAIN_BLUE = "#3b82f6";

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
  if (raw.includes("PEEL") || raw.includes("박리") || raw.includes("박리")) return "PEEL";
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
      value?.diagnosisResult?.riskScore100 ??
      value?.riskScore ??
      value?.diagnosisResult?.riskScore;

  const num = Number(raw);

  if (Number.isNaN(num)) return 0;

  // diagnosis_result.riskScore는 0~1 스케일, history.riskScore는 0~100 스케일일 수 있음
  if (num > 0 && num <= 1) {
    return Math.round(num * 100);
  }

  return Math.round(num);
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
    result: DiagnosisApiResult | null | undefined,
    fallback?: unknown
): ProductCategory {
  const source =
      result?.issueType ??
      result?.mainDefect ??
      (result as any)?.main_defect ??
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

    const mapped: DiyMaterial[] = products
        .filter((p) => p?.coupangUrl)
        .map((p) => ({
          id: `db-product-${p.id}`,
          name: p.name,
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
// 중요: LLM products는 화면에 표시하지 않는다.
// 추천 물품은 오직 /api/products DB 조회 결과만 사용한다.
function convertLlmToDiyGuide(data: DiagnosisApiResult): DiyGuide {
  const g = data.guide?.guide;
  if (!g) throw new Error("no guide");

  const steps = (g.steps ?? []).map((s) => {
    let text = `${s.title}: ${s.description}`;
    if (s.warning) text += `\n주의: ${s.warning}`;
    return text;
  });

  const cautions = [...(g.warnings ?? [])];

  return {
    title: g.title || "DIY 대응 가이드",
    steps: steps.length > 0 ? steps : ["상태를 다시 확인한 뒤 전문가 상담을 권장합니다."],
    cautions: cautions.length > 0 ? cautions : undefined,
    materials: [],
  };
}

function applyDbProductsToGuide(guide: DiyGuide, dbProducts: DiyMaterial[]): DiyGuide {
  return {
    ...guide,
    materials: dbProducts,
  };
}

async function buildGuideFromDiagnosis(
    result: DiagnosisApiResult,
    fallbackCategory?: unknown
): Promise<{
  guide: DiyGuide;
  category: ProductCategory;
  isLlmGuide: boolean;
  isCallPro: boolean;
  usedDbProducts: boolean;
}> {
  const category = getCategoryFromDiagnosisResult(result, fallbackCategory);
  const dbProducts = await fetchActiveProducts(category);

  if (result?.guide?.guide) {
    const llmGuide = convertLlmToDiyGuide(result);

    return {
      guide: applyDbProductsToGuide(llmGuide, dbProducts),
      category,
      isLlmGuide: true,
      isCallPro: result.guide.guide.next_action === "CALL_PRO" || getRiskScore(result) >= 70,
      usedDbProducts: dbProducts.length > 0,
    };
  }

  const baseGuide = await getDiyGuide(category as unknown as IssueType);

  return {
    guide: applyDbProductsToGuide(baseGuide, dbProducts),
    category,
    isLlmGuide: false,
    isCallPro: getRiskScore(result) >= 70,
    usedDbProducts: dbProducts.length > 0,
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

        // 1순위: historyId로 들어온 경우
        // 핵심: 최신 진단 결과를 쓰면 안 됨. 해당 history의 diagnosisId로 저장된 LLM guide를 다시 조회해야 함.
        if (historyId) {
          const history = await fetchHistoryDetail(String(historyId));

          console.log("📌 [DIY] history detail:", JSON.stringify(history, null, 2));

          const historyCategory = getCategoryFromHistory(history, issueType);
          const historyDiagnosisId = history.diagnosisId ?? history.diagnosisResult?.id;

          if (historyDiagnosisId) {
            const result = await getDiagnosisResult(String(historyDiagnosisId));
            const built = await buildGuideFromDiagnosis(result, historyCategory);

            setGuide(built.guide);
            setSelectedCategory(built.category);
            setIsLlmGuide(built.isLlmGuide);
            setIsCallPro(built.isCallPro);
            setUsedDbProducts(built.usedDbProducts);
            return;
          }

          // 구 파이프라인 또는 diagnosisId가 없는 history는 기본 가이드 + DB 상품만 사용
          const dbProducts = await fetchActiveProducts(historyCategory);
          const baseGuide = await getDiyGuide(historyCategory as unknown as IssueType);

          setGuide(applyDbProductsToGuide(baseGuide, dbProducts));
          setSelectedCategory(historyCategory);
          setIsLlmGuide(false);
          setIsCallPro(getRiskScore(history) >= 70);
          setUsedDbProducts(dbProducts.length > 0);
          return;
        }

        // 2순위: diagnosisId로 직접 들어온 경우
        if (diagnosisId) {
          const result = await getDiagnosisResult(String(diagnosisId));
          const built = await buildGuideFromDiagnosis(result, issueType);

          setGuide(built.guide);
          setSelectedCategory(built.category);
          setIsLlmGuide(built.isLlmGuide);
          setIsCallPro(built.isCallPro);
          setUsedDbProducts(built.usedDbProducts);
          return;
        }

        // 3순위: 새 진단 직후 캐시된 결과
        const result = await getLastDiagnosisResult();

        if (result?.guide?.guide) {
          const built = await buildGuideFromDiagnosis(result, issueType);

          setGuide(built.guide);
          setSelectedCategory(built.category);
          setIsLlmGuide(built.isLlmGuide);
          setIsCallPro(built.isCallPro);
          setUsedDbProducts(built.usedDbProducts);
          return;
        }

        // 최종 fallback
        const fallbackCategory = normalizeIssueType(issueType);
        const dbProducts = await fetchActiveProducts(fallbackCategory);
        const baseGuide = await getDiyGuide(fallbackCategory as unknown as IssueType);

        setGuide(applyDbProductsToGuide(baseGuide, dbProducts));
        setSelectedCategory(fallbackCategory);
        setIsLlmGuide(false);
        setIsCallPro(false);
        setUsedDbProducts(dbProducts.length > 0);
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
  function getProductDescription(name?: string, category?: string) {
    const n = String(name || "").toLowerCase();
    const c = String(category || "").toUpperCase();

    if (n.includes("마스크") || n.includes("n95")) {
      return "곰팡이 제거 작업 중 흡입 위험을 줄이기 위한 보호 장비입니다.";
    }

    if (n.includes("장갑") || n.includes("니트릴")) {
      return "세제나 오염 부위가 피부에 직접 닿지 않도록 보호합니다.";
    }

    if (n.includes("곰팡") || c === "MOLD") {
      return "곰팡이 오염 부위를 닦아내거나 제거할 때 사용하는 물품입니다.";
    }

    if (n.includes("균열") || n.includes("보수") || c === "CRACK") {
      return "작은 균열이나 틈을 메우는 보수 작업에 사용할 수 있습니다.";
    }

    if (n.includes("누수") || n.includes("방수") || c === "LEAK") {
      return "누수 흔적이 있는 부위의 임시 방수나 보수에 사용할 수 있습니다.";
    }

    if (n.includes("부식") || n.includes("녹") || c === "CORROSION") {
      return "녹이나 부식 부위를 정리하고 추가 손상을 줄이는 데 사용됩니다.";
    }

    if (n.includes("벗겨") || n.includes("페인트") || c === "PEEL") {
      return "벗겨진 마감재나 표면을 정리하고 보수할 때 사용할 수 있습니다.";
    }

    if (n.includes("들뜸") || c === "BULGE") {
      return "들뜬 마감재를 정리하거나 임시 보수할 때 참고할 수 있는 물품입니다.";
    }

    return "해당 하자 유형의 간단한 점검이나 보조 작업에 사용할 수 있는 물품입니다.";
  }
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
                    <Text style={styles.aiBadgeText}>AI 생성</Text>
                  </View>
              ) : (
                  <Text style={styles.mockText}>기본 가이드</Text>
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
                  <View key={`${i}-${s}`} style={styles.stepRow}>
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
                      <View key={`${i}-${c}`} style={styles.cautionRow}>
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
                    추천 물품은 쿠팡 파트너스 링크를 통해 제공됩니다.
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
                <View style={styles.productList}>
                  {materials.map((m, i) => {
                    const disabled = !m.buyUrl;

                    return (
                        <Pressable
                            key={m.id}
                            disabled={disabled}
                            onPress={() => openBuyUrl(m.buyUrl)}
                            style={({ pressed }) => [
                              styles.productRow,
                              pressed && !disabled && styles.productRowPressed,
                              disabled && styles.productRowDisabled,
                            ]}
                        >
                          <View style={styles.productNumberBox}>
                            <Text style={styles.productNumberText}>
                              {String(i + 1).padStart(2, "0")}
                            </Text>
                          </View>

                          <View style={styles.productInfo}>
                            <Text style={styles.productName} numberOfLines={1}>
                              {m.name}
                            </Text>

                            <Text style={styles.productDescription} numberOfLines={2}>
                              {getProductDescription(m.name, selectedCategory)}
                            </Text>
                          </View>

                          <View style={styles.productAction}>
                            <Text
                                style={[
                                  styles.productActionText,
                                  disabled && styles.productActionTextDisabled,
                                ]}
                            >
                              {disabled ? "링크 없음" : "구매하기"}
                            </Text>

                            {!disabled ? (
                                <Feather name="chevron-right" size={16} color="#2563eb" />
                            ) : null}
                          </View>
                        </Pressable>
                    );
                  })}
                </View>
            )}
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
  materialItemCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },

  materialLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  materialIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },

  materialNameCompact: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
  },

  buyBtnCompact: {
    minWidth: 82,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },

  buyBtnCompactText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#ffffff",
  },

  buyBtnCompactDisabled: {
    backgroundColor: "#e2e8f0",
  },

  buyBtnCompactTextDisabled: {
    color: "#94a3b8",
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  materialName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 10,
  },

  buyBtn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    backgroundColor: "#eff6ff",
  },

  buyBtnText: {
    fontWeight: "800",
    color: MAIN_BLUE,
    fontSize: 14,
  },

  buyBtnDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },

  buyBtnTextDisabled: {
    color: "#94a3b8",
  },

  productList: {
    gap: 10,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 78,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  productInfo: {
    flex: 1,
    justifyContent: "center",
  },

  productName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 4,
  },

  productDescription: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    lineHeight: 17,
  },

  productAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 10,
  },

  productRowPressed: {
    backgroundColor: "#f8fafc",
  },

  productRowDisabled: {
    opacity: 0.55,
  },

  productIndexBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  productIndexText: {
    fontSize: 12,
    fontWeight: "900",
    color: MAIN_BLUE,
  },

  

  productActionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 10,
  },

  productActionText: {
    fontSize: 13,
    fontWeight: "900",
    color: MAIN_BLUE,
  },

  productActionTextDisabled: {
    color: "#94a3b8",
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
  productNumberBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  productNumberText: {
    fontSize: 13,
    fontWeight: "900",
    color: MAIN_BLUE,
  },
});