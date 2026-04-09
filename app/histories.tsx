// 삭제 버튼을 누르면 목록에서 사라진 거처럼 보이지만 나갔다 들어오면 다시 생김
import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { listHistories, deleteHistory, HistorySummary, IssueType } from "../src/api/histories";
import { getReportStatusMapForHistoryIds, ReportStatus } from "../src/api/reports";

function getHistoryId(h: HistorySummary): string {
  const raw: any = (h as any).historyId ?? (h as any).id ?? (h as any).diagnosisId;
  return String(raw ?? "");
}

function issueLabel(t: IssueType) {
  switch (t) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    case "DAMAGE":
      return "파손";
    case "ELECTRIC":
      return "전기";
    case "GAS":
      return "가스";
    default:
      return "기타";
  }
}

export default function Histories() {
  const [items, setItems] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportStatus, setReportStatus] = useState<Record<string, ReportStatus>>({});

  async function fetchList() {
    try {
      setLoading(true);
      const data = await listHistories();
      setItems(data);

      // 히스토리 목록에서 바로 "리포트(PDF) 준비 여부"를 보여주기 위해 status map을 함께 로드
      const ids = data
        .map((d) => getHistoryId(d))
        .filter((x): x is string => Boolean(x));
      const map = await getReportStatusMapForHistoryIds(ids);
      setReportStatus(map);
    } catch {
      Alert.alert("불러오기 실패", "서버 상태를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  useFocusEffect(
    // 탭으로 왔다 갔다 해도 새 진단 내역이 반영되도록
    useMemo(() => {
      return () => {
        fetchList();
      };
    }, [])
  );

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [items]);

  function reportLabel(id: string): string {
    const st = reportStatus[id];
    if (!st || st === "NONE") return "리포트: 없음";
    if (st === "GENERATING") return "리포트: 생성 중";
    if (st === "READY") return "리포트: 제출용(READY)";
    return "리포트: 실패";
  }

  function openDetail(item: HistorySummary) {
    // ✅ 앞으로는 params로 값 전체를 넘기지 않고 id만 넘깁니다.
    // Result 화면에서 GET /api/histories/{id} 로 상세 조회하는 구조입니다.
    router.push({
      pathname: "/result",
      params: { historyId: getHistoryId(item) },
    });
  }
  function deleteItem(id: string) {
    Alert.alert("삭제", "이 진단 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteHistory(id);
            fetchList(); // 서버에서 다시 목록 불러오기
          } catch {
            Alert.alert("삭제 실패");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>히스토리</Text>

      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
        {loading ? (
          <View style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}>
            <Text style={{ opacity: 0.7 }}>불러오는 중...</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}>
            <Text style={{ opacity: 0.7 }}>아직 진단 기록이 없습니다.</Text>
          </View>
        ) : (
          sorted.map((it) => (
            <View key={getHistoryId(it)} style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
              <Text style={{ fontWeight: "800" }}>
                {it.createdAt} · {issueLabel(it.issueType)}
              </Text>

              <Text>위험도: {it.riskScore}%</Text>
              <Text>추천: {it.recommendation === "DIY" ? "DIY" : "전문업체"}</Text>
              <Text style={{ opacity: 0.85 }}>{reportLabel(getHistoryId(it))}</Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <Pressable
                  onPress={() => openDetail(it)}
                  style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}
                >
                  <Text>상세보기</Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteItem(getHistoryId(it))}
                  style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}
                >
                  <Text>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
