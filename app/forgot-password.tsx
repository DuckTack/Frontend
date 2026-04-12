import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";

import { resetPassword, sendPasswordResetCode, verifyPasswordResetCode } from "../src/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resetting, setResetting] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canVerifyCode = codeSent && verificationCode.trim().length > 0 && !verifyingCode;
  const canResetPassword =
    codeVerified && newPassword.length > 0 && newPasswordConfirm.length > 0 && !resetting;

  async function handleSendCode() {
    if (!normalizedEmail) {
      Alert.alert("입력 필요", "이메일을 입력해주세요.");
      return;
    }

    try {
      setSendingCode(true);
      await sendPasswordResetCode(normalizedEmail);
      setCodeSent(true);
      setCodeVerified(false);
      Alert.alert("인증코드 발송", "비밀번호 재설정용 인증코드를 이메일로 보냈습니다.");
    } catch {
      Alert.alert("발송 실패", "비밀번호 재설정용 이메일 발송 API를 확인해주세요.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode() {
    if (!codeSent) {
      Alert.alert("진행 순서", "먼저 인증코드를 발송해주세요.");
      return;
    }
    if (!verificationCode.trim()) {
      Alert.alert("입력 필요", "인증코드를 입력해주세요.");
      return;
    }

    try {
      setVerifyingCode(true);
      const verified = await verifyPasswordResetCode(normalizedEmail, verificationCode.trim());
      setCodeVerified(verified);
      Alert.alert("인증 확인", verified ? "인증이 완료되었습니다." : "인증코드를 다시 확인해주세요.");
    } catch {
      Alert.alert("인증 실패", "비밀번호 재설정 코드 확인 API를 확인해주세요.");
    } finally {
      setVerifyingCode(false);
    }
  }
  const [username, setUsername] = useState("");

  async function handleResetPassword() {
    if (!username.trim()) {
      Alert.alert("입력 필요", "아이디를 입력해주세요.");
      return;
    }
    if (!normalizedEmail) {
      Alert.alert("입력 필요", "이메일을 입력해주세요.");
      return;
    }
    if (!codeVerified) {
      Alert.alert("진행 순서", "인증코드 확인을 먼저 완료해주세요.");
      return;
    }
    if (!newPassword) {
      Alert.alert("입력 필요", "새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPasswordConfirm.length === 0) {
      Alert.alert("입력 필요", "새 비밀번호 확인을 입력해주세요.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Alert.alert("비밀번호 확인", "새 비밀번호와 확인값이 일치하지 않습니다.");
      return;
    }

    try {
      setResetting(true);
      await resetPassword({
        username: username.trim(),   // 🔥 추가
        email: normalizedEmail,
        code: verificationCode.trim(),
          newPassword: newPassword.trim(),   // 🔥 이거 추가
      });
      Alert.alert("재설정 완료", "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
      router.replace("/login");
    } catch {
      Alert.alert("재설정 실패", "비밀번호 재설정 API를 확인해주세요.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", textAlign: "center" }}>비밀번호 재설정</Text>
        <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="아이디"
            autoCapitalize="none"
            style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />
      <TextInput
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setCodeSent(false);
          setCodeVerified(false);
        }}
        placeholder="가입한 이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <Pressable
        onPress={handleSendCode}
        disabled={sendingCode || !normalizedEmail}
        style={{
          paddingVertical: 12,
          borderWidth: 1,
          borderRadius: 10,
          alignItems: "center",
          opacity: sendingCode || !normalizedEmail ? 0.6 : 1,
        }}
      >
        <Text>{sendingCode ? "발송 중..." : "인증코드 발송"}</Text>
      </Pressable>

      <TextInput
        value={verificationCode}
        onChangeText={setVerificationCode}
        placeholder="이메일로 받은 인증코드"
        keyboardType="number-pad"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <Pressable
        onPress={handleVerifyCode}
        disabled={!canVerifyCode}
        style={{
          paddingVertical: 12,
          borderWidth: 1,
          borderRadius: 10,
          alignItems: "center",
          opacity: canVerifyCode ? 1 : 0.6,
        }}
      >
        <Text>{verifyingCode ? "확인 중..." : "인증코드 확인"}</Text>
      </Pressable>

      <View style={{ gap: 6 }}>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="새 비밀번호"
          secureTextEntry
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />
        <TextInput
          value={newPasswordConfirm}
          onChangeText={setNewPasswordConfirm}
          placeholder="새 비밀번호 확인"
          secureTextEntry
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        />
        {newPasswordConfirm.length > 0 ? (
          <Text style={{ fontSize: 12, opacity: 0.9 }}>
            {newPassword === newPasswordConfirm ? "✅ 비밀번호가 일치합니다." : "❌ 비밀번호가 일치하지 않습니다."}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={handleResetPassword}
        disabled={!canResetPassword}
        style={{
          marginTop: 8,
          paddingVertical: 12,
          borderWidth: 1,
          borderRadius: 10,
          alignItems: "center",
          opacity: canResetPassword ? 1 : 0.6,
        }}
      >
        <Text>{resetting ? "재설정 중..." : "비밀번호 재설정"}</Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/login")} style={{ paddingVertical: 10, alignItems: "center" }}>
        <Text style={{ textDecorationLine: "underline" }}>로그인으로 돌아가기</Text>
      </Pressable>

      <Stack.Screen options={{ headerShown: false }} />
    </ScrollView>
  );
}
