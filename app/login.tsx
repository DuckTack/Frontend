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
} from "react-native";
import { useRouter, Stack } from "expo-router";

import { login } from "../src/api/auth";
import { detectAdmin } from "../src/api/admin"; // [원본 로직] 관리자 판별 API
import { saveAccessToken, saveDevToken, saveIsAdmin } from "../src/store/tokenStorage"; // [원본 로직] 관리자 상태 저장

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    if (!username || !password) {
      Alert.alert("입력 필요", "아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      // 1. 로그인 API 호출 및 토큰 저장
      const data = await login({ username, password });
      await saveAccessToken(data.accessToken);

      // 2. [원본 로직 유지] 관리자 여부 확인 및 저장
      const isAdmin = await detectAdmin();
      await saveIsAdmin(isAdmin);

      // 3. 메인으로 이동
      router.replace("/(tabs)?intro=1");
    } catch (e: any) {
      Alert.alert("로그인 실패", "아이디/비밀번호 또는 서버 상태를 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // [원본 로직 유지] DEV 슈퍼계정 로그인
  async function handleDevLogin() {
    await saveDevToken();
    router.replace("/(tabs)?intro=1");
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#ffffff" }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 30 }}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* 로고 영역 */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
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
            }}
          >
            <Text style={{ fontSize: 30 }}>🏠</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: "bold", color: "#111827", marginBottom: 5 }}>DduckTack</Text>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>AI 기반 주택 진단 서비스</Text>
        </View>

        {/* 입력 폼 */}
        <View style={{ marginBottom: 30 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginLeft: 4 }}>
            아이디
          </Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="아이디를 입력하세요"
            autoCapitalize="none"
            style={{
              width: "100%",
              height: 55,
              backgroundColor: "#f9fafb",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 15,
              paddingHorizontal: 15,
              marginBottom: 20,
              color: "#1f2937",
            }}
          />

          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginLeft: 4 }}>
            비밀번호
          </Text>
          <View style={{ position: "relative", justifyContent: "center" }}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력하세요"
              secureTextEntry={!showPassword}
              style={{
                width: "100%",
                height: 55,
                backgroundColor: "#f9fafb",
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 15,
                paddingHorizontal: 15,
                color: "#1f2937",
              }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 15 }}>
              <Text style={{ color: "#9ca3af", fontSize: 12 }}>{showPassword ? "숨기기" : "보기"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 버튼 영역 */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isSubmitting}
            style={{
              width: "100%",
              height: 55,
              backgroundColor: isSubmitting ? "#93c5fd" : "#60a5fa",
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              elevation: 2,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold" }}>로그인</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/signup")}
            style={{
              width: "100%",
              height: 55,
              backgroundColor: "#eff6ff",
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#3b82f6", fontSize: 16, fontWeight: "600" }}>회원가입</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDevLogin} style={{ marginTop: 10, alignItems: "center" }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, textDecorationLine: "underline" }}>
              개발자 모드로 로그인
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 30, flexDirection: "row", justifyContent: "center" }}>
          <Text style={{ fontSize: 13, color: "#9ca3af" }}>아이디 찾기   |   비밀번호 찾기</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}