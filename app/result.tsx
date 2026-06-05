import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

import ScreenState from "../src/components/ScreenState";
import { getLastDiagnosisResult, DiagnosisApiResult } from "../src/api/diagnosis";
import { apiClient } from "../src/api/apiClient";

const MAIN_BLUE = "#3b82f6";

type ResultViewData = {
  historyId?: string;
  diagnosisId?: string;
  issueType: string;
  riskScore100: number;
  riskLevel: string;
  detectionCount: number;
  imageUrl?: string;
  guideFallback?: boolean;
  guide?: any;
};

function issueTypeLabel(t?: string) {
  switch (String(t || "").toUpperCase()) {
    case "CRACK":
      return "균열";
    case "MOLD":
      return "곰팡이";
    case "PEEL":
      return "박리";
    case "LEAK":
      return "누수";
    case "CORROSION":
      return "부식";
    case "BULGE":
      return "들뜸";
    default:
      return "기타";
  }
}

function issueTypeEmoji(t?: string) {
  switch (String(t || "").toUpperCase()) {
    case "CRACK":
      return "🧱";
    case "MOLD":
      return "🦠";
    case "PEEL":
      return "🎨";
    case "LEAK":
      return "💧";
    case "CORROSION":
      return "🛠️";
    case "BULGE":
      return "🧩";
    case "DAMAGE":
      return "🔧";
    case "ELECTRIC":
      return "⚡";
    case "GAS":
      return "🔥";
    default:
      return "🏠";
  }
}

function normalizeIssueType(value?: unknown): string {
  const raw = String(value || "").toUpperCase();

  if (raw.includes("CRACK") || raw.includes("균열")) return "CRACK";
  if (raw.includes("MOLD") || raw.includes("곰팡이")) return "MOLD";
  if (raw.includes("PEEL") || raw.includes("박리") || raw.includes("박리")) return "PEEL";
  if (raw.includes("LEAK") || raw.includes("누수")) return "LEAK";
  if (raw.includes("CORROSION") || raw.includes("부식") || raw.includes("녹")) return "CORROSION";
  if (raw.includes("BULGE") || raw.includes("들뜸")) return "BULGE";

  return "ETC";
}

function pickBestIssueType(...values: unknown[]): string {
  for (const value of values) {
    const normalized = normalizeIssueType(value);

    if (normalized !== "ETC") {
      return normalized;
    }
  }

  return "ETC";
}

function extractApiData(data: any): any {
  return data?.data ?? data;
}

