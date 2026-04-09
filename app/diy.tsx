import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Linking, Alert, ScrollView } from "react-native";
import ScreenState from "../src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getDiyGuide, DiyGuide } from "../src/api/guides";

type FeedbackValue = "LIKE" | "DISLIKE";

export default function Diy() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();

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
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>DIY 가이드</Text>
        {usingMockGuide ? <Text style={{ opacity: 0.65 }}>샘플 데이터</Text> : null}
      </View>
      <Text style={{ opacity: 0.7 }}>{guide.title}</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
        {guide.steps.map((s, i) => (
          <Text key={i}>
            {i + 1}. {s}
          </Text>
        ))}
      </View>

      {guide.cautions && guide.cautions.length > 0 ? (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 6, opacity: 0.85 }}>
          <Text style={{ fontWeight: "800" }}>주의</Text>
          {guide.cautions.map((c) => (
            <Text key={c}>• {c}</Text>
          ))}
        </View>
      ) : null}

      {guide.materials && guide.materials.length > 0 ? (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 10 }}>
          <Text style={{ fontWeight: "800" }}>추천 자재/도구</Text>

          {guide.materials.map((m) => {
            const feedback = feedbackMap[m.id];
            return (
              <View key={m.id} style={{ gap: 10, padding: 14, borderWidth: 1, borderRadius: 14, backgroundColor: "#fafafa" }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800" }}>{m.name}</Text>
                  <Text style={{ opacity: 0.72 }}>가격대: {m.approxCost || "미정"}</Text>
                </View>

                {m.reason ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontWeight: "700" }}>추천 이유</Text>
                    <Text style={{ opacity: 0.78, lineHeight: 20 }}>{m.reason}</Text>
                  </View>
                ) : null}

                {m.note ? (
                  <Text style={{ opacity: 0.72 }}>참고: {m.note}</Text>
                ) : null}

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {m.buyUrl ? (
                    <Pressable
                      onPress={() => openBuyUrl(m.buyUrl)}
                      style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 }}
                    >
                      <Text style={{ fontWeight: "700" }}>구매 링크 보기</Text>
                    </Pressable>
                  ) : null}

                  <Pressable onPress={() => selectFeedback(m.id, "LIKE")} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, opacity: feedback === "LIKE" ? 1 : 0.65 }}>
                    <Text>👍 만족</Text>
                  </Pressable>
                  <Pressable onPress={() => selectFeedback(m.id, "DISLIKE")} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, opacity: feedback === "DISLIKE" ? 1 : 0.65 }}>
                    <Text>👎 아쉬움</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}

          {materialFeedbackNote ? <Text style={{ opacity: 0.68, lineHeight: 20 }}>{materialFeedbackNote}</Text> : null}
        </View>
      ) : null}

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text>뒤로</Text>
      </Pressable>
    </ScrollView>
  );
}
