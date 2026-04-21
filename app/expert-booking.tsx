import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// [원본 상대 경로 및 API 로직 보존]
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getMe } from "../src/api/users";

const MAIN_BLUE = "#3b82f6";

function issueLabel(t?: string) {
  const labels: Record<string, string> = {
    CRACK: "균열",
    LEAK: "누수",
    MOLD: "곰팡이",
    DAMAGE: "파손",
    ELECTRIC: "전기",
    GAS: "가스",
  };
  return labels[t as IssueType] || "기타";
}

export default function ExpertBooking() {
  const {
    historyId,
    vendorId,
    vendorName,
    vendorPhone,
    vendorIntro,
    vendorMinPrice,
    issueType,
  } = useLocalSearchParams<{
    historyId?: string;
    vendorId?: string;
    vendorName?: string;
    vendorPhone?: string;
    vendorIntro?: string;
    vendorMinPrice?: string;
    issueType?: string;
  }>();

  // --- [원본 상태 관리 로직] ---
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [issueSummary, setIssueSummary] = useState("");
  const [requestNote, setRequestNote] = useState("");

  // --- [원본 데이터 자동 완성 로직] ---
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
        Alert.alert("기본값 불러오기 실패", "사용자 정보를 확인해주세요.");
      }
    }
    fillDefaults();
  }, [historyId, issueType]);

  // --- [원본 예약 처리 및 검증 로직] ---
  function handleReserve() {
    if (!vendorId) {
      Alert.alert("예약 불가", "업체 정보가 없습니다.");
      return;
    }
    if (!customerName || !phoneNumber || !address || !visitDate) {
      Alert.alert("입력 필요", "이름, 연락처, 주소, 방문 희망일을 입력해주세요.");
      return;
    }
    Alert.alert("예약 신청 완료", "현재 전문가 예약 API 연동 전 단계입니다. 입력하신 정보가 저장되었습니다.");
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* 헤더 디자인 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>예약 신청하기</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 선택된 업체 정보 카드 (다크톤 디자인 적용) */}
        <View style={styles.vendorCard}>
          <Text style={styles.vendorLabel}>선택한 업체</Text>
          <Text style={styles.vendorName}>{vendorName ?? "업체 정보 없음"}</Text>
          
          <View style={styles.vendorInfoRow}>
            <MaterialCommunityIcons name="tag-outline" size={14} color="#94a3b8" />
            <Text style={styles.vendorInfoText}>
              예상 시작가: {vendorMinPrice ? `${Number(vendorMinPrice).toLocaleString()}원~` : "-"}
            </Text>
          </View>
          
          <View style={styles.vendorInfoRow}>
            <Feather name="phone" size={14} color="#94a3b8" />
            <Text style={styles.vendorInfoText}>{vendorPhone ?? "-"}</Text>
          </View>

          {vendorIntro && (
            <Text style={styles.vendorIntro} numberOfLines={1}>
              {vendorIntro}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>신청자 정보</Text>

        {/* 입력 폼 섹션 (원본 스타일 반영) */}
        <View style={styles.formSection}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>방문자 성함</Text>
            <TextInput 
              value={customerName} 
              onChangeText={setCustomerName} 
              placeholder="성함을 입력하세요" 
              style={styles.input} 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>연락처</Text>
            <TextInput 
              value={phoneNumber} 
              onChangeText={setPhoneNumber} 
              placeholder="010-0000-0000" 
              keyboardType="phone-pad" 
              style={styles.input} 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>방문 주소</Text>
            <TextInput 
              value={address} 
              onChangeText={setAddress} 
              placeholder="상세 주소를 입력하세요" 
              style={styles.input} 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>방문 희망일</Text>
            <TextInput 
              value={visitDate} 
              onChangeText={setVisitDate} 
              placeholder="예) 2026-03-18 오전" 
              style={styles.input} 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>진단 내용 요약</Text>
            <TextInput 
              value={issueSummary} 
              onChangeText={setIssueSummary} 
              placeholder="진단 결과가 없습니다" 
              style={[styles.input, styles.readOnlyInput]} 
              editable={false} 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>상세 요청사항</Text>
            <TextInput
              value={requestNote}
              onChangeText={setRequestNote}
              placeholder="업체에 전달할 추가 내용을 적어주세요."
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
            />
          </View>
        </View>

        {/* 버튼 섹션 */}
        <View style={styles.buttonContainer}>
          <Pressable onPress={handleReserve} style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>결제 전 단계까지 작성 완료</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>취소하기</Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  scrollContent: { padding: 20 },

  // 업체 정보 카드
  vendorCard: { backgroundColor: "#1e293b", borderRadius: 24, padding: 24, marginBottom: 24, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  vendorLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  vendorName: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 14 },
  vendorInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  vendorInfoText: { color: "#cbd5e1", fontSize: 14, fontWeight: "500" },
  vendorIntro: { color: "#64748b", fontSize: 13, marginTop: 10, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 10 },

  // 폼 섹션
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 16, marginLeft: 4 },
  formSection: { gap: 20 },
  inputWrapper: { gap: 8 },
  label: { fontSize: 14, fontWeight: "700", color: "#475569", marginLeft: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: "#1e293b",
  },
  readOnlyInput: { backgroundColor: "#f1f5f9", color: "#64748b" },
  textArea: { minHeight: 120, lineHeight: 22 },

  // 버튼
  buttonContainer: { marginTop: 32, gap: 12 },
  submitBtn: {
    backgroundColor: MAIN_BLUE,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: MAIN_BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelBtnText: { color: "#64748b", fontSize: 15, fontWeight: "700" },
});