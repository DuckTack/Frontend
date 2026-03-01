import { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { router } from "expo-router";

import { startDiagnosis } from "@/src/api/diagnosis";

const STEPS = ["분석 중...", "판단 중...", "평가 중..."];

export default function Analyzing() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    const t1 = setTimeout(() => alive && setStepIndex(1), 700);
    const t2 = setTimeout(() => alive && setStepIndex(2), 1400);

    // 이제 mock 이동도 API 레이어에서 관리
    // Backend1 오면 startDiagnosis() 내부만 실제 호출로 교체하면 됨
    const t3 = setTimeout(async () => {
      try {
        const { historyId } = await startDiagnosis();
        // 업로드 플로우는 결과까지 보고 나면, iOS 제스처로 자연스럽게 이전 화면(업로드)로 돌아가도록 둡니다.
        router.replace({ pathname: "/result", params: { historyId } });
      } catch {
        Alert.alert("분석 실패", "다시 시도해주세요.");
        router.back();
      }
    }, 2200);

    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{STEPS[stepIndex]}</Text>
      <Text style={{ opacity: 0.7 }}>잠시만 기다려주세요…</Text>
    </View>
  );
}
