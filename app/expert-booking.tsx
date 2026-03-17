import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "@/src/api/histories";
import { getMe } from "@/src/api/users";
import { expertVendors } from "@/src/mock/expertVendors";

function issueLabel(t?: string) {
  switch (t as IssueType) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    default:
      return "기타";
  }
}

export default function ExpertBooking() {
  const { historyId, vendorId, issueType } = useLocalSearchParams<{ historyId?: string; vendorId?: string; issueType?: string }>();

  const vendor = useMemo(() => expertVendors.find((item) => item.id === vendorId) ?? null, [vendorId]);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [issueSummary, setIssueSummary] = useState("");
  const [requestNote, setRequestNote] = useState("");

  useEffect(() => {
    async function fillDefaults() {
      const me = await getMe();
      setCustomerName(me.username ?? "");
      setPhoneNumber(me.phoneNumber ?? "");
      setAddress(me.address ?? "");

      if (historyId) {
        const detail = await getHistoryDetail(String(historyId));
        const summary = `${issueLabel(detail.issueType)} / 위험도 ${detail.riskScore}%`;
        const note = [detail.cause, detail.caution].filter(Boolean).join("\n");
        setIssueSummary(summary);
        setRequestNote(note);
      } else if (issueType) {
        setIssueSummary(issueLabel(issueType));
      }
    }
    fillDefaults();
  }, [historyId, issueType]);

  function handleReserve() {
    if (!vendor) {
      Alert.alert("예약 불가", "업체 정보를 찾을 수 없습니다.");
      return;
    }
    if (!customerName || !phoneNumber || !address || !visitDate) {
      Alert.alert("입력 필요", "이름, 연락처, 주소, 방문 희망일을 입력해주세요.");
      return;
    }

    // TODO: 백엔드 연동 시 이 위치에서 예약 생성 API 호출
    // 예) POST /api/expert-bookings
    // body: { vendorId, historyId, customerName, phoneNumber, address, visitDate, issueSummary, requestNote }

    Alert.alert("예약서 작성 완료", "결제 전 단계까지 작성되었습니다.");
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>전문업체 예약</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>{vendor?.name ?? "업체 정보 없음"}</Text>
        {vendor ? (
          <>
            <Text>예상 시작가: {vendor.minPrice.toLocaleString()}원~</Text>
            <Text>연락처: {vendor.phone}</Text>
            <Text style={{ opacity: 0.8 }}>{vendor.intro}</Text>
          </>
        ) : null}
      </View>

      <TextInput value={customerName} onChangeText={setCustomerName} placeholder="이름" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="연락처" keyboardType="phone-pad" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={address} onChangeText={setAddress} placeholder="주소" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={visitDate} onChangeText={setVisitDate} placeholder="방문 희망일 예) 2026-03-18 오전" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={issueSummary} onChangeText={setIssueSummary} placeholder="문제 요약" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput
        value={requestNote}
        onChangeText={setRequestNote}
        placeholder="요청사항"
        multiline
        textAlignVertical="top"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 120 }}
      />

      <Pressable onPress={handleReserve} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ fontWeight: "700" }}>결제 전 단계까지 작성 완료</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text>뒤로</Text>
      </Pressable>
    </ScrollView>
  );
}
