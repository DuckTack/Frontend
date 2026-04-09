import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType, HistoryDetail } from "../src/api/histories";

function issueTypeLabel(t: IssueType) {
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

export default function Result() {
  const params = useLocalSearchParams<{ historyId?: string }>();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);

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

  if (loading) {
    return <ScreenState loading />;
  }

  if (!detail) {
    return <ScreenState title="결과를 불러오지 못했어요" errorMessage="historyId 또는 서버 응답을 확인해주세요." />;
  }

  if (detail.status === "ANALYZING") {
    return <ScreenState title="분석 진행 중" errorMessage="백엔드 분석이 끝나면 이 화면이 자동으로 갱신됩니다." />;
  }

  if (detail.status === "FAILED") {
    return <ScreenState title="분석 실패" errorMessage="백엔드 로그를 확인해주세요." />;
  }

  const riskColor = detail.riskScore >= 70 ? "#ef4444" : detail.riskScore >= 40 ? "#f59e0b" : "#22c55e";
  const riskLabel = detail.riskScore >= 70 ? "높음" : detail.riskScore >= 40 ? "중간" : "낮음";

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>진단 결과</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>{issueTypeLabel(detail.issueType)}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: riskColor }} />
          <Text>위험도: {detail.riskScore}% ({riskLabel})</Text>
        </View>
        <Text>추천: {detail.recommendation === "DIY" ? "DIY" : "전문업체"}</Text>
        <Text>진단 ID: {detail.diagnosisId ?? "-"}</Text>
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
        <Text style={{ fontWeight: "800" }}>상세 정보</Text>
        <Text style={{ opacity: 0.8 }}>현재 백엔드 history detail 응답에는 원인/주의사항/이미지 URL이 포함되지 않아 기본 결과만 표시합니다.</Text>
      </View>

      <Pressable
        onPress={() =>
          router.push(
            detail.recommendation === "DIY"
              ? { pathname: "/diy", params: { historyId: String(detail.id) } }
              : { pathname: "/expert", params: { historyId: String(detail.id) } }
          )
        }
        style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}
      >
        <Text>{detail.recommendation === "DIY" ? "DIY 방법 보기" : "전문업체 안내 보기"}</Text>
      </Pressable>
    </View>
  );
}
