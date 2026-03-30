import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import { router, Stack } from "expo-router";

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

const RESIDENCE_LABELS: Record<ResidenceType, string> = {
  ONE_ROOM: "원룸",
  OFFICETEL: "오피스텔",
  APT: "아파트",
  VILLA: "빌라",
  HOUSE: "주택",
  ETC: "기타",
};

const RENT_LABELS: Record<RentType, string> = {
  NONE: "미정",
  MONTHLY: "월세",
  JEONSE: "전세",
  SALE: "매매",
};

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [usernameChecked, setUsernameChecked] = useState<boolean | null>(null);
  const [phoneChecked, setPhoneChecked] = useState<boolean | null>(null);
  const [emailChecked, setEmailChecked] = useState<boolean | null>(null);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [residenceType, setResidenceType] = useState<ResidenceType>("ONE_ROOM");
  const [rentType, setRentType] = useState<RentType>("NONE");

  const normalizedPhone = useMemo(() => phoneNumber.replace(/[^0-9]/g, ""), [phoneNumber]);

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
      Alert.alert("확인 실패", "아이디 중복검사 API를 확인해주세요.");
    } finally {
      setCheckingUsername(false);
    }
  }

  async function handleCheckPhone() {
    if (!normalizedPhone) {
      Alert.alert("입력 필요", "휴대폰 번호를 먼저 입력해주세요.");
      return;
    }
    try {
      setCheckingPhone(true);
      const ok = await checkPhoneAvailable(normalizedPhone);
      setPhoneChecked(ok);
      Alert.alert("휴대폰 번호 확인", ok ? "사용 가능한 휴대폰 번호입니다." : "이미 사용 중인 휴대폰 번호입니다.");
    } catch {
      Alert.alert("확인 실패", "휴대폰 번호 중복검사 API를 확인해주세요.");
    } finally {
      setCheckingPhone(false);
    }
  }

  async function handleCheckEmail() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("입력 필요", "이메일을 먼저 입력해주세요.");
      return;
    }
    try {
      setCheckingEmail(true);
      const ok = await checkEmailAvailable(trimmed);
      setEmailChecked(ok);
      setEmailCodeSent(false);
      setEmailVerified(false);
      Alert.alert("이메일 확인", ok ? "사용 가능한 이메일입니다." : "이미 사용 중인 이메일입니다.");
    } catch {
      Alert.alert("확인 실패", "이메일 중복검사 API를 확인해주세요.");
    } finally {
      setCheckingEmail(false);
    }
  }

  async function handleSendEmailCode() {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("입력 필요", "이메일을 먼저 입력해주세요.");
      return;
    }
    if (emailChecked !== true) {
      Alert.alert("이메일 확인", "이메일 중복검사를 먼저 완료해주세요.");
      return;
    }
    try {
      setSendingEmailCode(true);
      await sendEmailVerificationCode(trimmed);
      setEmailCodeSent(true);
      setEmailVerified(false);
      Alert.alert("인증코드 발송", "인증코드를 이메일로 보냈습니다.");
    } catch {
      Alert.alert("발송 실패", "이메일 인증 API를 확인해주세요.");
    } finally {
      setSendingEmailCode(false);
    }
  }

  async function handleVerifyEmail() {
    if (!emailCodeSent) {
      Alert.alert("이메일 인증", "먼저 인증코드를 발송해주세요.");
      return;
    }
    if (!verificationCode.trim()) {
      Alert.alert("입력 필요", "인증코드를 입력해주세요.");
      return;
    }
    try {
      setVerifyingEmailCode(true);
      const ok = await verifyEmailCode(email.trim(), verificationCode.trim());
      setEmailVerified(ok);
      Alert.alert("이메일 인증", ok ? "이메일 인증이 완료되었습니다." : "인증코드를 다시 확인해주세요.");
    } catch {
      Alert.alert("인증 실패", "이메일 인증 확인 API를 확인해주세요.");
    } finally {
      setVerifyingEmailCode(false);
    }
  }

  async function handleSignup() {
    if (!username.trim() || !password) {
      Alert.alert("입력 필요", "아이디와 비밀번호를 입력해주세요.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("입력 필요", "이메일을 입력해주세요.");
      return;
    }
    if (!normalizedPhone) {
      Alert.alert("입력 필요", "휴대폰 번호를 입력해주세요.");
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
      Alert.alert("아이디 확인", "아이디 중복검사를 완료해주세요.");
      return;
    }
    if (phoneChecked !== true) {
      Alert.alert("휴대폰 번호 확인", "휴대폰 번호 중복검사를 완료해주세요.");
      return;
    }
    if (emailChecked !== true) {
      Alert.alert("이메일 확인", "이메일 중복검사를 완료해주세요.");
      return;
    }
    if (!emailVerified) {
      Alert.alert("이메일 인증", "이메일 인증을 완료해주세요.");
      return;
    }

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
      Alert.alert("회원가입 성공", "회원가입이 완료되었습니다. 로그인해주세요.");
      router.replace("/login");
    } catch (e: any) {
      const message = String(e?.response?.data?.code ?? e?.message ?? "");
      if (message.includes("USERNAME_DUPLICATE") || message === "USERNAME_TAKEN") {
        Alert.alert("회원가입 실패", "이미 사용 중인 아이디입니다.");
      } else if (message.includes("PHONE_DUPLICATE") || message === "PHONE_TAKEN") {
        Alert.alert("회원가입 실패", "이미 사용 중인 휴대폰 번호입니다.");
      } else if (message.includes("EMAIL_DUPLICATE") || message === "EMAIL_TAKEN") {
        Alert.alert("회원가입 실패", "이미 사용 중인 이메일입니다.");
      } else if (message.includes("EMAIL_VERIFICATION") || message === "EMAIL_NOT_VERIFIED") {
        Alert.alert("회원가입 실패", "이메일 인증을 먼저 완료해주세요.");
      } else {
        Alert.alert("회원가입 실패", "입력값 또는 서버 응답을 확인해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, gap: 12 }}>
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
      <Pressable onPress={handleCheckUsername} disabled={checkingUsername || !username.trim()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: checkingUsername || !username.trim() ? 0.6 : 1 }}>
        <Text>{checkingUsername ? "확인 중..." : "아이디 중복검사"}</Text>
      </Pressable>

      <TextInput
        value={phoneNumber}
        onChangeText={(t) => {
          setPhoneNumber(t);
          setPhoneChecked(null);
        }}
        placeholder="휴대폰 번호 예) 01012345678"
        keyboardType="phone-pad"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />
      <Pressable onPress={handleCheckPhone} disabled={checkingPhone || !normalizedPhone} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: checkingPhone || !normalizedPhone ? 0.6 : 1 }}>
        <Text>{checkingPhone ? "확인 중..." : "휴대폰 번호 중복검사"}</Text>
      </Pressable>

      <TextInput
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setEmailChecked(null);
          setEmailCodeSent(false);
          setEmailVerified(false);
        }}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />
      <Pressable onPress={handleCheckEmail} disabled={checkingEmail || !email.trim()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: checkingEmail || !email.trim() ? 0.6 : 1 }}>
        <Text>{checkingEmail ? "확인 중..." : "이메일 중복검사"}</Text>
      </Pressable>

      <Pressable onPress={handleSendEmailCode} disabled={sendingEmailCode || emailChecked !== true} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: sendingEmailCode || emailChecked !== true ? 0.6 : 1 }}>
        <Text>{sendingEmailCode ? "발송 중..." : "이메일 인증코드 발송"}</Text>
      </Pressable>

      <TextInput
        value={verificationCode}
        onChangeText={setVerificationCode}
        placeholder="이메일 인증코드"
        keyboardType="number-pad"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />
      <Pressable onPress={handleVerifyEmail} disabled={verifyingEmailCode || !emailCodeSent} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: verifyingEmailCode || !emailCodeSent ? 0.6 : 1 }}>
        <Text>{verifyingEmailCode ? "확인 중..." : "이메일 인증 확인"}</Text>
      </Pressable>

      <TextInput value={password} onChangeText={setPassword} placeholder="비밀번호" secureTextEntry style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

      <View style={{ gap: 6 }}>
        <TextInput value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="비밀번호 재확인" secureTextEntry style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        {passwordConfirm.length > 0 && (
          <Text style={{ fontSize: 12, opacity: 0.9 }}>
            {password === passwordConfirm ? "✅ 비밀번호가 일치합니다." : "❌ 비밀번호가 일치하지 않습니다."}
          </Text>
        )}
      </View>

      <Text style={{ marginTop: 8, fontWeight: "600" }}>거주 유형</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["ONE_ROOM", "OFFICETEL", "APT", "VILLA", "HOUSE", "ETC"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setResidenceType(t)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderRadius: 10,
              opacity: residenceType === t ? 1 : 0.55,
            }}
          >
            <Text>{RESIDENCE_LABELS[t]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ marginTop: 8, fontWeight: "600" }}>임대 형태</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["NONE", "MONTHLY", "JEONSE", "SALE"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setRentType(t)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderRadius: 10,
              opacity: rentType === t ? 1 : 0.55,
            }}
          >
            <Text>{RENT_LABELS[t]}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput value={address} onChangeText={setAddress} placeholder="주소 (선택)" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

      <Pressable onPress={handleSignup} disabled={isSubmitting} style={{ marginTop: 16, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: "center", opacity: isSubmitting ? 0.6 : 1 }}>
        <Text>{isSubmitting ? "회원가입 중..." : "회원가입"}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 10, alignItems: "center" }}>
        <Text style={{ textDecorationLine: "underline" }}>로그인으로 돌아가기</Text>
      </Pressable>

      <Stack.Screen options={{ headerShown: false }} />
    </ScrollView>
  );
}
