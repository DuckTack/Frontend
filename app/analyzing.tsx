import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";

import { startDiagnosis } from "../src/api/diagnosis";
import { showAlert } from "../src/utils/showAlert";

const MAIN_BLUE = "#3b82f6";

const STEPS = [
  "이미지를 업로드하고 있어요",
  "AI가 하자 위치를 탐지하고 있어요",
  "위험도 분석을 진행하고 있어요",
  "대응 가이드를 생성하고 있어요",
  "진단 결과를 정리하고 있어요",
];

export default function Analyzing() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let alive = true;

    const messageTimer = setInterval(() => {
      if (!alive) return;
      setStepIndex((prev) => (prev + 1) % STEPS.length);
    }, 1800);

    async function run() {
      try {
        const { diagnosisId } = await startDiagnosis(true);

        if (!alive) return;

        router.replace({
          pathname: "/result",
          params: { diagnosisId },
        });
      } catch (e: any) {
        if (!alive) return;

        console.error(
            "[analyzing] startDiagnosis failed",
            e?.response?.status,
            e?.response?.data ?? e
        );

        const status = e?.response?.status;
        const code = String(e?.response?.data?.code ?? e?.message ?? "");

        if (status === 401 || status === 403 || code.includes("AUTH")) {
          await Promise.resolve(
              showAlert("분석 실패", "로그인이 필요합니다. 다시 로그인 후 시도해주세요.")
          );
        } else if (code.includes("NO_PENDING_IMAGES")) {
          await Promise.resolve(
              showAlert("분석 실패", "분석할 사진이 없습니다. 다시 선택해주세요.")
          );
        } else {
          await Promise.resolve(
              showAlert("분석 실패", "이미지 분석 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.")
          );
        }

        if (!alive) return;

        // 실패 후 분석 화면이 스택에 남지 않도록 교체 이동한다.
        router.replace("/upload");
      }
    }

    run();

    return () => {
      alive = false;
      clearInterval(messageTimer);
    };
  }, []);

  return (
      <View style={styles.container}>
        <View style={styles.loaderCircle}>
          <ActivityIndicator size="large" color={MAIN_BLUE} />
          <Text style={styles.aiText}>AI</Text>
        </View>

        <Text style={styles.title}>AI가 사진을 분석하고 있어요</Text>
        <Text style={styles.stepText}>{STEPS[stepIndex]}</Text>

        <Text style={styles.subText}>
          분석에는 몇 초에서 수십 초 정도 걸릴 수 있습니다.{"\n"}
          화면을 닫지 말고 잠시만 기다려주세요.
        </Text>

        <View style={styles.progressDots}>
          {STEPS.map((_, index) => (
              <View
                  key={index}
                  style={[styles.dot, index === stepIndex && styles.dotActive]}
              />
          ))}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 28,
  },

  loaderCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#eff6ff",
    borderWidth: 2,
    borderColor: "#bfdbfe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  aiText: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: MAIN_BLUE,
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#1e293b",
    textAlign: "center",
  },

  stepText: {
    fontSize: 16,
    fontWeight: "800",
    color: MAIN_BLUE,
    textAlign: "center",
  },

  subText: {
    marginTop: 6,
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
  },

  progressDots: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#cbd5e1",
  },

  dotActive: {
    width: 28,
    backgroundColor: MAIN_BLUE,
  },
});
