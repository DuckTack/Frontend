import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

// [원본 상대 경로 및 컴포넌트 유지]
import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType, HistoryDetail } from "../src/api/histories";

const MAIN_BLUE = "#3b82f6";

function issueTypeLabel(t: IssueType) {
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

export default function Result() {
  const params = useLocalSearchParams<{ historyId?: string }>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);

  // --- 원본 Polling 로직 유지 ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function fetchDetail() {
      if (!params.historyId) {
        setLoading(false);
        return;
      }
      try {
        const d = await getHistoryDetail(params.historyId);
        if (cancelled) return;
        setDetail(d);
        setLoading(false);

        // 분석 중일 때 2초마다 재시도
        if (d.status === "ANALYZING") {
          timer = setTimeout(fetchDetail, 2000);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    fetchDetail();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [params.historyId]);

  // --- 원본 상태 분기 유지 ---
  if (loading) return <ScreenState loading />;
  if (!detail) return <ScreenState title="결과를 불러오지 못했어요" errorMessage="historyId 또는 서버 응답을 확인해주세요." />;
  
  if (detail.status === "ANALYZING") {
    return <ScreenState title="분석 진행 중" errorMessage="백엔드 분석이 끝나면 이 화면이 자동으로 갱신됩니다." />;
  }
  if (detail.status === "FAILED") {
    return <ScreenState title="분석 실패" errorMessage="백엔드 로그를 확인해주세요." />;
  }

  // 디자인 계산 로직
  const isHighRisk = detail.riskScore >= 70;
  const isDIY = detail.recommendation === "DIY";
  const severityColor = isHighRisk ? "#ef4444" : detail.riskScore >= 40 ? "#f97316" : "#10b981";
  const severityBg = isHighRisk ? "#fef2f2" : detail.riskScore >= 40 ? "#fff7ed" : "#f0fdf4";
  const riskLabel = isHighRisk ? "높음" : detail.riskScore >= 40 ? "중간" : "낮음";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>진단 결과 상세</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 상단 상태 카드 */}
        <View style={styles.statusCard}>
          <View style={styles.cardInfoRow}>
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>
                {detail.issueType === "LEAK" ? "💧" : detail.issueType === "CRACK" ? "⚡" : "🏠"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.issueTitle}>{issueTypeLabel(detail.issueType)}</Text>
                <View style={[styles.badge, { backgroundColor: severityBg }]}>
                  <Text style={[styles.badgeText, { color: severityColor }]}>{riskLabel}</Text>
                </View>
              </View>
              <View style={styles.subInfoRow}>
                <Feather name="info" size={14} color="#64748b" />
                <Text style={styles.subInfoText}>진단 ID: {detail.diagnosisId ?? "-"}</Text>
              </View>
              <View style={styles.subInfoRow}>
                <Feather name="calendar" size={14} color="#64748b" />
                <Text style={styles.subInfoText}>{detail.createdAt || "방금 전"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={[styles.statusBadge, { backgroundColor: "#f0fdf4" }]}>
              <Text style={[styles.statusBadgeText, { color: "#16a34a" }]}>분석 완료</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.scoreLabel}>위험도 점수</Text>
              <Text style={[styles.scoreValue, { color: severityColor }]}>{detail.riskScore}%</Text>
            </View>
          </View>
        </View>

        {/* 상세 진단 내용 섹션 */}
        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Feather name="alert-circle" size={18} color={MAIN_BLUE} />
            <Text style={styles.sectionTitle}>상세 분석 정보</Text>
          </View>
          <Text style={styles.diagnosisBody}>
            {detail.cause || "현재 분석 결과에 따르면 해당 위치에 " + issueTypeLabel(detail.issueType) + " 현상이 발견되었습니다. 정확한 원인 파악을 위해 아래 추천 처리 방식을 참고해 주세요."}
          </Text>
        </View>

        {/* 추천 처리 방식 섹션 */}
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
              {detail.recommendation === "DIY" 
                ? "비교적 간단한 작업으로 직접 수리가 가능합니다. 가이드를 따라 진행해보세요." 
                : "전문적인 장비와 기술이 필요한 사안입니다. 업체 진단을 추천드립니다."}
            </Text>
          </View>

          {/* 추가 정보 리스트 */}
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>예상 긴급도</Text>
              <View style={[styles.badge, { backgroundColor: severityBg }]}>
                <Text style={[styles.badgeText, { color: severityColor }]}>{riskLabel}</Text>
              </View>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>추천 경로</Text>
              <Text style={[styles.infoValue, { color: isDIY ? "#16a34a" : MAIN_BLUE, fontWeight: "700" }]}>
                {isDIY ? "셀프 수리" : "전문가 연결"}
              </Text>
            </View>
          </View>
        </View>

        {/* 하단 액션 버튼 */}
        <Pressable
          style={[styles.actionBtn, { backgroundColor: isDIY ? "#22c55e" : MAIN_BLUE }]}
          onPress={() =>
            router.push(
              isDIY
                ? { pathname: "/diy", params: { historyId: String(detail.id) } }
                : { pathname: "/expert", params: { historyId: String(detail.id) } }
            )
          }
        >
          <Text style={styles.actionBtnText}>
            {isDIY ? "DIY 가이드 확인하기" : "전문 업체 정보 보기"}
          </Text>
        </Pressable>

        <View style={{ height: 20 }} />
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
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  scrollContent: { padding: 24, gap: 20 },

  // 상태 카드
  statusCard: {
    backgroundColor: "#f8faff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardInfoRow: { flexDirection: "row", gap: 16 },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  iconText: { fontSize: 32 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  issueTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  subInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  subInfoText: { fontSize: 13, color: "#64748b" },
  cardFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusBadgeText: { fontSize: 13, fontWeight: "700" },
  scoreLabel: { fontSize: 11, color: "#64748b", textAlign: 'right' },
  scoreValue: { fontSize: 22, fontWeight: "900" },

  // 섹션 공통
  contentSection: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 24,
    padding: 20,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  diagnosisBody: { fontSize: 15, color: "#475569", lineHeight: 24 },

  // 추천 박스
  recommendBox: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  recommendHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  recommendTitle: { fontSize: 17, fontWeight: "800" },
  recommendReason: { fontSize: 14, color: "#475569", lineHeight: 22 },

  // 인포 리스트
  infoList: { gap: 4 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoLabel: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  infoValue: { fontSize: 14, fontWeight: "700", color: "#1e293b" },

  // 액션 버튼
  actionBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: MAIN_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
});