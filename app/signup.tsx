import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";

// [원본 상대 경로 및 API 유지]
import {
  checkEmailAvailable,
  checkPhoneAvailable,
  checkUsernameAvailable,
  sendEmailVerificationCode,
  signup,
  verifyEmailCode,
  type ResidenceType,
  type RentType,
} from "../src/api/auth";

const MAIN_BLUE = "#3b82f6";

const RESIDENCE_OPTIONS: { id: ResidenceType; label: string }[] = [
  { id: "ONE_ROOM", label: "원룸" },
  { id: "OFFICETEL", label: "오피스텔" },
  { id: "APT", label: "아파트" },
  { id: "VILLA", label: "빌라" },
  { id: "HOUSE", label: "주택" },
  { id: "ETC", label: "기타" },
];

const RENT_OPTIONS: { id: RentType; label: string }[] = [
  { id: "NONE", label: "미정" },
  { id: "MONTHLY", label: "월세" },
  { id: "JEONSE", label: "전세" },
  { id: "SALE", label: "매매" },
];

export default function Signup() {
  const { consent } = useLocalSearchParams<{ consent?: string }>();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [residenceType, setResidenceType] = useState<ResidenceType>("ONE_ROOM");
  const [rentType, setRentType] = useState<RentType>("NONE");

  const [usernameChecked, setUsernameChecked] = useState<boolean | null>(null);
  const [phoneChecked, setPhoneChecked] = useState<boolean | null>(null);
  const [emailChecked, setEmailChecked] = useState<boolean | null>(null);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const normalizedPhone = useMemo(() => phoneNumber.replace(/[^0-9]/g, ""), [phoneNumber]);

  useEffect(() => {
    if (consent === "1") return;
    Alert.alert("동의 필요", "개인정보 동의 화면을 먼저 완료한 뒤 회원가입을 진행해주세요.");
    router.replace("/signup-consent");
  }, [consent]);

  const handleCheckUsername = async () => {
    if (!username.trim()) return Alert.alert("입력 필요", "아이디를 입력해주세요.");
    try {
      const ok = await checkUsernameAvailable(username.trim());
      setUsernameChecked(ok);
      if (ok) Alert.alert("확인", "사용 가능한 아이디입니다.");
    } catch { Alert.alert("오류", "중복검사 실패"); }
  };

  const handleCheckPhone = async () => {
    if (!normalizedPhone) return Alert.alert("입력 필요", "휴대폰 번호를 입력해주세요.");
    try {
      const ok = await checkPhoneAvailable(normalizedPhone);
      setPhoneChecked(ok);
      if (ok) Alert.alert("확인", "사용 가능한 번호입니다.");
    } catch { Alert.alert("오류", "중복검사 실패"); }
  };

  const handleCheckEmail = async () => {
    if (!email.trim()) return Alert.alert("입력 필요", "이메일을 입력해주세요.");
    try {
      const ok = await checkEmailAvailable(email.trim());
      setEmailChecked(ok);
      setEmailCodeSent(false);
      setEmailVerified(false);
      if (ok) Alert.alert("확인", "사용 가능한 이메일입니다.");
    } catch { Alert.alert("오류", "중복검사 실패"); }
  };

  const handleSendEmailCode = async () => {
    if (emailChecked !== true) return Alert.alert("알림", "이메일 중복검사를 먼저 완료해주세요.");
    try {
      await sendEmailVerificationCode(email.trim());
      setEmailCodeSent(true);
      Alert.alert("인증코드 발송", "이메일로 인증코드가 발송되었습니다.");
    } catch { Alert.alert("오류", "발송에 실패했습니다."); }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) return Alert.alert("입력 필요", "인증코드를 입력해주세요.");
    try {
      const ok = await verifyEmailCode(email.trim(), verificationCode.trim());
      setEmailVerified(ok);
      if (ok) Alert.alert("이메일 인증", "인증이 완료되었습니다.");
    } catch { Alert.alert("오류", "인증 실패"); }
  };

  const handleSignup = async () => {
    if (usernameChecked !== true) return Alert.alert("알림", "아이디 중복확인을 해주세요.");
    if (phoneChecked !== true) return Alert.alert("알림", "휴대폰 중복확인을 해주세요.");
    if (emailVerified !== true) return Alert.alert("알림", "이메일 인증을 완료해주세요.");
    if (password !== passwordConfirm) return Alert.alert("알림", "비밀번호가 일치하지 않습니다.");

    try {
      setIsSubmitting(true);
      await signup({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: normalizedPhone,
        residenceType,
        rentType,
        address,
        emailVerified: true,
      });
      Alert.alert("가입 완료", "회원가입이 완료되었습니다. 로그인해주세요.");
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("가입 실패", "입력값 또는 서버 응답을 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>회원가입</Text>
              <Text style={styles.headerSub}>DduckTack의 새로운 가족을 환영합니다</Text>
            </View>
            <Pressable onPress={() => router.replace("/login")} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#334155" />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 아이디 */}
          <View style={styles.section}>
            <Text style={styles.label}>아이디 <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
              <TextInput
                style={styles.flexInput}
                placeholder="사용할 아이디 입력"
                value={username}
                onChangeText={(t) => { setUsername(t); setUsernameChecked(null); }}
                autoCapitalize="none"
              />
              <Pressable style={styles.inlineButton} onPress={handleCheckUsername}>
                <Text style={styles.inlineButtonText}>중복확인</Text>
              </Pressable>
            </View>
            {usernameChecked !== null && (
              <Text style={[styles.statusText, { color: usernameChecked ? "#10b981" : "#ef4444" }]}>
                {usernameChecked ? "✓ 사용 가능한 아이디입니다." : "✕ 이미 사용 중인 아이디입니다."}
              </Text>
            )}
          </View>

          {/* 휴대폰 번호 */}
          <View style={styles.section}>
            <Text style={styles.label}>휴대폰 번호 <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
              <TextInput
                style={styles.flexInput}
                placeholder="숫자만 입력 (01012345678)"
                value={phoneNumber}
                onChangeText={(t) => { setPhoneNumber(t); setPhoneChecked(null); }}
                keyboardType="phone-pad"
              />
              <Pressable style={styles.inlineButton} onPress={handleCheckPhone}>
                <Text style={styles.inlineButtonText}>중복확인</Text>
              </Pressable>
            </View>
          </View>

          {/* 이메일 & 인증 */}
          <View style={styles.section}>
            <Text style={styles.label}>이메일 <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
              <TextInput
                style={styles.flexInput}
                placeholder="example@email.com"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailChecked(null); setEmailCodeSent(false); setEmailVerified(false); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Pressable style={styles.inlineButton} onPress={handleCheckEmail}>
                <Text style={styles.inlineButtonText}>중복확인</Text>
              </Pressable>
            </View>
            
            {/* [수정] 버튼을 조건부 렌더링이 아닌 '활성화/비활성화' 방식으로 변경하여 영역 고정 */}
            <Pressable 
              style={[
                styles.fullWidthBtn, 
                (!emailChecked || emailVerified) && { backgroundColor: '#e2e8f0' } 
              ]} 
              onPress={handleSendEmailCode}
              disabled={!emailChecked || emailVerified}
            >
              <Text style={[styles.fullWidthBtnText, (!emailChecked || emailVerified) && { color: '#94a3b8' }]}>
                {emailVerified ? "이메일 인증 완료" : (emailCodeSent ? "인증코드 재발송" : "인증코드 발송")}
              </Text>
            </Pressable>

            {/* [수정] 인증코드 입력란을 항상 노출하되, 발송 전까지는 비활성화 처리 */}
            <View style={[styles.row, { marginTop: 10 }]}>
              <TextInput
                style={[styles.flexInput, (!emailCodeSent || emailVerified) && { backgroundColor: '#f1f5f9', color: '#94a3b8' }]}
                placeholder="인증코드 6자리 입력"
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                editable={emailCodeSent && !emailVerified} // 발송 전이거나 완료 후엔 편집 불가
              />
              <Pressable 
                style={[
                  styles.inlineButton, 
                  { backgroundColor: (emailCodeSent && !emailVerified) ? MAIN_BLUE : '#e2e8f0' }
                ]} 
                onPress={handleVerifyEmail}
                disabled={!emailCodeSent || emailVerified}
              >
                <Text style={[styles.inlineButtonText, { color: (emailCodeSent && !emailVerified) ? '#fff' : '#94a3b8' }]}>인증하기</Text>
              </Pressable>
            </View>

            {emailVerified && <Text style={[styles.statusText, {color: "#10b981"}]}>✓ 이메일 인증이 완료되었습니다.</Text>}
            {emailCodeSent && !emailVerified && <Text style={[styles.statusText, {color: MAIN_BLUE}]}>ⓘ 메일로 전송된 코드를 입력해 주세요.</Text>}
          </View>

          {/* 비밀번호 (일치 확인 기능 포함) */}
          <View style={styles.section}>
            <Text style={styles.label}>비밀번호 <Text style={styles.required}>*</Text></Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="비밀번호 입력"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94a3b8" />
              </Pressable>
            </View>
            <View style={[styles.passwordWrapper, { marginTop: 10 }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="비밀번호 재확인"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                secureTextEntry={!showConfirm}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                <Ionicons name={showConfirm ? "eye-off" : "eye"} size={20} color="#94a3b8" />
              </Pressable>
            </View>
            {passwordConfirm !== "" && (
              <Text style={[styles.statusText, { color: password === passwordConfirm ? "#10b981" : "#ef4444" }]}>
                {password === passwordConfirm ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
              </Text>
            )}
          </View>

          {/* 거주 유형 */}
          <View style={styles.section}>
            <Text style={styles.label}>거주 유형 <Text style={styles.required}>*</Text></Text>
            <View style={styles.chipGrid}>
              {RESIDENCE_OPTIONS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setResidenceType(t.id)}
                  style={[styles.chip, residenceType === t.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, residenceType === t.id && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 임대 유형 */}
          <View style={styles.section}>
            <Text style={styles.label}>임대 유형 <Text style={styles.required}>*</Text></Text>
            <View style={styles.chipGrid}>
              {RENT_OPTIONS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setRentType(t.id)}
                  style={[styles.chip, rentType === t.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, rentType === t.id && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 주소 */}
          <View style={styles.section}>
            <Text style={styles.label}>주소 (선택)</Text>
            <TextInput
              style={styles.addressInput}
              placeholder="상세 주소를 입력해주세요"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <Pressable
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>가입 완료하기</Text>}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.footerLink}>로그인하기</Text>
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
  flexInput: { flex: 1, height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15 },
  inlineButton: { paddingHorizontal: 18, height: 56, backgroundColor: "#eff6ff", borderRadius: 16, alignItems: "center", justifyContent: "center" },
  inlineButtonText: { color: MAIN_BLUE, fontWeight: "700", fontSize: 14 },
  fullWidthBtn: { backgroundColor: MAIN_BLUE, borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  fullWidthBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  passwordWrapper: { position: 'relative' },
  passwordInput: { height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15, paddingRight: 50 },
  eyeIcon: { position: 'absolute', right: 16, top: 18 },
  statusText: { fontSize: 12, fontWeight: "600", marginTop: 6, marginLeft: 6 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: "#f1f5f9", minWidth: '30%', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: MAIN_BLUE, borderColor: MAIN_BLUE },
  chipText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  chipTextActive: { color: "#fff" },
  submitButton: { backgroundColor: MAIN_BLUE, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: 20, shadowColor: MAIN_BLUE, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 8, marginBottom: 20 },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: MAIN_BLUE, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  addressInput: { height: 56, backgroundColor: "#f8fafc", borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 15, width: '100%' },
});