import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getMe } from "../src/api/users";

function issueLabel(t?: string) {
  switch (t as IssueType) {
    case "CRACK": return "균열";
    case "LEAK": return "누수";
    case "MOLD": return "곰팡이";
    case "DAMAGE": return "파손";
    case "ELECTRIC": return "전기";
    case "GAS": return "가스";
    default: return "기타";
  }
}

export default function ExpertBooking() {
  const { historyId, vendorId, vendorName, vendorPhone, vendorIntro, vendorMinPrice, issueType } = useLocalSearchParams<{ historyId?: string; vendorId?: string; vendorName?: string; vendorPhone?: string; vendorIntro?: string; vendorMinPrice?: string; issueType?: string }>();

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [issueSummary, setIssueSummary] = useState("");
  const [requestNote, setRequestNote] = useState("");

  useEffect(() => {
    async function fillDefaults() {
      try {
        const me = await getMe();
        setCustomerName(me.username ?? "");
        setPhoneNumber(me.phoneNumber ?? "");
        setAddress(me.address ?? "");

        if (historyId) {
          const detail = await getHistoryDetail(String(historyId));
          setIssueSummary(`${issueLabel(detail.issueType)} / 위험도 ${detail.riskScore}%`);
          setRequestNote(`historyId=${detail.id}`);
        } else if (issueType) {
          setIssueSummary(issueLabel(issueType));
        }
      } catch {
        Alert.alert("기본값 불러오기 실패", "사용자/히스토리 API를 확인해주세요.");
      }
    }
    fillDefaults();
  }, [historyId, issueType]);

  function handleReserve() {
    if (!vendorId) {
      Alert.alert("예약 불가", "업체 정보가 없습니다.");
      return;
    }
    if (!customerName || !phoneNumber || !address || !visitDate) {
      Alert.alert("입력 필요", "이름, 연락처, 주소, 방문 희망일을 입력해주세요.");
      return;
    }
    Alert.alert("예약 API 필요", "현재 백엔드에는 전문가 예약 API가 없어 여기까지 입력만 가능합니다.");
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>전문업체 예약</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>{vendorName ?? "업체 정보 없음"}</Text>
        <Text>업체 ID: {vendorId ?? "-"}</Text>
        <Text>예상 시작가: {vendorMinPrice ? `${Number(vendorMinPrice).toLocaleString()}원~` : "-"}</Text>
        <Text>연락처: {vendorPhone ?? "-"}</Text>
        <Text style={{ opacity: 0.8 }}>{vendorIntro ?? "-"}</Text>
      </View>

      <TextInput value={customerName} onChangeText={setCustomerName} placeholder="이름" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="연락처" keyboardType="phone-pad" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={address} onChangeText={setAddress} placeholder="주소" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={visitDate} onChangeText={setVisitDate} placeholder="방문 희망일 예) 2026-03-18 오전" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={issueSummary} onChangeText={setIssueSummary} placeholder="문제 요약" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={requestNote} onChangeText={setRequestNote} placeholder="요청사항" multiline textAlignVertical="top" style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 120 }} />

      <Pressable onPress={handleReserve} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text style={{ fontWeight: "700" }}>결제 전 단계까지 작성 완료</Text>
      </Pressable>
    </ScrollView>
  );
}
