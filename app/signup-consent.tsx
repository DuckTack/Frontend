import { useState } from "react";
import { Pressable, ScrollView, Text, View, Alert } from "react-native";
import { router, Stack } from "expo-router";

function CheckboxRow({
  label,
  checked,
  onPress,
  description,
  required = false,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  description: string;
  required?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontWeight: "800" }}>{checked ? "✓" : ""}</Text>
        </View>
        <Text style={{ fontWeight: "700", flex: 1 }}>
          {required ? "[필수] " : "[선택] "}
          {label}
        </Text>
      </View>
      <Text style={{ opacity: 0.75, lineHeight: 20 }}>{description}</Text>
    </Pressable>
  );
}

export default function SignupConsentPage() {
  const [serviceChecked, setServiceChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);

  const allRequiredChecked = serviceChecked && privacyChecked;

  function handleContinue() {
    if (!allRequiredChecked) {
      Alert.alert("동의 필요", "필수 동의 항목을 모두 체크해야 회원가입을 진행할 수 있습니다.");
      return;
    }
    router.replace("/signup?consent=1");
  }

  function handleAllAgree() {
    const next = !(serviceChecked && privacyChecked && marketingChecked);
    setServiceChecked(next);
    setPrivacyChecked(next);
    setMarketingChecked(next);
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", textAlign: "center" }}>회원가입 전 동의</Text>

      <Pressable onPress={handleAllAgree} style={{ borderWidth: 1, borderRadius: 14, padding: 14 }}>
        <Text style={{ fontWeight: "800" }}>
          {serviceChecked && privacyChecked && marketingChecked ? "전체 동의 해제" : "전체 동의"}
        </Text>
      </Pressable>

      <CheckboxRow
        required
        checked={serviceChecked}
        onPress={() => setServiceChecked((prev) => !prev)}
        label="서비스 이용약관"
        description="로그인, 진단 기록 조회, DIY/전문가 안내, 리포트 기능 제공을 위한 기본 약관 동의입니다."
      />

      <CheckboxRow
        required
        checked={privacyChecked}
        onPress={() => setPrivacyChecked((prev) => !prev)}
        label="개인정보 수집 및 이용"
        description="회원가입 시 입력한 아이디, 이메일, 전화번호, 거주/주소 정보를 계정 생성, 본인 확인, 서비스 제공에 사용한다는 동의입니다."
      />

      <CheckboxRow
        checked={marketingChecked}
        onPress={() => setMarketingChecked((prev) => !prev)}
        label="마케팅 정보 수신"
        description="이벤트, 제휴 혜택, 업데이트 안내를 받아보는 선택 동의입니다. 체크하지 않아도 회원가입할 수 있습니다."
      />

      <Pressable onPress={handleContinue} style={{ paddingVertical: 13, borderWidth: 1, borderRadius: 12, alignItems: "center", opacity: allRequiredChecked ? 1 : 0.65 }}>
        <Text style={{ fontWeight: "700" }}>회원가입 화면으로 이동</Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/login")} style={{ paddingVertical: 10, alignItems: "center" }}>
        <Text style={{ textDecorationLine: "underline" }}>로그인으로 돌아가기</Text>
      </Pressable>

      <Stack.Screen options={{ headerShown: false }} />
    </ScrollView>
  );
}
