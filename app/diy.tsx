import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "@/src/api/histories";
import { getDiyGuide, DiyGuide } from "@/src/api/guides";

export default function Diy() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();

  const [loading, setLoading] = useState(true);
  const [guide, setGuide] = useState<DiyGuide | null>(null);

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

  if (loading || !guide) {
    return <ScreenState loading />;
  }

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>DIY 가이드</Text>
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
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
          <Text style={{ fontWeight: "800" }}>추천 자재/도구</Text>
          {guide.materials.map((m) => (
            <View key={m.name} style={{ gap: 2 }}>
              <Text>• {m.name}{m.approxCost ? ` (${m.approxCost})` : ""}</Text>
              {m.note ? <Text style={{ opacity: 0.7, marginLeft: 10 }}>- {m.note}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text>뒤로</Text>
      </Pressable>
    </View>
  );
}
