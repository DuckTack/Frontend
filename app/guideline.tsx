import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // 아이콘 추가

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GUIDE_STEPS = [
  {
    emoji: "👋",
    title: "반가워요!\nDuckTack에 오신 걸 \n환영합니다!",
    desc: "집안의 곰팡이, 균열, 누수 문제를\nAI가 스마트하게 진단해 드릴게요.",
  },
  {
    emoji: "📸",
    title: "사진 한 장으로\n간편한 문제 진단",
    desc: "문제가 되는 부분을 촬영하면\n위험도와 원인을 즉시 분석합니다.",
  },
  {
    emoji: "🛠️",
    title: "맞춤형 해결책\nDIY 가이드 제공",
    desc: "전문가 예약부터 직접 해결하는 방법까지\n가장 빠른 솔루션을 제안해드려요.",
  },
];

interface GuidelineProps {
  visible: boolean;
  onFinish: () => void;
}

export default function Guideline({ visible, onFinish }: GuidelineProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // 모달이 열릴 때마다 단계를 0으로 초기화 (다시 들어왔을 때 처음부터 보이게)
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.modalBox}>
          
          {/* 상단 헤더: 뒤로가기 버튼 */}
          <View style={styles.modalHeader}>
            {currentStep > 0 ? (
              <Pressable onPress={handlePrev} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#94a3b8" />
                <Text style={styles.backBtnText}>이전</Text>
              </Pressable>
            ) : (
              <View style={{ width: 60 }} /> // 공간 유지용
            )}
            
            {/* 인디케이터 (중앙 정렬) */}
            <View style={styles.indicatorContainer}>
              {GUIDE_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentStep === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
            <View style={{ width: 60 }} /> {/* 우측 대칭용 공간 */}
          </View>

          {/* 콘텐츠 영역 */}
          <View style={styles.content}>
            <Text style={styles.emojiText}>{GUIDE_STEPS[currentStep].emoji}</Text>
            <Text style={styles.title}>{GUIDE_STEPS[currentStep].title}</Text>
            <Text style={styles.desc}>{GUIDE_STEPS[currentStep].desc}</Text>
          </View>

          {/* 하단 버튼 */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextBtn,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.nextBtnText}>
              {currentStep === GUIDE_STEPS.length - 1 ? "시작하기" : "다음"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 32,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    width: 60,
  },
  backBtnText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
    marginLeft: -4,
  },
  indicatorContainer: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
  },
  activeDot: {
    width: 18,
    backgroundColor: "#60a5fa",
  },
  content: {
    alignItems: "center",
    marginBottom: 40,
  },
  emojiText: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 12,
  },
  desc: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },
  nextBtn: {
    width: "100%",
    backgroundColor: "#3b82f6",
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
  },
  nextBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
  },
});