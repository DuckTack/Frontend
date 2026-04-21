import { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, Platform, SafeAreaView, ActivityIndicator, TouchableOpacity } from "react-native";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";

// [원본 API 및 타입 유지]
import { listHistories, deleteHistory, HistorySummary, IssueType } from "../src/api/histories";
import { getReportStatusMapForHistoryIds, ReportStatus } from "../src/api/reports";

const MAIN_BLUE = "#3b82f6";
const HEADER_BG = "#fff";

export default function Histories() {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportStatus, setReportStatus] = useState<Record<string, ReportStatus>>({});
  const [selectedFilter, setSelectedFilter] = useState("전체");

  // [원본 ID 추출 로직 유지]
  function getHistoryId(h: HistorySummary): string {
    const raw: any = (h as any).historyId ?? (h as any).id ?? (h as any).diagnosisId;
    return String(raw ?? "");
  }

  // [원본 리스트 호출 로직]
  async function fetchList() {
    try {
      setLoading(true);
      const data = await listHistories();
      setItems(data || []);

      const ids = (data || []).map((d) => getHistoryId(d)).filter(Boolean);
      if (ids.length > 0) {
        const map = await getReportStatusMapForHistoryIds(ids);
        setReportStatus(map);
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
            // ✅ 삭제 즉시 화면에서 제거 (상태 업데이트)
            setItems((prev) => prev.filter((it) => getHistoryId(it) !== id));
            // 서버에 실제 삭제 요청
            await deleteHistory(id);
          } catch {
            Alert.alert("삭제 실패", "다시 시도해주세요.");
            fetchList(); // 실패했을 때만 다시 목록 불러오기
          }
        },
      },
    ]);
  }

  const issueLabel = (t: IssueType) => {
    switch (t) {
      case "CRACK": return "균열";
      case "LEAK": return "누수";
      case "MOLD": return "곰팡이"; 
      case "DAMAGE": return "파손";
      case "ELECTRIC": return "전기";
      case "GAS": return "가스";
      default: return "기타";
    }
  };

  const getIssueIcon = (t: IssueType) => {
    switch (t) {
      case "LEAK": return { emoji: "💧", color: "#eff6ff" };
      case "CRACK": return { emoji: "🧱", color: "#f5f3ff" };
      case "MOLD": return { emoji: "🦠", color: "#f0fdf4" };
      case "DAMAGE": return { emoji: "🔧", color: "#fff7ed" };
      case "ELECTRIC": return { emoji: "⚡", color: "#fefce8" };
      case "GAS": return { emoji: "🔥", color: "#fff1f2" };
      default: return { emoji: "🏠", color: "#f8fafc" };
    }
  };

  const filteredItems = useMemo(() => {
    let result = [...items];
    if (selectedFilter !== "전체") {
      result = result.filter(it => issueLabel(it.issueType) === selectedFilter);
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {["전체", "균열", "누수", "곰팡이", "파손", "전기", "가스", "기타"].map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={[styles.filterBadge, selectedFilter === filter && styles.filterBadgeActive]}
            >
              <Text style={[styles.filterText, selectedFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.listContainer}>
          {loading && items.length === 0 ? (
            <ActivityIndicator size="large" color={MAIN_BLUE} style={{ marginTop: 40 }} />
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={48} color="#e2e8f0" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>해당하는 진단 기록이 없습니다.</Text>
            </View>
          ) : (
            filteredItems.map((it) => {
              const id = getHistoryId(it);
              const status = reportStatus[id];
              const iconData = getIssueIcon(it.issueType);
              const isHighRisk = it.riskScore > 70;
              const isLowRisk = it.riskScore < 30;

              return (
                <View key={id} style={styles.historyCard}>
                  <Pressable 
                    style={styles.cardMain} 
                    onPress={() => router.push({ pathname: "/result", params: { historyId: id }})}
                  >
                    <View style={[styles.iconBox, { backgroundColor: iconData.color }]}>
                      <Text style={{ fontSize: 26 }}>{iconData.emoji}</Text>
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTypeText}>{issueLabel(it.issueType)}</Text>
                        <View style={[styles.severityBadge, { backgroundColor: isHighRisk ? "#fef2f2" : isLowRisk ? "#f0fdf4" : "#fff7ed" }]}>
                          <Text style={[styles.severityText, { color: isHighRisk ? "#ef4444" : isLowRisk ? "#10b981" : "#f97316" }]}>
                            {isHighRisk ? "위험" : isLowRisk ? "낮음" : "보통"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardFooterRow}>
                        <View style={styles.footerLeft}>
                          <Feather name="calendar" size={12} color="#94a3b8" />
                          {/* ✅ split 제거: 날짜 정보가 없어도 에러가 발생하지 않습니다. */}
                          <Text style={styles.cardDateText}>{it.createdAt || ""}</Text>
                        </View>
                        <Text style={[styles.statusText, { color: status === "READY" ? "#10b981" : status === "GENERATING" ? "#3b82f6" : "#94a3b8" }]}>
                          {status === "READY" ? "리포트 완료" : status === "GENERATING" ? "분석 중" : "분석 대기"}
                        </Text>
                      </View>

                      <View style={styles.costRow}>
                        <View>
                           <Text style={styles.costLabel}>위험도 지수</Text>
                           <Text style={[styles.costValue, { color: isHighRisk ? "#ef4444" : MAIN_BLUE }]}>{it.riskScore}%</Text>
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
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 10 : 20, paddingBottom: 16, backgroundColor: HEADER_BG },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  filterWrapper: { backgroundColor: "#fff", paddingBottom: 20, paddingTop: 8 },
  filterScroll: { paddingHorizontal: 24, gap: 10 },
  filterBadge: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: "#f3f4f6" },
  filterBadgeActive: { backgroundColor: MAIN_BLUE },
  filterText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  filterTextActive: { color: "#fff" },
  listContainer: { paddingHorizontal: 24 },
  historyCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 }
    })
  },
  cardMain: { flexDirection: "row", gap: 12 },
  iconBox: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTypeText: { fontSize: 17, fontWeight: "700", color: "#1e293b" },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityText: { fontSize: 11, fontWeight: "800" },
  cardFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDateText: { fontSize: 12, color: "#94a3b8" },
  statusText: { fontSize: 12, fontWeight: "700" },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f8fafc" },
  costLabel: { fontSize: 11, color: "#94a3b8" },
  costValue: { fontSize: 17, fontWeight: "800", color: MAIN_BLUE },
  deleteIconButton: { padding: 8 }, 
  emptyBox: { padding: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: "#94a3b8", fontSize: 15, textAlign: 'center' }
});