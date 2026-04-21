import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Linking, Alert, ScrollView, StyleSheet, Platform } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getDiyGuide, DiyGuide } from "../src/api/guides";

const MAIN_BLUE = "#3b82f6";
type FeedbackValue = "LIKE" | "DISLIKE";

export default function Diy() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();

  // [원본 로직 스테이트 유지]
  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<DiyGuide | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackValue | undefined>>({});
  const [usingMockGuide, setUsingMockGuide] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let t: IssueType = (issueType as IssueType) || "MOLD";
        if (historyId) {
          try {
            const h = await getHistoryDetail(String(historyId));
            t = h.issueType;
            setUsingMockGuide(false);
          } catch {
            t = (issueType as IssueType) || "MOLD";
            setUsingMockGuide(true);
          }
        } else {
          setUsingMockGuide(true);
        }
        const g = await getDiyGuide(t);
        setGuide(g);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [historyId, issueType]);

  async function openBuyUrl(url?: string) {
    if (!url) return;
    try {
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

  if (loading || !guide) {
    return <ScreenState loading />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>DIY 가이드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 상단 타이틀 영역 */}
        <View style={styles.titleSection}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.mainTitle}>DIY 가이드</Text>
            {usingMockGuide ? <Text style={styles.mockText}>샘플 데이터</Text> : null}
          </View>
          <Text style={styles.subDescription}>{guide.title}</Text>
        </View>

        {/* 수리 단계 (Steps) */}
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

        {/* 주의사항 (Cautions) */}
        {guide.cautions && guide.cautions.length > 0 ? (
          <View style={[styles.card, styles.cautionCard]}>
            <View style={styles.cardHeader}>
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <Text style={[styles.cardTitle, { color: "#ef4444" }]}>주의</Text>
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

        {/* 자재 리스트 (Materials) */}
        {guide.materials && guide.materials.length > 0 ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="shopping-bag" size={18} color={MAIN_BLUE} />
              <Text style={styles.cardTitle}>추천 자재/도구</Text>
            </View>
            {guide.materials.map((m, i) => {
              const feedback = feedbackMap[m.id];
              return (
                <View key={m.id} style={[styles.materialItem, i === guide.materials!.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialName}>{m.name}</Text>
                    <View style={styles.materialMeta}>
                      <Text style={styles.materialCost}>가격대: {m.approxCost || "미정"}</Text>
                      {m.note && <Text style={styles.materialNote}>| {m.note}</Text>}
                    </View>
                    
                    {m.reason ? (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.reasonTitle}>추천 이유</Text>
                        <Text style={styles.reasonText}>{m.reason}</Text>
                      </View>
                    ) : null}

                    {/* 액션 버튼 영역 (구매 및 피드백) */}
                    <View style={styles.actionRow}>
                      {m.buyUrl ? (
                        <Pressable onPress={() => openBuyUrl(m.buyUrl)} style={styles.buyBtn}>
                          <Text style={styles.buyBtnText}>구매 링크 보기</Text>
                        </Pressable>
                      ) : null}
                      
                      <View style={styles.feedbackGroup}>
                        <Pressable onPress={() => selectFeedback(m.id, "LIKE")} style={[styles.fBtn, feedback === "LIKE" && styles.fBtnActive]}>
                          <Text style={{ opacity: feedback === "LIKE" ? 1 : 0.5 }}>👍 만족</Text>
                        </Pressable>
                        <Pressable onPress={() => selectFeedback(m.id, "DISLIKE")} style={[styles.fBtn, feedback === "DISLIKE" && styles.fBtnActive]}>
                          <Text style={{ opacity: feedback === "DISLIKE" ? 1 : 0.5 }}>👎 아쉬움</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
            {materialFeedbackNote ? <Text style={styles.feedbackNote}>{materialFeedbackNote}</Text> : null}
          </View>
        ) : null}

        {/* 하단 뒤로가기 버튼 */}
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
  scrollContent: { padding: 20 },
  titleSection: { marginBottom: 24, paddingHorizontal: 4 },
  mainTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  mockText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  subDescription: { fontSize: 15, color: "#64748b", lineHeight: 22 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },

  stepList: { paddingLeft: 4 },
  stepRow: { flexDirection: "row", gap: 16, minHeight: 64 },
  stepIndicator: { alignItems: "center" },
  stepNumberBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MAIN_BLUE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepNumber: { color: "#fff", fontSize: 13, fontWeight: "800" },
  stepLine: { width: 2, flex: 1, backgroundColor: "#eff6ff", marginVertical: 4 },
  stepText: { flex: 1, fontSize: 15, color: "#334155", lineHeight: 24, paddingTop: 2 },

  cautionCard: { borderColor: "#fee2e2" },
  cautionRow: { flexDirection: "row", gap: 8 },
  cautionBullet: { color: "#ef4444", fontWeight: "900", fontSize: 16 },
  cautionText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 22 },

  materialItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  materialInfo: { flex: 1 },
  materialName: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  materialMeta: { flexDirection: "row", gap: 6, alignItems: "center" },
  materialCost: { fontSize: 13, color: MAIN_BLUE, fontWeight: "600" },
  materialNote: { fontSize: 12, color: "#94a3b8" },
  reasonTitle: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 2 },
  reasonText: { fontSize: 14, color: "#64748b", lineHeight: 20 },

  actionRow: { marginTop: 16, gap: 10 },
  buyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  buyBtnText: { fontWeight: "700", color: "#1e293b", fontSize: 14 },
  feedbackGroup: { flexDirection: "row", gap: 8 },
  fBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "#fafafa",
    alignItems: "center",
  },
  fBtnActive: { borderColor: MAIN_BLUE, backgroundColor: "#eff6ff" },
  feedbackNote: { fontSize: 12, color: "#94a3b8", marginTop: 12, textAlign: "center" },

  footerBackBtn: {
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  footerBackBtnText: { fontWeight: "700", color: "#64748b" },
});