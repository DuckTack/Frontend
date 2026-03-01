import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "@/src/api/histories";
import { getExpertInfo, ExpertInfo } from "@/src/api/guides";

export default function Expert() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ExpertInfo | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let t: IssueType = (issueType as IssueType) || "MOLD";
        if (historyId) {
          const h = await getHistoryDetail(String(historyId));
          t = h.issueType;
        }
        const i = await getExpertInfo(t);
        setInfo(i);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [historyId, issueType]);

  if (loading || !info) {
    return <ScreenState loading />;
  }

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>전문가 안내</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
        <Text style={{ fontWeight: "700" }}>예상 견적</Text>
        <Text>{info.estimateRange}</Text>

        <Text style={{ fontWeight: "700", marginTop: 8 }}>업체 리스트(예시)</Text>
        {info.vendors.map((v) => (
          <Text key={v}>• {v}</Text>
        ))}

        {info.notes && info.notes.length > 0 ? (
          <>
            <Text style={{ fontWeight: "700", marginTop: 8 }}>참고</Text>
            {info.notes.map((n) => (
              <Text key={n}>- {n}</Text>
            ))}
          </>
        ) : null}

        {info.whyPro && info.whyPro.length > 0 ? (
          <>
            <Text style={{ fontWeight: "700", marginTop: 8 }}>왜 전문가가 필요할 수 있나요?</Text>
            {info.whyPro.map((r) => (
              <Text key={r}>• {r}</Text>
            ))}
          </>
        ) : null}
      </View>

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text>뒤로</Text>
      </Pressable>
    </View>
  );
}
