import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { startDiagnosis } from "../src/api/diagnosis";
import { showAlert } from "../src/utils/showAlert";

const STEPS = ["분석 중...", "판단 중...", "평가 중..."];

export default function Analyzing() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    const t1 = setTimeout(() => alive && setStepIndex(1), 700);
    const t2 = setTimeout(() => alive && setStepIndex(2), 1400);

    const t3 = setTimeout(async () => {
      try {
        const { historyId } = await startDiagnosis();
        router.replace({ pathname: "/result", params: { historyId } });
      } catch (e: any) {
        console.error("[analyzing] startDiagnosis failed", e?.response?.status, e?.response?.data ?? e);
        const status = e?.response?.status;
        const code = String(e?.response?.data?.code ?? e?.response?.data?.message ?? e?.message ?? "");
        if (status === 401 || status === 403 || code.includes("AUTH") || code.includes("ACCESS_DENIED")) {
          showAlert("분석 실패", "로그인 토큰 또는 권한 문제입니다. 다시 로그인 후 시도해주세요.");
        } else if (code.includes("NO_PENDING_IMAGES")) {
          showAlert("분석 실패", "분석할 사진이 없습니다. 다시 선택해주세요.");
        } else {
          showAlert("분석 실패", "사진 업로드/분석 API 응답을 확인해주세요.");
        }
        router.replace("/upload");
      }
    }, 1200);

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
