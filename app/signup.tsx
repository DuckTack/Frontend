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
import { Ionicons } from "@expo/vector-icons";

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

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 50;
const EMAIL_MAX_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function isDuplicateResponse(error: any) {
  const status = error?.response?.status;
  const code = String(error?.response?.data?.code ?? "");
  const message = String(error?.response?.data?.message ?? "");

  return (
      status === 409 ||
      code.includes("DUPLICATE") ||
      code.includes("ALREADY") ||
      message.includes("이미") ||
      message.includes("중복")
  );
}

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

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const trimmedUsername = useMemo(() => username.trim(), [username]);
  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const trimmedPhone = useMemo(() => phoneNumber.trim(), [phoneNumber]);
  const normalizedPhone = useMemo(() => normalizePhone(phoneNumber), [phoneNumber]);

  const isUsernameFormatValid =
      trimmedUsername.length >= USERNAME_MIN_LENGTH &&
      trimmedUsername.length <= USERNAME_MAX_LENGTH;

  const isPasswordFormatValid =
      password.length >= PASSWORD_MIN_LENGTH &&
      password.length <= PASSWORD_MAX_LENGTH;

  const isEmailFormatValid =
      trimmedEmail.length <= EMAIL_MAX_LENGTH &&
      EMAIL_REGEX.test(trimmedEmail);

  // 휴대폰 번호는 숫자만 남긴 뒤 010 + 8자리 기준으로 검사
  const isPhoneFormatValid =
      normalizedPhone.length === 11 &&
      normalizedPhone.startsWith("010");

  useEffect(() => {
    if (consent === "1") return;

    Alert.alert(
        "동의 필요",
        "개인정보 동의 화면을 먼저 완료한 뒤 회원가입을 진행해주세요."
    );

    router.replace("/signup-consent");
  }, [consent]);

  const handleCheckUsername = async () => {
    if (!trimmedUsername) {
      Alert.alert("입력 필요", "아이디를 입력해주세요.");
      return;
    }

    if (!isUsernameFormatValid) {
      Alert.alert("형식 확인", "아이디는 4~50자로 입력해주세요.");
      return;
    }

    try {
      setCheckingUsername(true);

      const ok = await checkUsernameAvailable(trimmedUsername);

      setUsernameChecked(ok);

      if (ok) {
        Alert.alert("사용 가능", "사용 가능한 아이디입니다.");
      } else {
        Alert.alert("사용 불가", "이미 사용 중인 아이디입니다.");
      }
    } catch (error: any) {
      console.log("[회원가입] 아이디 중복확인 실패:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      if (isDuplicateResponse(error)) {
        setUsernameChecked(false);
        Alert.alert("사용 불가", "이미 사용 중인 아이디입니다.");
        return;
      }

      Alert.alert(
          "중복확인 실패",
          "아이디 중복확인을 진행하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleCheckPhone = async () => {
    if (!trimmedPhone) {
      Alert.alert("입력 필요", "휴대폰 번호를 입력해주세요.");
      return;
    }

    if (!isPhoneFormatValid) {
      Alert.alert(
          "형식 확인",
          "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요."
      );
      return;
    }

    try {
      setCheckingPhone(true);

      console.log("[회원가입] 휴대폰 중복확인 요청:", {
        input: trimmedPhone,
        normalized: normalizedPhone,
      });

      const ok = await checkPhoneAvailable(normalizedPhone);

      console.log("[회원가입] 휴대폰 중복확인 결과:", ok);

      setPhoneChecked(ok);

      if (ok) {
        Alert.alert("사용 가능", "사용 가능한 휴대폰 번호입니다.");
      } else {
        Alert.alert("사용 불가", "이미 등록된 휴대폰 번호입니다.");
      }
    } catch (error: any) {
      console.log("[회원가입] 휴대폰 중복확인 실패:", {
        input: trimmedPhone,
        normalized: normalizedPhone,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      if (isDuplicateResponse(error)) {
        setPhoneChecked(false);
        Alert.alert("사용 불가", "이미 등록된 휴대폰 번호입니다.");
        return;
      }

      Alert.alert(
          "중복확인 실패",
          "휴대폰 번호 중복확인을 진행하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleCheckEmail = async () => {
    if (!trimmedEmail) {
      Alert.alert("입력 필요", "이메일을 입력해주세요.");
      return;
    }

    if (!isEmailFormatValid) {
      Alert.alert("형식 확인", "이메일 형식을 확인해주세요. 예: user@example.com");
      return;
    }

    try {
      setCheckingEmail(true);

      const ok = await checkEmailAvailable(trimmedEmail.toLowerCase());

      setEmailChecked(ok);
      setEmailCodeSent(false);
      setEmailVerified(false);
      setVerificationCode("");

      if (ok) {
        Alert.alert("사용 가능", "사용 가능한 이메일입니다. 인증코드를 발송할 수 있습니다.");
      } else {
        Alert.alert("사용 불가", "이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.");
      }
    } catch (error: any) {
      console.log("[회원가입] 이메일 중복확인 실패:", {
        email: trimmedEmail.toLowerCase(),
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      if (isDuplicateResponse(error)) {
        setEmailChecked(false);
        setEmailCodeSent(false);
        setEmailVerified(false);
        Alert.alert("사용 불가", "이미 사용 중인 이메일입니다.");
        return;
      }

      Alert.alert(
          "중복확인 실패",
          "이메일 중복확인을 진행하지 못했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (emailChecked !== true) {
      Alert.alert("알림", "이메일 중복확인을 먼저 완료해주세요.");
      return;
    }

    try {
      setSendingEmailCode(true);

      console.log("[회원가입] 이메일 인증코드 발송 요청:", trimmedEmail.toLowerCase());

      await sendEmailVerificationCode(trimmedEmail.toLowerCase());

      setEmailCodeSent(true);
      setEmailVerified(false);
      setVerificationCode("");

      Alert.alert(
          "인증코드 발송",
          "이메일로 인증코드를 보냈습니다. 메일함과 스팸함을 확인해주세요."
      );
    } catch (error: any) {
      console.log("[회원가입] 이메일 인증코드 발송 실패:", {
        email: trimmedEmail.toLowerCase(),
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      Alert.alert(
          "발송 실패",
          error?.response?.data?.message ||
          "인증코드를 보내지 못했습니다. 이메일 주소와 메일 서버 설정을 확인해주세요."
      );
    } finally {
      setSendingEmailCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      Alert.alert("입력 필요", "인증코드를 입력해주세요.");
      return;
    }

    try {
      setVerifyingEmail(true);

      const ok = await verifyEmailCode(
          trimmedEmail.toLowerCase(),
          verificationCode.trim()
      );

      setEmailVerified(ok);

      if (ok) {
        Alert.alert("이메일 인증", "이메일 인증이 완료되었습니다.");
      } else {
        Alert.alert("인증 실패", "인증코드가 일치하지 않습니다.");
      }
    } catch (error: any) {
      console.log("[회원가입] 이메일 인증 실패:", {
        email: trimmedEmail.toLowerCase(),
        code: verificationCode.trim(),
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      Alert.alert(
          "인증 실패",
          error?.response?.data?.message ||
          "인증코드를 확인하지 못했습니다. 코드를 다시 확인해주세요."
      );
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSignup = async () => {
    if (!isUsernameFormatValid) {
      Alert.alert("알림", "아이디 형식을 확인해주세요.");
      return;
    }

    if (!isPhoneFormatValid) {
      Alert.alert("알림", "휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.");
      return;
    }

    if (!isEmailFormatValid) {
      Alert.alert("알림", "이메일 형식을 확인해주세요.");
      return;
    }

    if (!isPasswordFormatValid) {
      Alert.alert("알림", "비밀번호는 8~72자로 입력해주세요.");
      return;
    }

    if (usernameChecked !== true) {
      Alert.alert("알림", "아이디 중복확인을 해주세요.");
      return;
    }

    if (phoneChecked !== true) {
      Alert.alert("알림", "휴대폰 번호 중복확인을 해주세요.");
      return;
    }

    if (emailVerified !== true) {
      Alert.alert("알림", "이메일 인증을 완료해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert("알림", "비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setIsSubmitting(true);

      await signup({
        username: trimmedUsername,
        email: trimmedEmail.toLowerCase(),
        password,
        phoneNumber: normalizedPhone,
        residenceType,
        rentType,
        address: address.trim(),
        emailVerified: true,
      });

      Alert.alert("가입 완료", "회원가입이 완료되었습니다. 로그인해주세요.");
      router.replace("/login");
    } catch (error: any) {
      console.log("[회원가입] 가입 실패:", {
        username: trimmedUsername,
        email: trimmedEmail.toLowerCase(),
        phoneNumber: normalizedPhone,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });

      Alert.alert(
          "가입 실패",
          error?.response?.data?.message ||
          "회원가입을 완료하지 못했습니다. 입력한 정보를 다시 확인해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />

          <View style={styles.header}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.headerTitle}>회원가입</Text>
                <Text style={styles.headerSub}>DduckTack 계정을 만들어 서비스를 이용해보세요</Text>
              </View>

              <Pressable
                  onPress={() => router.replace("/login")}
                  style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#334155" />
              </Pressable>
            </View>
          </View>

          <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.label}>
                아이디 <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.row}>
                <TextInput
                    style={styles.flexInput}
                    placeholder="사용할 아이디 입력"
                    value={username}
                    onChangeText={(t) => {
                      setUsername(t);
                      setUsernameChecked(null);
                    }}
                    autoCapitalize="none"
                />

                <Pressable
                    style={[
                      styles.inlineButton,
                      checkingUsername && styles.inlineButtonDisabled,
                    ]}
                    onPress={handleCheckUsername}
                    disabled={checkingUsername}
                >
                  {checkingUsername ? (
                      <ActivityIndicator size="small" color={MAIN_BLUE} />
                  ) : (
                      <Text style={styles.inlineButtonText}>중복확인</Text>
                  )}
                </Pressable>
              </View>

              <Text
                  style={[
                    styles.helperText,
                    username !== "" && !isUsernameFormatValid && styles.helperTextError,
                  ]}
              >
                4~50자로 입력해주세요.
              </Text>

              {usernameChecked !== null && (
                  <Text
                      style={[
                        styles.statusText,
                        { color: usernameChecked ? "#10b981" : "#ef4444" },
                      ]}
                  >
                    {usernameChecked
                        ? "✓ 사용 가능한 아이디입니다."
                        : "✕ 이미 사용 중인 아이디입니다."}
                  </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                휴대폰 번호 <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.row}>
                <TextInput
                    style={styles.flexInput}
                    placeholder="01012345678"
                    value={phoneNumber}
                    onChangeText={(t) => {
                      setPhoneNumber(t);
                      setPhoneChecked(null);
                    }}
                    keyboardType="phone-pad"
                />

                <Pressable
                    style={[
                      styles.inlineButton,
                      checkingPhone && styles.inlineButtonDisabled,
                    ]}
                    onPress={handleCheckPhone}
                    disabled={checkingPhone}
                >
                  {checkingPhone ? (
                      <ActivityIndicator size="small" color={MAIN_BLUE} />
                  ) : (
                      <Text style={styles.inlineButtonText}>중복확인</Text>
                  )}
                </Pressable>
              </View>

              <Text
                  style={[
                    styles.helperText,
                    phoneNumber !== "" && !isPhoneFormatValid && styles.helperTextError,
                  ]}
              >
                010으로 시작하는 11자리 번호를 입력해주세요. 하이픈은 입력해도 자동으로 제외됩니다.
              </Text>

              {phoneChecked !== null && (
                  <Text
                      style={[
                        styles.statusText,
                        { color: phoneChecked ? "#10b981" : "#ef4444" },
                      ]}
                  >
                    {phoneChecked
                        ? "✓ 사용 가능한 휴대폰 번호입니다."
                        : "✕ 이미 등록된 휴대폰 번호입니다."}
                  </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                이메일 <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.row}>
                <TextInput
                    style={styles.flexInput}
                    placeholder="example@email.com"
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setEmailChecked(null);
                      setEmailCodeSent(false);
                      setEmailVerified(false);
                      setVerificationCode("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Pressable
                    style={[
                      styles.inlineButton,
                      checkingEmail && styles.inlineButtonDisabled,
                    ]}
                    onPress={handleCheckEmail}
                    disabled={checkingEmail}
                >
                  {checkingEmail ? (
                      <ActivityIndicator size="small" color={MAIN_BLUE} />
                  ) : (
                      <Text style={styles.inlineButtonText}>중복확인</Text>
                  )}
                </Pressable>
              </View>

              <Text
                  style={[
                    styles.helperText,
                    email !== "" && !isEmailFormatValid && styles.helperTextError,
                  ]}
              >
                이메일 형식으로 입력해주세요. 예: user@example.com
              </Text>

              <Pressable
                  style={[
                    styles.fullWidthBtn,
                    (!emailChecked || emailVerified || sendingEmailCode) &&
                    styles.fullWidthBtnDisabled,
                  ]}
                  onPress={handleSendEmailCode}
                  disabled={!emailChecked || emailVerified || sendingEmailCode}
              >
                {sendingEmailCode ? (
                    <ActivityIndicator size="small" color="#94a3b8" />
                ) : (
                    <Text
                        style={[
                          styles.fullWidthBtnText,
                          (!emailChecked || emailVerified) && styles.fullWidthBtnTextDisabled,
                        ]}
                    >
                      {emailVerified
                          ? "이메일 인증 완료"
                          : emailCodeSent
                              ? "인증코드 재발송"
                              : "인증코드 발송"}
                    </Text>
                )}
              </Pressable>

              <View style={[styles.row, { marginTop: 10 }]}>
                <TextInput
                    style={[
                      styles.flexInput,
                      (!emailCodeSent || emailVerified) && styles.inputDisabled,
                    ]}
                    placeholder="인증코드 6자리 입력"
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    editable={emailCodeSent && !emailVerified}
                />

                <Pressable
                    style={[
                      styles.inlineButton,
                      (!emailCodeSent || emailVerified || verifyingEmail) &&
                      styles.inlineButtonDisabled,
                    ]}
                    onPress={handleVerifyEmail}
                    disabled={!emailCodeSent || emailVerified || verifyingEmail}
                >
                  {verifyingEmail ? (
                      <ActivityIndicator size="small" color="#94a3b8" />
                  ) : (
                      <Text
                          style={[
                            styles.inlineButtonText,
                            (!emailCodeSent || emailVerified) &&
                            styles.inlineButtonTextDisabled,
                          ]}
                      >
                        인증하기
                      </Text>
                  )}
                </Pressable>
              </View>

              {emailChecked !== null && !emailVerified && (
                  <Text
                      style={[
                        styles.statusText,
                        { color: emailChecked ? "#10b981" : "#ef4444" },
                      ]}
                  >
                    {emailChecked
                        ? "✓ 사용 가능한 이메일입니다."
                        : "✕ 이미 사용 중이거나 사용할 수 없는 이메일입니다."}
                  </Text>
              )}

              {emailVerified && (
                  <Text style={[styles.statusText, { color: "#10b981" }]}>
                    ✓ 이메일 인증이 완료되었습니다.
                  </Text>
              )}

              {emailCodeSent && !emailVerified && (
                  <Text style={[styles.statusText, { color: MAIN_BLUE }]}>
                    메일로 전송된 인증코드를 입력해주세요. 메일이 보이지 않으면 스팸함도 확인해주세요.
                  </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                비밀번호 <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.passwordWrapper}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="비밀번호 입력"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />

                <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                >
                  <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#94a3b8"
                  />
                </Pressable>
              </View>

              <Text
                  style={[
                    styles.helperText,
                    password !== "" && !isPasswordFormatValid && styles.helperTextError,
                  ]}
              >
                8~72자로 입력해주세요.
              </Text>

              <View style={[styles.passwordWrapper, { marginTop: 10 }]}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="비밀번호 재확인"
                    value={passwordConfirm}
                    onChangeText={setPasswordConfirm}
                    secureTextEntry={!showConfirm}
                />

                <Pressable
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeIcon}
                >
                  <Ionicons
                      name={showConfirm ? "eye-off" : "eye"}
                      size={20}
                      color="#94a3b8"
                  />
                </Pressable>
              </View>

              {passwordConfirm !== "" && (
                  <Text
                      style={[
                        styles.statusText,
                        { color: password === passwordConfirm ? "#10b981" : "#ef4444" },
                      ]}
                  >
                    {password === passwordConfirm
                        ? "✓ 비밀번호가 일치합니다."
                        : "✕ 비밀번호가 일치하지 않습니다."}
                  </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                거주 유형 <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.chipGrid}>
                {RESIDENCE_OPTIONS.map((t) => (
                    <Pressable
                        key={t.id}
                        onPress={() => setResidenceType(t.id)}
                        style={[
                          styles.chip,
                          residenceType === t.id && styles.chipActive,
                        ]}
                    >
                      <Text
                          style={[
                            styles.chipText,
                            residenceType === t.id && styles.chipTextActive,
                          ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>
                임대 유형 <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.chipGrid}>
                {RENT_OPTIONS.map((t) => (
                    <Pressable
                        key={t.id}
                        onPress={() => setRentType(t.id)}
                        style={[
                          styles.chip,
                          rentType === t.id && styles.chipActive,
                        ]}
                    >
                      <Text
                          style={[
                            styles.chipText,
                            rentType === t.id && styles.chipTextActive,
                          ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                ))}
              </View>
            </View>

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
              {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
              ) : (
                  <Text style={styles.submitButtonText}>가입 완료하기</Text>
              )}
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

  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 24,
    backgroundColor: "#f8faff",
  },

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1e293b",
  },

  headerSub: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },

  closeButton: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 60,
  },

  section: {
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
    marginLeft: 4,
  },

  required: {
    color: "#ef4444",
  },

  row: {
    flexDirection: "row",
    gap: 8,
  },

  flexInput: {
    flex: 1,
    height: 56,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
  },

  inputDisabled: {
    backgroundColor: "#f1f5f9",
    color: "#94a3b8",
  },

  inlineButton: {
    paddingHorizontal: 18,
    height: 56,
    minWidth: 92,
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  inlineButtonDisabled: {
    backgroundColor: "#e2e8f0",
  },

  inlineButtonText: {
    color: MAIN_BLUE,
    fontWeight: "700",
    fontSize: 14,
  },

  inlineButtonTextDisabled: {
    color: "#94a3b8",
  },

  fullWidthBtn: {
    backgroundColor: MAIN_BLUE,
    borderRadius: 16,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  fullWidthBtnDisabled: {
    backgroundColor: "#e2e8f0",
  },

  fullWidthBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  fullWidthBtnTextDisabled: {
    color: "#94a3b8",
  },

  passwordWrapper: {
    position: "relative",
  },

  passwordInput: {
    height: 56,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
    paddingRight: 50,
  },

  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 18,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 6,
    lineHeight: 18,
  },

  helperText: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 6,
    marginLeft: 6,
    lineHeight: 18,
  },

  helperTextError: {
    color: "#ef4444",
    fontWeight: "700",
  },

  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    minWidth: "30%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  chipActive: {
    backgroundColor: MAIN_BLUE,
    borderColor: MAIN_BLUE,
  },

  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },

  chipTextActive: {
    color: "#fff",
  },

  submitButton: {
    backgroundColor: MAIN_BLUE,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: MAIN_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },

  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    gap: 8,
    marginBottom: 20,
  },

  footerText: {
    color: "#64748b",
    fontSize: 14,
  },

  footerLink: {
    color: MAIN_BLUE,
    fontWeight: "700",
    fontSize: 14,
    textDecorationLine: "underline",
  },

  addressInput: {
    height: 56,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
    width: "100%",
  },
});