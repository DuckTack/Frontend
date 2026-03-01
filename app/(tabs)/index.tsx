import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, View, Text, Pressable, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { listHistories, type HistorySummary } from "@/src/api/histories";
import { clearAccessToken } from "@/src/store/tokenStorage";


function getHistoryId(h: HistorySummary, fallbackIndex?: number) {
  const raw = (h as any).historyId ?? (h as any).id ?? fallbackIndex;
  return String(raw);
}
function issueLabel(t: HistorySummary["issueType"]) {
  switch (t) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    default:
      return "기타";
  }
}

export default function HomeTab() {
  const [loading, setLoading] = useState(true);
  const [histories, setHistories] = useState<HistorySummary[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const items = await listHistories();
      setHistories(items);
    } catch {
      // 홈은 실패해도 앱이 깨지지 않게 조용히 처리
      setHistories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      // 다른 화면 다녀온 후 홈으로 돌아오면 최신 상태 반영
      load();
    }, [load])
  );

  const recent = useMemo(() => {
    return [...histories]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 10);
  }, [histories]);

  async function logout() {
    await clearAccessToken();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
        {/* 상단 헤더 */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "800" }}>홈</Text>
          <Pressable
            onPress={() => {
              Alert.alert("로그아웃", "정말 로그아웃할까요?", [
                { text: "취소", style: "cancel" },
                { text: "로그아웃", style: "destructive", onPress: logout },
              ]);
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10 }}
          >
            <Text>로그아웃</Text>
          </Pressable>
        </View>

        {/* 핵심 CTA: 진단 */}
        <Pressable
          onPress={() => router.push("/(tabs)/upload")}
          style={{
            borderWidth: 2,
            borderRadius: 16,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "900" }}>자취방 및 가정 수리, 청소 AI 어시스턴트</Text>
          <Text style={{ opacity: 0.75 }}>
            자취방 및 가정집에서 발생하는 청소, 수리, 원상복구 문제를 사용자가 촬영한 사진으로 AI가 진단하고, 위험도에 따라 DIY 해결과 전문가 호출을 자동 분기하는 주거 관리 서비스입니다.
          </Text>
          <View style={{ marginTop: 8, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 }}>
            <Text style={{ fontWeight: "700" }}>진단 시작</Text>
          </View>
        </Pressable>

        {/* 최근 진단: 수평 카드 */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "800" }}>최근 진단</Text>
            <Pressable onPress={() => router.push("/(tabs)/histories")}> 
              <Text style={{ textDecorationLine: "underline", opacity: 0.8 }}>전체보기</Text>
            </Pressable>
          </View>

          {loading ? (
            <Text style={{ opacity: 0.7 }}>불러오는 중...</Text>
          ) : recent.length === 0 ? (
            <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 }}>
              <Text style={{ fontWeight: "700" }}>아직 진단 기록이 없어요</Text>
              <Text style={{ opacity: 0.75 }}>첫 진단을 시작해보세요.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {recent.map((h, idx) => (
                <Pressable
                  key={getHistoryId(h, idx)}
                  onPress={() =>
                    router.push({
                      pathname: "/result",
                      params: { historyId: getHistoryId(h, idx) },
                    })
                  }
                  style={{ width: 220, borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 }}
                >
                  <Text style={{ fontWeight: "800" }}>{issueLabel(h.issueType)}</Text>
                  <Text style={{ opacity: 0.75 }}>{new Date(h.createdAt).toISOString().slice(0, 10)}</Text>
                  <Text>위험도: {h.riskScore}%</Text>
                  <Text style={{ opacity: 0.7 }}>상태: {h.status}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
