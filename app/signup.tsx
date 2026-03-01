import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { router, Stack } from "expo-router";

import { checkUsernameAvailable, signup } from "@/src/api/auth";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usernameChecked, setUsernameChecked] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [residenceType, setResidenceType] = useState<
    "ONE_ROOM" | "APARTMENT" | "VILLA" | "OFFICETEL" | "OTHER"
  >("ONE_ROOM");
  const [isRenter, setIsRenter] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup() {
    if (!username || !password) {
      Alert.alert("입력 필요", "아이디와 비밀번호를 입력해주세요.");
      return;
    }

    if (passwordConfirm.length === 0) {
      Alert.alert("입력 필요", "비밀번호 재확인을 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert("비밀번호 확인", "비밀번호와 재확인이 일치하지 않습니다.");
      return;
    }

    if (usernameChecked !== true) {
      Alert.alert("아이디 확인", "회원가입 전에 아이디 중복검사를 완료해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      await signup({ username, password, phoneNumber: phoneNumber.trim() || undefined, residenceType, isRenter });
      Alert.alert("회원가입 성공", "회원가입이 완료되었습니다. 로그인해주세요.");
      router.push("/login");
    } catch (e: any) {
      if (String(e?.message) === "USERNAME_TAKEN") {
        Alert.alert("회원가입 실패", "이미 사용 중인 아이디입니다.");
      } else {
        Alert.alert("회원가입 실패", "입력한 정보 또는 서버 상태를 확인해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckUsername() {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert("입력 필요", "아이디를 먼저 입력해주세요.");
      return;
    }
    try {
      setCheckingUsername(true);
      const ok = await checkUsernameAvailable(trimmed);
      setUsernameChecked(ok);
      Alert.alert("아이디 확인", ok ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다.");
    } catch {
      Alert.alert("확인 실패", "잠시 후 다시 시도해주세요.");
    } finally {
      setCheckingUsername(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", textAlign: "center" }}>회원가입</Text>

      <TextInput
        value={username}
        onChangeText={(t) => {
          setUsername(t);
          setUsernameChecked(null);
        }}
        placeholder="아이디"
        autoCapitalize="none"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <Pressable
        onPress={handleCheckUsername}
        disabled={checkingUsername}
        style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: checkingUsername ? 0.6 : 1 }}
      >
        <Text>{checkingUsername ? "확인 중..." : "아이디 중복검사"}</Text>
      </Pressable>

      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="전화번호(선택) 예) 01012345678"
        keyboardType="phone-pad"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <View style={{ gap: 6 }}>
        <TextInput
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="비밀번호 재확인"
          secureTextEntry
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />

        {passwordConfirm.length > 0 && (
          <Text style={{ fontSize: 12, opacity: 0.9 }}>
            {password === passwordConfirm ? "✅ 비밀번호가 일치합니다." : "❌ 비밀번호가 일치하지 않습니다."}
          </Text>
        )}
      </View>

      <Text style={{ marginTop: 8, fontWeight: "600" }}>거주 유형</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["ONE_ROOM", "APARTMENT", "VILLA", "OFFICETEL", "OTHER"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setResidenceType(t)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderRadius: 10,
              opacity: residenceType === t ? 1 : 0.5,
            }}
          >
            <Text>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ marginTop: 8, fontWeight: "600" }}>임대 여부</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => setIsRenter(true)}
          style={{ padding: 10, borderWidth: 1, borderRadius: 10, opacity: isRenter ? 1 : 0.5 }}
        >
          <Text>임대</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsRenter(false)}
          style={{ padding: 10, borderWidth: 1, borderRadius: 10, opacity: !isRenter ? 1 : 0.5 }}
        >
          <Text>자가</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleSignup}
        disabled={isSubmitting}
        style={{
          marginTop: 16,
          paddingVertical: 12,
          borderRadius: 10,
          borderWidth: 1,
          alignItems: "center",
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        <Text>{isSubmitting ? "회원가입 중..." : "회원가입"}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 10, alignItems: "center" }}>
        <Text style={{ textDecorationLine: "underline" }}>로그인으로 돌아가기</Text>
      </Pressable>

      <Stack.Screen options={{ headerShown: false }} />
    </View>
  );
}