function parseGuideJson(value: any): any | undefined {
  if (!value) return undefined;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function toScore100(value: any): number {
  const num = Number(value);

  if (Number.isNaN(num)) return 0;

  if (num > 0 && num <= 1) {
    return Math.round(num * 100);
  }

  return Math.round(num);
}

function getRiskLevel(score100: number) {
  if (score100 >= 70) return "HIGH";
  if (score100 >= 40) return "MEDIUM";
  return "LOW";
}

function getImageUrlFromHistory(history: any): string | undefined {
  if (history?.imageUrl) return history.imageUrl;
  if (history?.image_url) return history.image_url;
  if (Array.isArray(history?.imageUris) && history.imageUris.length > 0) return history.imageUris[0];
  if (Array.isArray(history?.image_uris) && history.image_uris.length > 0) return history.image_uris[0];
  if (history?.diagnosisResult?.imageUrl) return history.diagnosisResult.imageUrl;
  if (history?.diagnosisResult?.image_url) return history.diagnosisResult.image_url;

  return undefined;
}

function getImageUrlFromDiagnosis(result: any): string | undefined {
  if (result?.imageUrl) return result.imageUrl;
  if (result?.image_url) return result.image_url;
  if (Array.isArray(result?.imageUris) && result.imageUris.length > 0) return result.imageUris[0];
  if (Array.isArray(result?.image_uris) && result.image_uris.length > 0) return result.image_uris[0];

  return undefined;
}

function mapHistoryToResult(history: any, fallbackHistoryId?: string): ResultViewData {
  const diagnosisResult = history?.diagnosisResult ?? history?.result ?? {};

  const issueType = pickBestIssueType(
      history?.mainDefect,
      history?.main_defect,
      diagnosisResult?.mainDefect,
      diagnosisResult?.main_defect,
      diagnosisResult?.issueType,
      diagnosisResult?.issue_type,
      history?.issueType,
      history?.issue_type
  );

  const score100 = toScore100(
      history?.riskScore ??
      history?.risk_score ??
      diagnosisResult?.riskScore100 ??
      diagnosisResult?.riskScore ??
      diagnosisResult?.risk_score ??
      0
  );

  const guide =
      history?.guide ??
      parseGuideJson(history?.guideJson) ??
      parseGuideJson(history?.guide_json) ??
      diagnosisResult?.guide ??
      parseGuideJson(diagnosisResult?.guideJson) ??
      parseGuideJson(diagnosisResult?.guide_json);

  return {
    historyId: String(history?.id ?? history?.historyId ?? fallbackHistoryId ?? ""),
    diagnosisId: String(
        history?.diagnosisId ??
        history?.diagnosis_id ??
        history?.diagnosisResultId ??
        history?.diagnosis_result_id ??
        diagnosisResult?.id ??
        diagnosisResult?.diagnosisId ??
        ""
    ),
    issueType,
    riskScore100: score100,
    riskLevel:
        history?.riskLevel ??
        history?.risk_level ??
        diagnosisResult?.riskLevel ??
        diagnosisResult?.risk_level ??
        getRiskLevel(score100),
    detectionCount: Number(
        history?.detectionCount ??
        history?.detection_count ??
        diagnosisResult?.detectionCount ??
        diagnosisResult?.detection_count ??
        0
    ),
    imageUrl: getImageUrlFromHistory(history),
    guideFallback: Boolean(history?.guideFallback ?? history?.guide_fallback ?? diagnosisResult?.guideFallback),
    guide,
  };
}

function mapDiagnosisToResult(result: any, fallbackDiagnosisId?: string): ResultViewData {
  const issueType = pickBestIssueType(
      result?.mainDefect,
      result?.main_defect,
      result?.issueType,
      result?.issue_type,
      result?.guide?.mainDefect,
      result?.guide?.issueType
  );

  const score100 = toScore100(
      result?.riskScore100 ??
      result?.riskScore ??
      result?.risk_score ??
      0
  );

  const guide =
      result?.guide ??
      parseGuideJson(result?.guideJson) ??
      parseGuideJson(result?.guide_json);

  return {
    diagnosisId: String(result?.id ?? result?.diagnosisId ?? result?.diagnosis_id ?? fallbackDiagnosisId ?? ""),
    historyId: String(result?.historyId ?? result?.history_id ?? ""),
    issueType,
    riskScore100: score100,
    riskLevel: String(result?.riskLevel ?? result?.risk_level ?? getRiskLevel(score100)),
    detectionCount: Number(result?.detectionCount ?? result?.detection_count ?? 0),
    imageUrl: getImageUrlFromDiagnosis(result),
    guideFallback: Boolean(result?.guideFallback ?? result?.guide_fallback),
    guide,
  };
}

function mapLastDiagnosisToResult(result: DiagnosisApiResult): ResultViewData {
  return mapDiagnosisToResult(result);
}

async function fetchHistoryResult(historyId: string): Promise<ResultViewData> {
  const res = await apiClient.get(`/api/histories/${historyId}`);
  const history = extractApiData(res.data);

  return mapHistoryToResult(history, historyId);
}

async function fetchDiagnosisResult(diagnosisId: string): Promise<ResultViewData> {
  const res = await apiClient.get(`/api/diagnosis/${diagnosisId}`);
  const result = extractApiData(res.data);

  return mapDiagnosisToResult(result, diagnosisId);
}

export default function Result() {
  const params = useLocalSearchParams<{
    diagnosisId?: string;
    historyId?: string;
    issueType?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResultViewData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setData(null);

        console.log("📌 [RESULT] route params:", params);

        if (params.historyId) {
          const historyResult = await fetchHistoryResult(String(params.historyId));

          console.log("📌 [RESULT] loaded by historyId:", historyResult);

          setData(historyResult);
          return;
        }

        if (params.diagnosisId) {
          try {
            const diagnosisResult = await fetchDiagnosisResult(String(params.diagnosisId));

            console.log("📌 [RESULT] loaded by diagnosisId:", diagnosisResult);

            setData(diagnosisResult);
            return;
          } catch (e: any) {
            console.log("⚠️ [RESULT] diagnosisId 직접 조회 실패, historyId 대체 조회 시도:", {
              diagnosisId: params.diagnosisId,
              status: e?.response?.status,
              data: e?.response?.data,
              url: e?.config?.url,
            });

            const historyResult = await fetchHistoryResult(String(params.diagnosisId));

            console.log("📌 [RESULT] fallback loaded by history id:", historyResult);

            setData(historyResult);
            return;
          }
        }

        const result = await getLastDiagnosisResult();

        console.log("📌 [RESULT] loaded by last diagnosis:", result);

        if (!result) {
          Alert.alert("결과 없음", "최근 진단 결과가 없습니다.");
          setData(null);
          return;
        }

        setData(mapLastDiagnosisToResult(result));
      } catch (e: any) {
        console.log("❌ [RESULT] load failed:", {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
          url: e?.config?.url,
        });

        Alert.alert("불러오기 실패", "진단 결과를 불러오지 못했습니다.");
        setData(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.historyId, params.diagnosisId]);

  if (loading) return <ScreenState loading />;

  if (!data) {
    return (
        <ScreenState
            title="결과를 불러오지 못했어요"
            errorMessage="다시 진단을 시도해주세요."
        />
    );
  }

  const riskScore = data.riskScore100;
  const isHighRisk = riskScore >= 70;
  const isMediumRisk = riskScore >= 40;
  const isDIY = riskScore < 70;

  const severityColor = isHighRisk ? "#ef4444" : isMediumRisk ? "#f97316" : "#10b981";
  const severityBg = isHighRisk ? "#fef2f2" : isMediumRisk ? "#fff7ed" : "#f0fdf4";
  const riskLabel = isHighRisk ? "높음" : isMediumRisk ? "중간" : "낮음";

  const effectiveHistoryId = String(params.historyId ?? data.historyId ?? "");
  const effectiveDiagnosisId = String(params.diagnosisId ?? data.diagnosisId ?? "");
  const effectiveIssueType = normalizeIssueType(params.issueType ?? data.issueType);

  const summary =
      data.guide?.guide?.summary ??
      data.guide?.summary ??
      "해당 진단 결과를 기준으로 불러온 분석 내용입니다.";

  function goDiy() {
    router.push({
      pathname: "/diy",
      params: {
        historyId: effectiveHistoryId || undefined,
        diagnosisId: effectiveDiagnosisId || undefined,
        issueType: effectiveIssueType,
      },
    });
  }

  function goExpert() {
    router.push({
      pathname: "/expert",
      params: {
        historyId: effectiveHistoryId || effectiveDiagnosisId,
        diagnosisId: effectiveDiagnosisId || undefined,
        issueType: effectiveIssueType,
      },
    });
  }

  return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
          </Pressable>

          <Text style={styles.headerTitle}>진단 결과</Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {data.imageUrl ? (
              <Image
                  source={{ uri: data.imageUrl }}
                  style={styles.diagnosisImage}
                  resizeMode="cover"
              />
          ) : null}

          <View style={styles.statusCard}>
            <View style={styles.cardInfoRow}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>{issueTypeEmoji(effectiveIssueType)}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.issueTitle}>{issueTypeLabel(effectiveIssueType)}</Text>

                  <View style={[styles.badge, { backgroundColor: severityBg }]}>
                    <Text style={[styles.badgeText, { color: severityColor }]}>{riskLabel}</Text>
                  </View>
                </View>

                <Text style={styles.subInfoText}>감지된 결함: {data.detectionCount || "-"}개</Text>
                <Text style={styles.subInfoText}>
                  {effectiveHistoryId
                      ? `히스토리 ID: ${effectiveHistoryId}`
                      : `진단 ID: ${effectiveDiagnosisId}`}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={[styles.statusBadge, { backgroundColor: "#f0fdf4" }]}>
                <Text style={[styles.statusBadgeText, { color: "#16a34a" }]}>분석 완료</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.scoreLabel}>위험도 점수</Text>
                <Text style={[styles.scoreValue, { color: severityColor }]}>{riskScore}점</Text>
              </View>
            </View>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Feather name="cpu" size={18} color={MAIN_BLUE} />
              <Text style={styles.sectionTitle}>AI 분석 요약</Text>

              {data.guideFallback && (
                  <View style={styles.fallbackBadge}>
                    <Text style={styles.fallbackBadgeText}>기본 가이드</Text>
                  </View>
              )}
            </View>

            <Text style={styles.diagnosisBody}>{summary}</Text>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Feather name="check-circle" size={18} color={MAIN_BLUE} />
              <Text style={styles.sectionTitle}>추천 처리 방식</Text>
            </View>

            <View
                style={[
                  styles.recommendBox,
                  {
                    backgroundColor: isDIY ? "#f0fdf4" : "#eff6ff",
                    borderColor: isDIY ? "#dcfce7" : "#dbeafe",
                  },
                ]}
            >
              <View style={styles.recommendHeader}>
                {isDIY ? (
                    <MaterialCommunityIcons name="tools" size={24} color="#16a34a" />
                ) : (
                    <Feather name="users" size={24} color={MAIN_BLUE} />
                )}

                <Text style={[styles.recommendTitle, { color: isDIY ? "#16a34a" : MAIN_BLUE }]}>
                  {isDIY ? "DIY 조치 가능" : "전문 업체 의뢰 권장"}
                </Text>
              </View>

              <Text style={styles.recommendReason}>
                {isDIY
                    ? "비교적 간단한 작업으로 직접 수리가 가능합니다. 가이드를 따라 진행해보세요."
                    : "전문적인 장비와 기술이 필요한 사안입니다. 업체 진단을 추천드립니다."}
              </Text>
            </View>

            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>위험 등급</Text>

                <View style={[styles.badge, { backgroundColor: severityBg }]}>
                  <Text style={[styles.badgeText, { color: severityColor }]}>{data.riskLevel}</Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>추천 경로</Text>

                <Text
                    style={[
                      styles.infoValue,
                      {
                        color: isDIY ? "#16a34a" : MAIN_BLUE,
                        fontWeight: "700",
                      },
                    ]}
                >
                  {isDIY ? "셀프 가이드" : "전문가 연결"}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
              style={[styles.actionBtn, { backgroundColor: isDIY ? "#22c55e" : MAIN_BLUE }]}
              onPress={isDIY ? goDiy : goExpert}
          >
            <Text style={styles.actionBtnText}>
              {isDIY ? "DIY 가이드 확인하기" : "전문 업체 정보 보기"}
            </Text>
          </Pressable>

          <View style={styles.choiceSection}>
            <Text style={styles.choiceTitle}>원하는 방식을 직접 선택할 수 있어요</Text>

            <View style={styles.choiceButtonRow}>
              <Pressable
                  style={[styles.choiceButton, styles.choiceButtonLeft]}
                  onPress={goDiy}
              >
                <MaterialCommunityIcons name="tools" size={18} color="#16a34a" />
                <Text style={styles.choiceButtonText}>DIY 보기</Text>
              </Pressable>

              <Pressable
                  style={[styles.choiceButton, styles.choiceButtonRight]}
                  onPress={goExpert}
              >
                <Feather name="users" size={18} color={MAIN_BLUE} />
                <Text style={styles.choiceButtonText}>전문가 보기</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

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

  scrollContent: {
    padding: 20,
    gap: 16,
  },

  diagnosisImage: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },

  statusCard: {
    backgroundColor: "#f8faff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  cardInfoRow: {
    flexDirection: "row",
    gap: 16,
  },

  iconBox: {
    width: 60,
    height: 60,
    backgroundColor: "#fff",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  iconText: {
    fontSize: 28,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },

  issueTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },

  subInfoText: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 2,
  },

  cardFooter: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  scoreLabel: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "right",
  },

  scoreValue: {
    fontSize: 24,
    fontWeight: "900",
  },

  contentSection: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 20,
    padding: 18,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e293b",
    flex: 1,
  },

  fallbackBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  fallbackBadgeText: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "700",
  },

  diagnosisBody: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  recommendBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },

  recommendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  recommendTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  recommendReason: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  infoList: {
    gap: 0,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  infoLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },

  actionBtn: {
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: MAIN_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  choiceSection: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },

  choiceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
  },

  choiceButtonRow: {
    flexDirection: "row",
    gap: 10,
  },

  choiceButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  choiceButtonLeft: {
    backgroundColor: "#f0fdf4",
    borderColor: "#dcfce7",
  },

  choiceButtonRight: {
    backgroundColor: "#eff6ff",
    borderColor: "#dbeafe",
  },

  choiceButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
  },
});