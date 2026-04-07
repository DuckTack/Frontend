import { useEffect, useState } from "react";
import { View, Text, Pressable, Linking, Alert, ScrollView, StyleSheet, Platform } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// [원본 API 및 컴포넌트 경로 유지]
import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getDiyGuide, DiyGuide } from "../src/api/guides";

const MAIN_BLUE = "#3b82f6";

export default function Diy() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();
  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<DiyGuide | null>(null);

  // --- 원본 로직 유지 ---
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let t: IssueType = (issueType as IssueType) || "MOLD";
        if (historyId) {
          const h = await getHistoryDetail(String(historyId));
          t = h.issueType;
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
        <Text style={styles.headerTitle}>DIY 수리 가이드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 상단 타이틀 섹션 */}
        <View style={styles.titleSection}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>셀프 수리 권장</Text>
          </View>
          <Text style={styles.mainTitle}>{guide.title}</Text>
          <Text style={styles.subDescription}>AI가 분석한 안전하고 효율적인 수리 절차입니다.</Text>
        </View>

        {/* 수리 단계 (Steps) - 타임라인 스타일 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="format-list-numbered" size={20} color={MAIN_BLUE} />
            <Text style={styles.cardTitle}>수리 단계</Text>
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

        {/* 주의사항 (Cautions) - 경고 스타일 */}
        {guide.cautions && guide.cautions.length > 0 && (
          <View style={[styles.card, styles.cautionCard]}>
            <View style={styles.cardHeader}>
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <Text style={[styles.cardTitle, { color: "#ef4444" }]}>작업 시 주의사항</Text>
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
        )}

        {/* 추천 자재 (Materials) - 쇼핑 리스트 스타일 */}
        {guide.materials && guide.materials.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="shopping-bag" size={18} color={MAIN_BLUE} />
              <Text style={styles.cardTitle}>필요한 자재/도구</Text>
            </View>
            {guide.materials.map((m, i) => (
              <View key={i} style={[styles.materialItem, i === guide.materials!.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.materialInfo}>
                  <Text style={styles.materialName}>{m.name}</Text>
                  <View style={styles.materialMeta}>
                    {m.approxCost && <Text style={styles.materialCost}>{m.approxCost}</Text>}
                    {m.note && <Text style={styles.materialNote}>| {m.note}</Text>}
                  </View>
                </View>
                {m.buyUrl && (
                  <Pressable onPress={() => openBuyUrl(m.buyUrl)} style={styles.buyBtn}>
                    <Text style={styles.buyBtnText}>최저가</Text>
                    <Feather name="external-link" size={12} color="#fff" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

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

  // 타이틀 섹션
  titleSection: { marginBottom: 24, paddingHorizontal: 4 },
  typeBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  typeBadgeText: { color: "#16a34a", fontSize: 12, fontWeight: "800" },
  mainTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 8 },
  subDescription: { fontSize: 14, color: "#64748b", lineHeight: 20 },

  // 카드 공통
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },

  // 수리 단계 (타임라인)
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

  // 주의사항
  cautionCard: { borderColor: "#fee2e2" },
  cautionRow: { flexDirection: "row", gap: 8 },
  cautionBullet: { color: "#ef4444", fontWeight: "900", fontSize: 16 },
  cautionText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 22 },

  // 자재 아이템
  materialItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  materialInfo: { flex: 1, gap: 4 },
  materialName: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  materialMeta: { flexDirection: "row", gap: 6, alignItems: "center" },
  materialCost: { fontSize: 13, color: MAIN_BLUE, fontWeight: "700" },
  materialNote: { fontSize: 12, color: "#94a3b8" },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  buyBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});