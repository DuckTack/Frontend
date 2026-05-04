import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, Platform, SafeAreaView, TouchableOpacity } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const MAIN_BLUE = "#3b82f6";
const BG_BLUE = "#eff6ff";

// [디자인 컴포넌트] - 순수 React Native 컴포넌트만 사용
function CheckboxRow({
  label,
  checked,
  onPress,
  description,
  required = false,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  description: string;
  required?: boolean;
}) {
  return (
    <Pressable 
      onPress={onPress} 
      style={[styles.checkboxCard, checked && styles.checkboxCardActive]}
    >
      <View style={styles.checkboxTopRow}>
        <View style={[styles.customCheckbox, checked && styles.customCheckboxChecked]}>
          {checked && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
        <Text style={styles.checkboxLabel}>
          <Text style={{ color: required ? MAIN_BLUE : "#64748b", fontWeight: "800" }}>
            {required ? "[필수] " : "[선택] "}
          </Text>
          {label}
        </Text>
      </View>
      <Text style={styles.checkboxDescription}>{description}</Text>
    </Pressable>
  );
}

export default function SignupConsentPage() {
  const [serviceChecked, setServiceChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);

  const allRequiredChecked = serviceChecked && privacyChecked;
  const isAllAgree = serviceChecked && privacyChecked && marketingChecked;

  // --- [원본 로직 100% 유지] ---
  function handleContinue() {
    if (!allRequiredChecked) {
      Alert.alert("동의 필요", "필수 동의 항목을 모두 체크해야 회원가입을 진행할 수 있습니다.");
      return;
    }
    router.replace("/signup?consent=1");
  }

  function handleAllAgree() {
    const next = !isAllAgree;
    setServiceChecked(next);
    setPrivacyChecked(next);
    setMarketingChecked(next);
  }
  // --- [원본 로직 끝] ---

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>약관 동의</Text>
          <Text style={styles.headerSub}>안전한 서비스 이용을 위해{"\n"}약관에 동의해주세요</Text>
        </View>

        {/* 전체 동의 버튼 */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={handleAllAgree} 
          style={[styles.allAgreeButton, isAllAgree && styles.allAgreeButtonActive]}
        >
          <Ionicons 
            name={isAllAgree ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={isAllAgree ? "white" : "#cbd5e1"} 
          />
          <Text style={[styles.allAgreeText, isAllAgree && styles.allAgreeTextActive]}>
            모든 약관에 전체 동의합니다
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 개별 약관 리스트 */}
        <View style={styles.checkboxList}>
          <CheckboxRow
            required
            checked={serviceChecked}
            onPress={() => setServiceChecked(!serviceChecked)}
            label="서비스 이용약관"
            description="로그인, 진단 기록 조회, DIY/전문가 안내, 리포트 기능 제공을 위한 기본 약관 동의입니다."
          />

          <CheckboxRow
            required
            checked={privacyChecked}
            onPress={() => setPrivacyChecked(!privacyChecked)}
            label="개인정보 수집 및 이용"
            description="회원가입 시 입력한 계정 정보와 거주 정보를 서비스 제공 목적으로 수집합니다."
          />

          <CheckboxRow
            checked={marketingChecked}
            onPress={() => setMarketingChecked(!marketingChecked)}
            label="마케팅 정보 수신"
            description="이벤트, 제휴 혜택, 업데이트 안내 수신에 대한 선택적 동의입니다."
          />
        </View>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleContinue}
            style={[styles.mainButton, !allRequiredChecked && styles.mainButtonDisabled]}
          >
            <Text style={styles.mainButtonText}>회원가입 계속하기</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.replace("/login")} 
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 20 : 10, paddingBottom: 40 },
  
  header: { marginTop: 20, marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 15, color: "#6b7280", marginTop: 8, lineHeight: 22 },

  allAgreeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  allAgreeButtonActive: {
    backgroundColor: MAIN_BLUE,
    borderColor: MAIN_BLUE,
  },
  allAgreeText: { fontSize: 16, fontWeight: "700", color: "#475569" },
  allAgreeTextActive: { color: "white" },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 24 },

  checkboxList: { gap: 12 },
  checkboxCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  checkboxCardActive: {
    borderColor: MAIN_BLUE,
    backgroundColor: "#f0f7ff",
  },
  checkboxTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  customCheckboxChecked: {
    backgroundColor: MAIN_BLUE,
    borderColor: MAIN_BLUE,
  },
  checkboxLabel: { fontSize: 15, fontWeight: "700", color: "#334155", flex: 1 },
  checkboxDescription: { fontSize: 13, color: "#64748b", lineHeight: 18, paddingLeft: 32 },

  footer: { marginTop: 40, gap: 10 },
  mainButton: {
    backgroundColor: MAIN_BLUE,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  mainButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  mainButtonText: { color: "white", fontSize: 16, fontWeight: "800" },
  backButton: { paddingVertical: 10, alignItems: "center" },
  backButtonText: { color: "#94a3b8", fontSize: 14, textDecorationLine: "underline" },
});