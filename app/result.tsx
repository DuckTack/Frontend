import { useEffect, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType, Recommendation, HistoryDetail } from "@/src/api/histories";

function issueTypeLabel(t: IssueType) {
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

export default function Result() {
  const params = useLocalSearchParams<{
    historyId?: string;
    mock?: string;
    issueType?: string;
    riskScore?: string;
    recommendation?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<HistoryDetail | null>(null);

  // ✅ 우선순위:
  // 1) historyId가 있으면 API에서 상세 조회 (DEV면 mock 반환)
  // 2) 없으면 기존 방식(파라미터로 넘겨받은 mock 값) 사용
  useEffect(() => {
    async function fetchDetail() {
      if (params.historyId) {
        try {
          setLoading(true);
          const d = await getHistoryDetail(params.historyId);
          setDetail(d);
        } finally {
          setLoading(false);
        }
        return;
      }

      // fallback: 기존 mock params
      const issueType: IssueType = (params.issueType as IssueType) || "MOLD";
      const riskScore = Number(params.riskScore ?? "78");
      const recommendation: Recommendation = (params.recommendation as Recommendation) || "DIY";

      setDetail({
        id: "mock",
        status: "COMPLETED",
        createdAt: new Date().toISOString().slice(0, 10),
        issueType,
        riskScore,
        recommendation,
        cause: "환기 부족으로 인한 곰팡이 가능성이 높아요.",
        naturalOrHuman: "자연(환경) 요인 가능성 ↑",
        caution: "호흡기 민감하면 마스크 착용 권장. 표면만 닦고 끝내지 말고 원인 제거가 중요해요.",
      });
      setLoading(false);
    }

    fetchDetail();
  }, [params.historyId, params.issueType, params.riskScore, params.recommendation]);

  if (loading || !detail) {
    return <ScreenState loading />;
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
      </View>

      {detail.imageUris && detail.imageUris.length > 0 && (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
          <Text style={{ fontWeight: "800" }}>진단에 사용한 사진</Text>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            {detail.imageUris.slice(0, 6).map((uri, idx) => (
              <Image
                key={`${uri}_${idx}`}
                source={{ uri }}
                style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1 }}
              />
            ))}
          </View>
          {detail.imageUris.length > 6 && <Text style={{ opacity: 0.7 }}>+ {detail.imageUris.length - 6}장 더 있음</Text>}
        </View>
      )}

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
        <Text style={{ fontWeight: "800" }}>원인(추정)</Text>
        <Text style={{ opacity: 0.8 }}>{detail.cause ?? "준비중"}</Text>

        <Text style={{ fontWeight: "800", marginTop: 6 }}>자연/인위 요인</Text>
        <Text style={{ opacity: 0.8 }}>{detail.naturalOrHuman ?? "준비중"}</Text>

        <Text style={{ fontWeight: "800", marginTop: 6 }}>주의사항</Text>
        <Text style={{ opacity: 0.8 }}>{detail.caution ?? "준비중"}</Text>
      </View>

      <Pressable
        onPress={() =>
          router.push(
            detail.recommendation === "DIY"
              ? { pathname: "/diy", params: { historyId: detail.id } }
              : { pathname: "/expert", params: { historyId: detail.id } }
          )
        }
        style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}
      >
        <Text>{detail.recommendation === "DIY" ? "DIY 방법 보기" : "전문업체 안내 보기"}</Text>
      </Pressable>
    </View>
  );
}
