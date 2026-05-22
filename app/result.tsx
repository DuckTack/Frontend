import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

import ScreenState from "../src/components/ScreenState";
import { getLastDiagnosisResult, DiagnosisApiResult } from "../src/api/diagnosis";

const MAIN_BLUE = "#3b82f6";

function issueTypeLabel(t: string) {
  switch (t) {
    case "CRACK": return "균열";
    case "LEAK": return "누수";
    case "MOLD": return "곰팡이";
    case "DAMAGE": return "파손";
    case "ELECTRIC": return "전기";
    case "GAS": return "가스";
    default: return "기타";
  }
}

function issueTypeEmoji(t: string) {
  switch (t) {
    case "CRACK": return "🧱";
    case "LEAK": return "💧";
    case "MOLD": return "🦠";
    case "DAMAGE": return "🔧";
    case "ELECTRIC": return "⚡";
    case "GAS": return "🔥";
    default: return "🏠";
  }
}

export default function Result() {
  const params = useLocalSearchParams<{ diagnosisId?: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosisApiResult | null>(null);

  useEffect(() => {
    async function load() {
      const result = await getLastDiagnosisResult();
      setData(result);
      setLoading(false);
    }
    load();
  }, [params.diagnosisId]);

  if (loading) return <ScreenState loading />;
  if (!data) return <ScreenState title="결과를 불러오지 못했어요" errorMessage="다시 진단을 시도해주세요." />;

  const riskScore = data.riskScore100;
  const isHighRisk = riskScore >= 70;
  const isMediumRisk = riskScore >= 40;
  const isDIY = data.riskScore100 < 70; // HIGH(70+)이면 전문가 추천, 그 외는 DIY 가능

  const severityColor = isHighRisk ? "#ef4444" : isMediumRisk ? "#f97316" : "#10b981";
  const severityBg = isHighRisk ? "#fef2f2" : isMediumRisk ? "#fff7ed" : "#f0fdf4";
  const riskLabel = isHighRisk ? "높음" : isMediumRisk ? "중간" : "낮음";

  const diagnosisId = String(data.diagnosisId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>진단 결과</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 진단 이미지 */}
        {data.imageUrl ? (
          <Image
            source={{ uri: data.imageUrl }}
            style={styles.diagnosisImage}
            resizeMode="cover"
          />
        ) : null}

        {/* 상단 상태 카드 */}
        <View style={styles.statusCard}>
          <View style={styles.cardInfoRow}>
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>{issueTypeEmoji(data.issueType)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.issueTitle}>{issueTypeLabel(data.issueType)}</Text>
                <View style={[styles.badge, { backgroundColor: severityBg }]}>
                  <Text style={[styles.badgeText, { color: severityColor }]}>{riskLabel}</Text>
                </View>
              </View>
              <Text style={styles.subInfoText}>감지된 결함: {data.detectionCount}개</Text>
              <Text style={styles.subInfoText}>진단 ID: {data.diagnosisId}</Text>
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

        {/* AI 가이드 요약 */}
        {data.guide?.guide?.summary ? (
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
            <Text style={styles.diagnosisBody}>{data.guide.guide.summary}</Text>
          </View>
        ) : null}

        {/* 추천 처리 방식 */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Feather name="check-circle" size={18} color={MAIN_BLUE} />
            <Text style={styles.sectionTitle}>추천 처리 방식</Text>
          </View>

          <View style={[styles.recommendBox, { backgroundColor: isDIY ? "#f0fdf4" : "#eff6ff", borderColor: isDIY ? "#dcfce7" : "#dbeafe" }]}>
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
              <Text style={[styles.infoValue, { color: isDIY ? "#16a34a" : MAIN_BLUE, fontWeight: "700" }]}>
                {isDIY ? "셀프 가이드" : "전문가 연결"}
              </Text>
            </View>
          </View>
        </View>

        {/* 메인 액션 버튼 */}
        <Pressable
          style={[styles.actionBtn, { backgroundColor: isDIY ? "#22c55e" : MAIN_BLUE }]}
          onPress={() =>
            router.push(
              isDIY
                ? { pathname: "/diy", params: { diagnosisId } }
                : { pathname: "/expert", params: { historyId: diagnosisId, issueType: data.issueType } }
            )
          }
        >
          <Text style={styles.actionBtnText}>
            {isDIY ? "DIY 가이드 확인하기" : "전문 업체 정보 보기"}
          </Text>
        </Pressable>

        {/* 직접 선택 섹션 */}
        <View style={styles.choiceSection}>
          <Text style={styles.choiceTitle}>원하는 방식을 직접 선택할 수 있어요</Text>
          <View style={styles.choiceButtonRow}>
            <Pressable
              style={[styles.choiceButton, styles.choiceButtonLeft]}
              onPress={() => router.push({ pathname: "/diy", params: { diagnosisId } })}
            >
              <MaterialCommunityIcons name="tools" size={18} color="#16a34a" />
              <Text style={styles.choiceButtonText}>DIY 보기</Text>
            </Pressable>
            <Pressable
              style={[styles.choiceButton, styles.choiceButtonRight]}
              onPress={() => router.push({ pathname: "/expert", params: { historyId: diagnosisId, issueType: data.issueType } })}
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
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#f1f5f9",
  },
  scrollContent: { padding: 20, gap: 16 },
  diagnosisImage: {
    width: "100%", height: 200, borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  statusCard: {
    backgroundColor: "#f8faff", borderRadius: 24,
    padding: 20, borderWidth: 1, borderColor: "#e2e8f0",
  },
  cardInfoRow: { flexDirection: "row", gap: 16 },
  iconBox: {
    width: 60, height: 60, backgroundColor: "#fff", borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  iconText: { fontSize: 28 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  issueTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  subInfoText: { fontSize: 13, color: "#64748b", marginBottom: 2 },
  cardFooter: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "#e2e8f0",
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },
  scoreLabel: { fontSize: 11, color: "#64748b", textAlign: "right" },
  scoreValue: { fontSize: 24, fontWeight: "900" },
  contentSection: {
    backgroundColor: "#fff", borderWidth: 1,
    borderColor: "#f1f5f9", borderRadius: 20, padding: 18,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b", flex: 1 },
  fallbackBadge: { backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  fallbackBadgeText: { fontSize: 11, color: "#92400e", fontWeight: "700" },
  diagnosisBody: { fontSize: 14, color: "#475569", lineHeight: 22 },
  recommendBox: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  recommendHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  recommendTitle: { fontSize: 16, fontWeight: "800" },
  recommendReason: { fontSize: 13, color: "#475569", lineHeight: 20 },
  infoList: { gap: 0 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  infoLabel: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  infoValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  actionBtn: {
    height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center",
    shadowColor: MAIN_BLUE, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  choiceSection: {
    backgroundColor: "#fff", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "#e2e8f0", gap: 12,
  },
  choiceTitle: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  choiceButtonRow: { flexDirection: "row", gap: 10 },
  choiceButton: {
    flex: 1, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0",
    backgroundColor: "#fff", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
  choiceButtonLeft: { backgroundColor: "#f0fdf4", borderColor: "#dcfce7" },
  choiceButtonRight: { backgroundColor: "#eff6ff", borderColor: "#dbeafe" },
  choiceButtonText: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
});
