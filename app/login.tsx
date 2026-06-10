import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// [원본 API 및 스토리지 로직 유지]
import { login } from "../src/api/auth";
import { markDustIntroSeen, saveAccessToken, shouldShowDustIntro } from "../src/store/tokenStorage";

const C = {
  primary:   "#4F46E5",
  primaryBg: "#EDEDFF",
  primaryDim: "#A5B4FC",
  bg:        "#F8FAFC",
  card:      "#FFFFFF",
  text:      "#0F172A",
  sub:       "#64748B",
  border:    "#E2E8F0",
  inputBg:   "#F8FAFC",
};

export default function Login() {
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // --- [원본 로그인 로직] ---
  async function handleLogin() {
    if (!username || !password) {
      Alert.alert("입력 필요", "아이디와 비밀번호를 입력해주세요.");
      return;
    }
    try {
      setIsSubmitting(true);
      const data = await login({ username: username.trim(), password: password.trim() });
      await saveAccessToken(data.accessToken);
      const trimmedUsername = username.trim();
      const showIntro = await shouldShowDustIntro(trimmedUsername);
      if (showIntro) await markDustIntroSeen(trimmedUsername);
      router.replace(showIntro ? "/(tabs)?intro=1" : "/(tabs)");
    } catch (e: any) {
      Alert.alert("로그인 실패", "아이디/비밀번호 또는 서버 상태를 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Stack.Screen options={{ headerShown: false }} />

          {/* 로고 영역 */}
          <View style={styles.logoSection}>
            <View style={styles.logoIconBox}>
              <Text style={{ fontSize: 32 }}>🏠</Text>
            </View>
            <Text style={styles.logoTitle}>DduckTack</Text>
            <Text style={styles.logoSubTitle}>AI 기반 주거 하자 진단 서비스</Text>
          </View>

          {/* 입력 폼 */}
          <View style={styles.formSection}>
            <Text style={styles.inputLabel}>아이디</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="아이디를 입력하세요"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor="#CBD5E1"
            />

            <Text style={styles.inputLabel}>비밀번호</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호를 입력하세요"
                secureTextEntry={!showPassword}
                style={[styles.input, { paddingRight: 60, marginBottom: 0 }]}
                placeholderTextColor="#CBD5E1"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordBtn}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? "숨기기" : "보기"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 버튼 영역 */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
              style={[
                styles.loginBtn,
                { backgroundColor: isSubmitting ? C.primaryDim : C.primary },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginBtnText}>로그인</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/signup-consent")}
              activeOpacity={0.8}
              style={styles.signupBtn}
            >
              <Text style={styles.signupBtnText}>회원가입</Text>
            </TouchableOpacity>
          </View>

          {/* 하단 보조 링크 */}
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text style={styles.footerLinkText}>비밀번호 재설정</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
    paddingBottom: 48,
  },

  // 로고
  logoSection:  { alignItems: "center", marginBottom: 44 },
  logoIconBox: {
    width: 84,
    height: 84,
    backgroundColor: C.primaryBg,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoTitle:    { fontSize: 28, fontWeight: "900", color: C.text, letterSpacing: -0.5, marginBottom: 6 },
  logoSubTitle: { fontSize: 14, color: C.sub, fontWeight: "500" },

  // 폼
  formSection:  { marginBottom: 28 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 0.1,
  },
  input: {
    width: "100%",
    height: 56,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    marginBottom: 20,
    color: C.text,
    fontSize: 15,
  },
  passwordContainer: { position: "relative", justifyContent: "center" },
  showPasswordBtn:   { position: "absolute", right: 16, top: 18 },
  showPasswordText:  { color: "#94A3B8", fontSize: 13, fontWeight: "600" },

  // 버튼
  buttonSection: { gap: 12 },
  loginBtn: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  signupBtn: {
    width: "100%",
    height: 58,
    backgroundColor: C.primaryBg,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
  },
  signupBtnText: { color: C.primary, fontSize: 16, fontWeight: "700" },

  // 하단 링크
  footerLinks:    { marginTop: 32, flexDirection: "row", justifyContent: "center" },
  footerLinkText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
});
