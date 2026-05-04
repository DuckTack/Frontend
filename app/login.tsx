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

// [원본 API 및 스토리지 로직 유지]
import { login } from "../src/api/auth";
import { detectAdmin } from "../src/api/admin";
import { saveAccessToken, saveDevToken, saveIsAdmin } from "../src/store/tokenStorage";

const MAIN_BLUE = "#3b82f6";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      
      // 원본의 trim 처리 유지
      const data = await login({ 
        username: username.trim(), 
        password: password.trim() 
      });
      
      await saveAccessToken(data.accessToken);

      // [원본 로직] 관리자 여부 확인 및 저장
      const isAdmin = await detectAdmin();
      await saveIsAdmin(isAdmin);

      // 메인으로 이동
      router.replace("/(tabs)?intro=1");
    } catch (e: any) {
      Alert.alert("로그인 실패", "아이디/비밀번호 또는 서버 상태를 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- [원본 로직] DEV 슈퍼계정 로그인 ---
  async function handleDevLogin() {
    await saveDevToken();
    router.replace("/(tabs)?intro=1");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Stack.Screen options={{ headerShown: false }} />

        {/* 로고 영역 */}
        <View style={styles.logoSection}>
          <View style={styles.logoIconBox}>
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </View>
          <Text style={styles.logoTitle}>DduckTack</Text>
          <Text style={styles.logoSubTitle}>AI 기반 주택 진단 서비스</Text>
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
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.inputLabel}>비밀번호</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력하세요"
              secureTextEntry={!showPassword}
              style={styles.input}
              placeholderTextColor="#9ca3af"
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
            style={[
              styles.loginBtn,
              { backgroundColor: isSubmitting ? "#93c5fd" : MAIN_BLUE }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>로그인</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/signup-consent")} // 원본 signup-consent 경로 유지
            style={styles.signupBtn}
          >
            <Text style={styles.signupBtnText}>회원가입</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDevLogin} style={styles.devLoginBtn}>
            <Text style={styles.devLoginText}>
              개발자 모드로 로그인
            </Text>
          </TouchableOpacity>
        </View>

        {/* 하단 보조 링크 */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text style={styles.footerLinkText}>아이디 찾기   |   비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30, paddingVertical: 40 },
  
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoIconBox: {
    width: 80,
    height: 80,
    backgroundColor: "#eff6ff",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoTitle: { fontSize: 28, fontWeight: "bold", color: "#111827", marginBottom: 5 },
  logoSubTitle: { fontSize: 14, color: "#6b7280" },

  formSection: { marginBottom: 30 },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginLeft: 4 },
  input: {
    width: "100%",
    height: 55,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    color: "#1f2937",
    fontSize: 15,
  },
  passwordContainer: { position: "relative", justifyContent: "center" },
  showPasswordBtn: { position: "absolute", right: 15, top: 18 }, // 위치 소폭 조정
  showPasswordText: { color: "#9ca3af", fontSize: 13, fontWeight: "500" },

  buttonSection: { gap: 12 },
  loginBtn: {
    width: "100%",
    height: 55,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loginBtnText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  signupBtn: {
    width: "100%",
    height: 55,
    backgroundColor: "#eff6ff",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  signupBtnText: { color: MAIN_BLUE, fontSize: 16, fontWeight: "600" },
  devLoginBtn: { marginTop: 10, alignItems: "center" },
  devLoginText: { color: "#9ca3af", fontSize: 12, textDecorationLine: "underline" },

  footerLinks: { marginTop: 30, flexDirection: "row", justifyContent: "center" },
  footerLinkText: { fontSize: 13, color: "#9ca3af", fontWeight: "400" },
});