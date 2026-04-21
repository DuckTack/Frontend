import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// [원본 API 유지]
import { resetPassword, sendPasswordResetCode, verifyPasswordResetCode } from "../src/api/auth";

const MAIN_BLUE = "#3b82f6";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 비밀번호 보기/숨기기 상태
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canVerifyCode = codeSent && verificationCode.trim().length > 0 && !verifyingCode;
  const canResetPassword =
    codeVerified && newPassword.length > 0 && newPasswordConfirm.length > 0 && !resetting;

  // --- [로직: 원본 유지] ---
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
        username: username.trim(),
        email: normalizedEmail,
        code: verificationCode.trim(),
        newPassword: newPassword.trim(),
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* 헤더 디자인 통일 */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>비밀번호 재설정</Text>
              <Text style={styles.headerSub}>인증 후 새 비밀번호를 설정해주세요</Text>
            </View>
            <Pressable onPress={() => router.replace("/login")} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#334155" />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 아이디 섹션 */}
          <View style={styles.section}>
            <Text style={styles.label}>아이디 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.fullInput}
              value={username}
              onChangeText={setUsername}
              placeholder="아이디를 입력해주세요"
              autoCapitalize="none"
            />
          </View>

          {/* 이메일 및 인증번호 발송 */}
          <View style={styles.section}>
            <Text style={styles.label}>이메일 <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
              <TextInput
                style={styles.flexInput}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setCodeSent(false);
                  setCodeVerified(false);
                }}
                placeholder="가입한 이메일 입력"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable 
                style={[styles.inlineButton, (sendingCode || !normalizedEmail) && { opacity: 0.6 }]} 
                onPress={handleSendCode}
                disabled={sendingCode || !normalizedEmail}
              >
                {sendingCode ? <ActivityIndicator size="small" color={MAIN_BLUE} /> : <Text style={styles.inlineButtonText}>코드발송</Text>}
              </Pressable>
            </View>
          </View>

          {/* 인증번호 입력 및 확인 */}
          <View style={styles.section}>
            <Text style={styles.label}>인증코드 <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
              <TextInput
                style={styles.flexInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="코드 6자리 입력"
                keyboardType="number-pad"
              />
              <Pressable 
                style={[styles.inlineButton, !canVerifyCode && { backgroundColor: "#f1f5f9" }]} 
                onPress={handleVerifyCode}
                disabled={!canVerifyCode}
              >
                {verifyingCode ? <ActivityIndicator size="small" color={MAIN_BLUE} /> : 
                  <Text style={[styles.inlineButtonText, !canVerifyCode && { color: "#cbd5e1" }]}>인증확인</Text>
                }
              </Pressable>
            </View>
            {codeVerified && <Text style={styles.statusTextSuccess}>✓ 인증이 완료되었습니다.</Text>}
          </View>

          {/* 새 비밀번호 입력 (인증 완료 시 강조) */}
          <View style={[styles.section, !codeVerified && { opacity: 0.5 }]}>
            <Text style={styles.label}>새 비밀번호 <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="새 비밀번호 입력"
                secureTextEntry={!showPassword}
                editable={codeVerified}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94a3b8" />
              </Pressable>
            </View>
            
            <View style={[styles.passwordWrapper, { marginTop: 10 }]}>
              <TextInput
                style={styles.passwordInput}
                value={newPasswordConfirm}
                onChangeText={setNewPasswordConfirm}
                placeholder="새 비밀번호 확인"
                secureTextEntry={!showConfirm}
                editable={codeVerified}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color="#94a3b8" />
              </Pressable>
            </View>
            {newPasswordConfirm.length > 0 && (
              <Text style={[styles.statusText, { color: newPassword === newPasswordConfirm ? "#10b981" : "#ef4444" }]}>
                {newPassword === newPasswordConfirm ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
              </Text>
            )}
          </View>

          {/* 재설정 완료 버튼 */}
          <Pressable
            style={[styles.submitButton, (!canResetPassword || resetting) && { opacity: 0.7 }]}
            onPress={handleResetPassword}
            disabled={!canResetPassword || resetting}
          >
            {resetting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>비밀번호 재설정 완료</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.footerLink}>로그인으로 돌아가기</Text>
            </Pressable>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 24, backgroundColor: "#f8faff" },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#1e293b" },
  headerSub: { fontSize: 14, color: "#64748b", marginTop: 4 },
  closeButton: { width: 44, height: 44, backgroundColor: "#fff", borderRadius: 16, alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 60 },
  section: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 10, marginLeft: 4 },
  required: { color: "#ef4444" },
  row: { flexDirection: "row", gap: 8 },
  fullInput: { height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15 },
  flexInput: { flex: 1, height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15 },
  inlineButton: { paddingHorizontal: 18, height: 56, backgroundColor: "#eff6ff", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  inlineButtonText: { color: MAIN_BLUE, fontWeight: "700", fontSize: 14 },
  passwordWrapper: { position: 'relative' },
  passwordInput: { height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15, paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 16, top: 18 },
  statusText: { fontSize: 12, fontWeight: "600", marginTop: 6, marginLeft: 6 },
  statusTextSuccess: { fontSize: 12, fontWeight: "600", marginTop: 6, marginLeft: 6, color: "#10b981" },
  submitButton: { backgroundColor: MAIN_BLUE, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 20, shadowColor: MAIN_BLUE, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  footer: { alignItems: 'center', marginTop: 24, marginBottom: 20 },
  footerLink: { color: "#64748b", fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
});