import { useEffect, useMemo, useRef, useState } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getMe } from "../src/api/users";
import { apiClient } from "../src/api/apiClient";

const MAIN_BLUE = "#3b82f6";

const RESERVATION_TIMES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

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

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function normalizeTime(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOrToday(value: string) {
  if (isValidDate(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date();
}

function extractList(data: any): any[] {
  const body = data?.data ?? data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.data)) return body.data;

  return [];
}

function parseOptionalNumber(value?: string) {
  if (!value) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function ExpertBooking() {
  const {
    historyId,
    vendorId,
    companyId,
    kakaoPlaceId,
    kakaoPlaceName,
    kakaoPlacePhone,
    vendorName,
    vendorPhone,
    vendorIntro,
    vendorMinPrice,
    issueType,
  } = useLocalSearchParams<{
    historyId?: string;
    vendorId?: string;
    companyId?: string;
    kakaoPlaceId?: string;
    kakaoPlaceName?: string;
    kakaoPlacePhone?: string;
    kakaoPlaceAddress?: string;
    kakaoPlaceLat?: string;
    kakaoPlaceLng?: string;
    vendorName?: string;
    vendorPhone?: string;
    vendorIntro?: string;
    vendorMinPrice?: string;
    issueType?: string;
  }>();

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitTime, setVisitTime] = useState("");
  const [issueSummary, setIssueSummary] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const finalVendorId = useMemo(() => {
    return companyId ?? (!kakaoPlaceId ? vendorId : undefined);
  }, [companyId, kakaoPlaceId, vendorId]);

  const parsedVendorId = Number(finalVendorId);
  const parsedHistoryId = parseOptionalNumber(historyId);

  const isReservablePartner = Boolean(finalVendorId && !Number.isNaN(parsedVendorId));

  const isSelectedDateUnavailable = visitDate
      ? unavailableDates.includes(visitDate.trim())
      : false;

  const unavailableTimeSet = useMemo(() => {
    return new Set(unavailableTimes.map(normalizeTime));
  }, [unavailableTimes]);

  useEffect(() => {
    async function fillDefaults() {
      try {
        const me = await getMe();
        setCustomerName(me.username ?? "");
        setPhoneNumber(me.phoneNumber ?? "");
        setAddress(me.address ?? "");
      } catch {
        Alert.alert("기본값 불러오기 실패", "사용자 정보를 확인해주세요.");
      }

      if (historyId) {
        try {
          const detail = await getHistoryDetail(String(historyId));
          setIssueSummary(`${issueLabel(detail.issueType)} / 위험도 ${detail.riskScore}%`);

          // 중요:
          // historyId를 requestNote에 문자열로 넣으면 DB 연결이 안 된다.
          // historyId는 handleReserve()의 body.historyId로 별도 전송한다.
          setRequestNote("");
        } catch {
          if (issueType) setIssueSummary(issueLabel(issueType));
        }
      } else if (issueType) {
        setIssueSummary(issueLabel(issueType));
      }
    }

    fillDefaults();
  }, [historyId, issueType]);

  useEffect(() => {
    async function loadUnavailableDates() {
      if (!isReservablePartner) return;

      try {
        const res = await apiClient.get(
            `/api/public/companies/${parsedVendorId}/unavailable-dates`
        );

        const list = extractList(res.data).map((v) => String(v).slice(0, 10));
        setUnavailableDates(list);
      } catch (e: any) {
        console.log("휴무일 조회 실패:", e?.response?.data ?? e?.message ?? e);
        setUnavailableDates([]);
      }
    }

    loadUnavailableDates();
  }, [isReservablePartner, parsedVendorId]);

  useEffect(() => {
    async function loadUnavailableTimes() {
      if (!isReservablePartner || !isValidDate(visitDate)) {
        setUnavailableTimes([]);
        return;
      }

      try {
        setAvailabilityLoading(true);

        const res = await apiClient.get(
            `/api/public/companies/${parsedVendorId}/unavailable-times`,
            {
              params: {
                date: visitDate.trim(),
              },
            }
        );

        const list = extractList(res.data).map((v) => normalizeTime(String(v)));
        setUnavailableTimes(list);

        if (list.includes(normalizeTime(visitTime))) {
          setVisitTime("");
        }
      } catch (e: any) {
        console.log("차단 시간 조회 실패:", e?.response?.data ?? e?.message ?? e);
        setUnavailableTimes([]);
      } finally {
        setAvailabilityLoading(false);
      }
    }

    loadUnavailableTimes();
  }, [isReservablePartner, parsedVendorId, visitDate]);

  function handleDateChange(event: any, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      const nextDate = formatDate(selectedDate);
      setVisitDate(nextDate);
      setVisitTime("");
    }
  }

  async function handleReserve() {
    if (submitting || submitLockRef.current) return;

    if (!isReservablePartner) {
      Alert.alert("예약 불가", "제휴업체만 앱에서 예약할 수 있습니다.");
      return;
    }

    if (
        !customerName.trim() ||
        !phoneNumber.trim() ||
        !address.trim() ||
        !visitDate.trim() ||
        !visitTime.trim()
    ) {
      Alert.alert("입력 필요", "방문자 정보, 방문일, 방문 시간을 모두 입력하세요.");
      return;
    }

    if (!isValidDate(visitDate)) {
      Alert.alert("날짜 형식 오류", "방문 희망일은 2026-06-01 형식으로 입력하세요.");
      return;
    }

    if (isSelectedDateUnavailable) {
      Alert.alert("예약 불가", "해당 날짜는 업체가 휴무 처리한 날짜입니다.");
      return;
    }

    if (unavailableTimeSet.has(normalizeTime(visitTime))) {
      Alert.alert("예약 불가", "해당 시간은 업체가 차단한 시간입니다.");
      return;
    }

    submitLockRef.current = true;

    try {
      setSubmitting(true);

      const body = {
        vendorId: parsedVendorId,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        visitDate: visitDate.trim(),
        visitTime: normalizeTime(visitTime.trim()),
        issueSummary: issueSummary.trim(),
        requestNote: requestNote.trim(),

        // 핵심:
        // requestNote에 "historyId=18"로 넣지 말고 별도 필드로 보내야
        // 백엔드 ReservationRequest.historyId → HistoryEntity.reservation 연결이 된다.
        historyId: parsedHistoryId,
      };

      console.log("예약 요청 body:", body);

      await apiClient.post("/api/reservations", body);

      Alert.alert(
          "예약 신청 완료",
          "전문업체 예약 신청이 완료되었습니다. 홈 화면에서 예약 진행 상태를 확인할 수 있습니다.",
          [
            {
              text: "확인",
              onPress: () => {
                router.replace("/(tabs)");
              },
            },
          ]
      );
    } catch (e: any) {
      console.log("예약 실패:", e?.response?.data ?? e?.message ?? e);

      const status = e?.response?.status;
      const message =
          e?.response?.data?.message ||
          (status === 409
              ? "이미 해당 시간에 예약이 있습니다. 다른 시간을 선택해주세요."
              : "예약 요청 중 문제가 발생했습니다.");

      Alert.alert("예약 실패", message);
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  return (
      <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>예약 신청하기</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.vendorCard}>
            <Text style={styles.vendorLabel}>선택한 업체</Text>
            <Text style={styles.vendorName}>{vendorName ?? kakaoPlaceName ?? "업체 정보 없음"}</Text>

            <View style={styles.vendorInfoRow}>
              <MaterialCommunityIcons name="tag-outline" size={14} color="#94a3b8" />
              <Text style={styles.vendorInfoText}>
                예상 시작가: {vendorMinPrice ? `${Number(vendorMinPrice).toLocaleString()}원~` : "-"}
              </Text>
            </View>

            <View style={styles.vendorInfoRow}>
              <Feather name="phone" size={14} color="#94a3b8" />
              <Text style={styles.vendorInfoText}>{vendorPhone ?? kakaoPlacePhone ?? "-"}</Text>
            </View>

            {kakaoPlaceId && !companyId ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    외부 검색 업체는 앱 내 예약이 불가능합니다. 제휴업체만 예약할 수 있습니다.
                  </Text>
                </View>
            ) : null}

            {vendorIntro && (
                <Text style={styles.vendorIntro} numberOfLines={1}>
                  {vendorIntro}
                </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>신청자 정보</Text>

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

              <Pressable
                  onPress={() => setShowDatePicker((prev) => !prev)}
                  style={[
                    styles.dateField,
                    isSelectedDateUnavailable && styles.blockedInput,
                  ]}
              >
                <Text
                    style={[
                      styles.dateFieldText,
                      !visitDate && styles.dateFieldPlaceholder,
                    ]}
                >
                  {visitDate || "날짜를 선택하세요"}
                </Text>
                <Feather name="calendar" size={22} color={MAIN_BLUE} />
              </Pressable>

              {showDatePicker ? (
                  <View style={styles.datePickerBox}>
                    <DateTimePicker
                        value={parseDateOrToday(visitDate)}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "calendar"}
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                        themeVariant="light"
                        accentColor={MAIN_BLUE}
                        locale="ko-KR"
                        style={styles.datePicker}
                    />

                    {Platform.OS === "ios" ? (
                        <Pressable
                            onPress={() => setShowDatePicker(false)}
                            style={styles.datePickerDoneButton}
                        >
                          <Text style={styles.datePickerDoneText}>날짜 선택 완료</Text>
                        </Pressable>
                    ) : null}
                  </View>
              ) : null}

              {isSelectedDateUnavailable ? (
                  <Text style={styles.blockedHint}>
                    이 날짜는 업체가 전체 휴무 처리한 날짜입니다.
                  </Text>
              ) : null}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>방문 희망 시간</Text>

              {!isValidDate(visitDate) ? (
                  <Text style={styles.helperText}>
                    방문 희망일을 먼저 캘린더에서 선택하세요.
                  </Text>
              ) : availabilityLoading ? (
                  <Text style={styles.helperText}>차단 시간을 불러오는 중...</Text>
              ) : (
                  <View style={styles.timeGrid}>
                    {RESERVATION_TIMES.map((time) => {
                      const blocked =
                          isSelectedDateUnavailable || unavailableTimeSet.has(time);
                      const selected = visitTime === time;

                      return (
                          <Pressable
                              key={time}
                              disabled={blocked}
                              onPress={() => setVisitTime(time)}
                              style={[
                                styles.timeButton,
                                selected && styles.timeButtonSelected,
                                blocked && styles.timeButtonBlocked,
                              ]}
                          >
                            <Text
                                style={[
                                  styles.timeButtonText,
                                  selected && styles.timeButtonTextSelected,
                                  blocked && styles.timeButtonTextBlocked,
                                ]}
                            >
                              {time}
                            </Text>
                            {blocked ? (
                                <Text style={styles.timeBlockedLabel}>예약불가</Text>
                            ) : null}
                          </Pressable>
                      );
                    })}
                  </View>
              )}

              {isValidDate(visitDate) && unavailableTimes.length > 0 ? (
                  <Text style={styles.helperText}>
                    업체가 차단한 시간은 예약할 수 없습니다.
                  </Text>
              ) : null}
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

          <View style={styles.buttonContainer}>
            <Pressable
                onPress={handleReserve}
                disabled={submitting || isSelectedDateUnavailable}
                style={[
                  styles.submitBtn,
                  (submitting || isSelectedDateUnavailable) && { opacity: 0.6 },
                ]}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? "예약 요청 중..." : "예약 신청 완료"}
              </Text>
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

  vendorCard: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  vendorLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  vendorName: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 14 },
  vendorInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  vendorInfoText: { color: "#cbd5e1", fontSize: 14, fontWeight: "500" },
  vendorIntro: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 10,
  },
  warningBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
  },
  warningText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

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
  dateField: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldText: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "600",
  },
  dateFieldPlaceholder: {
    color: "#94a3b8",
    fontWeight: "500",
  },
  datePickerBox: {
    marginTop: 10,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    overflow: "hidden",
  },
  datePicker: {
    backgroundColor: "#ffffff",
    alignSelf: "stretch",
  },
  datePickerDoneButton: {
    marginHorizontal: 12,
    marginTop: 8,
    height: 44,
    borderRadius: 14,
    backgroundColor: MAIN_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerDoneText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },

  blockedInput: {
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  readOnlyInput: { backgroundColor: "#f1f5f9", color: "#64748b" },
  textArea: { minHeight: 120, lineHeight: 22 },

  helperText: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 4,
    lineHeight: 18,
  },
  blockedHint: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "700",
    marginLeft: 4,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeButton: {
    width: "30%",
    minWidth: 86,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },
  timeButtonSelected: {
    backgroundColor: MAIN_BLUE,
    borderColor: MAIN_BLUE,
  },
  timeButtonBlocked: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: MAIN_BLUE,
  },
  timeButtonTextSelected: {
    color: "#fff",
  },
  timeButtonTextBlocked: {
    color: "#94a3b8",
  },
  timeBlockedLabel: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "700",
  },

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