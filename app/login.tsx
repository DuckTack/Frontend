import { useState } from "react";
import { View, Text, Pressable, Alert, TextInput } from "react-native";
import { router, Stack } from "expo-router";

import { login } from "../src/api/auth";
import { detectAdmin } from "../src/api/admin";
import { saveAccessToken, saveDevToken, saveIsAdmin } from "../src/store/tokenStorage";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleLogin() {
        if (!username || !password) {
            Alert.alert("입력 필요", "아이디와 비밀번호를 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);

            const data = await login({
                username: username.trim(),
                password: password.trim(),   // 🔥 핵심
            });

            await saveAccessToken(data.accessToken);

            const isAdmin = await detectAdmin();
            await saveIsAdmin(isAdmin);

            router.replace("/(tabs)?intro=1");
        } catch {
            Alert.alert("로그인 실패", "아이디/비밀번호 또는 서버 상태를 확인해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    }

  async function handleDevLogin() {
    await saveDevToken();
    router.replace("/(tabs)?intro=1");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", textAlign: "center" }}>Login</Text>
      <TextInput value={username} onChangeText={setUsername} placeholder="아이디" autoCapitalize="none" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

      <Pressable onPress={handleLogin} disabled={isSubmitting} style={{ paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", opacity: isSubmitting ? 0.6 : 1 }}>
        <Text>{isSubmitting ? "로그인 중..." : "로그인"}</Text>
      </Pressable>

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <Pressable onPress={() => router.push("/forgot-password")} style={{ flex: 1, paddingVertical: 10, alignItems: "center" }}>
          <Text style={{ textDecorationLine: "underline" }}>비밀번호 찾기 / 재설정</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/signup-consent")} style={{ flex: 1, paddingVertical: 10, alignItems: "center" }}>
          <Text style={{ textDecorationLine: "underline" }}>회원가입</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleDevLogin} style={{ paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center" }}>
        <Text>DEV 슈퍼계정으로 로그인</Text>
      </Pressable>

      <Stack.Screen options={{ headerShown: false }} />
    </View>
  );
}
