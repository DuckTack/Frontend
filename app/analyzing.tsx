import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

import { startDiagnosis } from "../src/api/diagnosis";
import { showAlert } from "../src/utils/showAlert";

const STEPS = ["이미지 분석 중...", "AI 판단 중...", "가이드 생성 중..."];

export default function Analyzing() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    const t1 = setTimeout(() => alive && setStepIndex(1), 2000);
    const t2 = setTimeout(() => alive && setStepIndex(2), 6000);

    async function run() {
      try {
        const { diagnosisId } = await startDiagnosis(true); // 항상 DIY 단계 포함
        if (!alive) return;
        router.replace({ pathname: "/result", params: { diagnosisId } });
      } catch (e: any) {
        if (!alive) return;
        console.error("[analyzing] startDiagnosis failed", e?.response?.status, e?.response?.data ?? e);
        const status = e?.response?.status;
        const code = String(e?.response?.data?.code ?? e?.message ?? "");
        if (status === 401 || status === 403 || code.includes("AUTH")) {
          showAlert("분석 실패", "로그인이 필요합니다. 다시 로그인 후 시도해주세요.");
        } else if (code.includes("NO_PENDING_IMAGES")) {
          showAlert("분석 실패", "분석할 사진이 없습니다. 다시 선택해주세요.");
        } else {
          showAlert("분석 실패", "AI 서버 연결을 확인해주세요. 잠시 후 다시 시도해주세요.");
        }
        router.replace("/upload");
      }
    }

    run();

    return () => {
      alive = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 40 }}>🔍</Text>
      <Text style={{ fontSize: 22, fontWeight: "700", color: "#1e293b" }}>{STEPS[stepIndex]}</Text>
      <Text style={{ fontSize: 14, color: "#94a3b8" }}>YOLO + AI가 분석하고 있어요</Text>
    </View>
  );
}
