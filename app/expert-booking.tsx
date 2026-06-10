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
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getMe } from "../src/api/users";
import { apiClient } from "../src/api/apiClient";

const C = {
  primary:    "#4F46E5",
  primaryBg:  "#EDEDFF",
  primaryDim: "#C7D2FE",
  text:       "#0F172A",
  sub:        "#64748B",
  border:     "#E2E8F0",
  bg:         "#F8FAFC",
  card:       "#FFFFFF",
};

const RESERVATION_TIMES = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00",
];

function issueLabel(t?: string | null) {
  const value = String(t ?? "").trim().toUpperCase();
  switch (value) {
    case "CRACK":     return "균열";
    case "LEAK":      return "누수";
    case "MOLD":      return "곰팡이";
    case "PEEL":      return "박리";
    case "CORROSION": return "부식";
    case "BULGE":     return "들뜸";
    default:          return "기타";
  }
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function normalizeTime(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatDate(date: Date) {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKo(value: string) {
  if (!isValidDate(value)) return value;
  const [y, m, d] = value.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function parseDateOrToday(value: string) {
  if (isValidDate(value)) return new Date(`${value}T00:00:00`);
  return new Date();
}

function extractList(data: any): any[] {
  const body = data?.data ?? data;
  if (Array.isArray(body))           return body;
  if (Array.isArray(body?.content))  return body.content;
  if (Array.isArray(body?.data))     return body.data;
  return [];
}

function parseOptionalNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// ─── 섹션 헤더 ──────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionAccent} />
      <Feather name={icon as any} size={15} color={C.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── 입력 필드 래퍼 ──────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ════════════════════════════════════════════════════
export default function ExpertBooking() {
  const {
    historyId, vendorId, companyId,
    kakaoPlaceId, kakaoPlaceName, kakaoPlacePhone,
    vendorName, vendorPhone, vendorIntro, vendorMinPrice, issueType,
  } = useLocalSearchParams<{
    historyId?: string; vendorId?: string; companyId?: string;
    kakaoPlaceId?: string; kakaoPlaceName?: string; kakaoPlacePhone?: string;
    kakaoPlaceAddress?: string; kakaoPlaceLat?: string; kakaoPlaceLng?: string;
    vendorName?: string; vendorPhone?: string; vendorIntro?: string;
    vendorMinPrice?: string; issueType?: string;
  }>();

  const [customerName,  setCustomerName]  = useState("");
  const [phoneNumber,   setPhoneNumber]   = useState("");
  const [address,       setAddress]       = useState("");
  const [visitDate,     setVisitDate]     = useState("");
  const [showDatePicker,setShowDatePicker]= useState(false);
  const [visitTime,     setVisitTime]     = useState("");
  const [issueSummary,  setIssueSummary]  = useState("");
  const [requestNote,   setRequestNote]   = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const submitLockRef = useRef(false);

  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const finalVendorId    = useMemo(() => companyId ?? (!kakaoPlaceId ? vendorId : undefined), [companyId, kakaoPlaceId, vendorId]);
  const parsedVendorId   = Number(finalVendorId);
  const parsedHistoryId  = parseOptionalNumber(historyId);
  const isReservablePartner = Boolean(finalVendorId && !Number.isNaN(parsedVendorId));
  const isSelectedDateUnavailable = visitDate ? unavailableDates.includes(visitDate.trim()) : false;
  const unavailableTimeSet = useMemo(() => new Set(unavailableTimes.map(normalizeTime)), [unavailableTimes]);

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
        const res = await apiClient.get(`/api/public/companies/${parsedVendorId}/unavailable-dates`);
        setUnavailableDates(extractList(res.data).map((v) => String(v).slice(0, 10)));
      } catch (e: any) {
        console.log("휴무일 조회 실패:", e?.response?.data ?? e?.message ?? e);
        setUnavailableDates([]);
      }
    }
    loadUnavailableDates();
  }, [isReservablePartner, parsedVendorId]);

  useEffect(() => {
    async function loadUnavailableTimes() {
      if (!isReservablePartner || !isValidDate(visitDate)) { setUnavailableTimes([]); return; }
      try {
        setAvailabilityLoading(true);
        const res = await apiClient.get(`/api/public/companies/${parsedVendorId}/unavailable-times`, { params: { date: visitDate.trim() } });
        const list = extractList(res.data).map((v) => normalizeTime(String(v)));
        setUnavailableTimes(list);
        if (list.includes(normalizeTime(visitTime))) setVisitTime("");
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
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event?.type === "dismissed") return;
    if (selectedDate) { setVisitDate(formatDate(selectedDate)); setVisitTime(""); }
  }

  async function handleReserve() {
    if (submitting || submitLockRef.current) return;
    if (!isReservablePartner) { Alert.alert("예약 불가", "제휴업체만 앱에서 예약할 수 있습니다."); return; }
    if (!customerName.trim() || !phoneNumber.trim() || !address.trim() || !visitDate.trim() || !visitTime.trim()) {
      Alert.alert("입력 필요", "방문자 정보, 방문일, 방문 시간을 모두 입력하세요."); return;
    }
    if (!isValidDate(visitDate)) { Alert.alert("날짜 형식 오류", "날짜를 캘린더에서 선택해주세요."); return; }
    if (isSelectedDateUnavailable) { Alert.alert("예약 불가", "해당 날짜는 업체가 휴무 처리한 날짜입니다."); return; }
    if (unavailableTimeSet.has(normalizeTime(visitTime))) { Alert.alert("예약 불가", "해당 시간은 업체가 차단한 시간입니다."); return; }

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
        historyId: parsedHistoryId,
      };
      console.log("예약 요청 body:", body);
      await apiClient.post("/api/reservations", body);
      Alert.alert("예약 신청 완료", "전문업체 예약 신청이 완료되었습니다. 홈 화면에서 예약 진행 상태를 확인할 수 있습니다.", [{ text: "확인", onPress: () => router.replace("/(tabs)") }]);
    } catch (e: any) {
    console.log("예약 실패:", e?.response?.data ?? e?.message ?? e);

    const status = e?.response?.status;
    const serverMessage = e?.response?.data?.message;

    const message =
        status === 409 || serverMessage === "서버 오류가 발생했습니다."
            ? "이미 다른 사용자가 예약했습니다. 다른 시간대를 이용해주세요."
            : serverMessage || "예약 요청 중 문제가 발생했습니다.";

    Alert.alert("예약 실패", message);
  } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  }

  const displayName = vendorName ?? kakaoPlaceName ?? "업체 정보 없음";
  const displayPhone = vendorPhone ?? kakaoPlacePhone ?? null;

  // ── 렌더 ──────────────────────────────────────────
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* 헤더 */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={C.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>예약 신청</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── 업체 요약 카드 ── */}
          <View style={styles.vendorCard}>
            <View style={styles.vendorCardTop}>
              <View style={styles.vendorBadge}>
                <MaterialCommunityIcons name="handshake-outline" size={13} color={C.primary} />
                <Text style={styles.vendorBadgeText}>제휴 업체</Text>
              </View>
              {!isReservablePartner && (
                <View style={styles.externalBadge}>
                  <Text style={styles.externalBadgeText}>외부 업체</Text>
                </View>
              )}
            </View>

            <Text style={styles.vendorName}>{displayName}</Text>

            <View style={styles.vendorMetaRow}>
              {displayPhone && (
                <View style={styles.vendorMeta}>
                  <Feather name="phone" size={13} color="#94a3b8" />
                  <Text style={styles.vendorMetaText}>{displayPhone}</Text>
                </View>
              )}
              {vendorMinPrice &&
                  Number(vendorMinPrice) > 0 && (
                      <View style={styles.vendorMeta}>
                        <MaterialCommunityIcons
                            name="tag-outline"
                            size={13}
                            color="#94a3b8"
                        />

                      </View>
                  )}
            </View>

            {vendorIntro ? (
              <Text style={styles.vendorIntro} numberOfLines={2}>{vendorIntro}</Text>
            ) : null}

            {kakaoPlaceId && !companyId ? (
              <View style={styles.warningBox}>
                <Feather name="alert-circle" size={14} color="#b91c1c" />
                <Text style={styles.warningText}>
                  외부 검색 업체는 앱 내 예약이 불가능합니다. 제휴업체만 예약할 수 있습니다.
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── 신청자 정보 ── */}
          <View style={styles.section}>
            <SectionHeader icon="user" title="방문자 정보" />
            <View style={styles.card}>
              <FieldRow label="성함">
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="성함을 입력하세요"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </FieldRow>
              <View style={styles.fieldDivider} />
              <FieldRow label="연락처">
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </FieldRow>
              <View style={styles.fieldDivider} />
              <FieldRow label="방문 주소">
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="상세 주소를 입력하세요"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
              </FieldRow>
            </View>
          </View>

          {/* ── 방문 일정 ── */}
          <View style={styles.section}>
            <SectionHeader icon="calendar" title="방문 일정" />
            <View style={styles.card}>

              {/* 날짜 선택 */}
              <FieldRow label="방문 희망일">
                <Pressable
                  onPress={() => setShowDatePicker((p) => !p)}
                  style={[styles.dateField, isSelectedDateUnavailable && styles.dateFieldBlocked]}
                >
                  <Text style={[styles.dateFieldText, !visitDate && styles.placeholder]}>
                    {visitDate ? formatDateKo(visitDate) : "날짜를 선택하세요"}
                  </Text>
                  <Feather name="calendar" size={18} color={visitDate ? C.primary : "#94a3b8"} />
                </Pressable>
                {isSelectedDateUnavailable && (
                  <Text style={styles.blockedHint}>이 날짜는 업체 전체 휴무일입니다.</Text>
                )}
              </FieldRow>

              {showDatePicker && (
                <View style={styles.datePickerBox}>
                  <DateTimePicker
                    value={parseDateOrToday(visitDate)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "calendar"}
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                    themeVariant="light"
                    accentColor={C.primary}
                    locale="ko-KR"
                    style={{ alignSelf: "stretch", backgroundColor: "#fff" }}
                  />
                  {Platform.OS === "ios" && (
                    <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDoneBtn}>
                      <Text style={styles.datePickerDoneText}>선택 완료</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.fieldDivider} />

              {/* 시간 선택 */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>방문 희망 시간</Text>
                {!isValidDate(visitDate) ? (
                  <View style={styles.timeHint}>
                    <Feather name="info" size={13} color="#94a3b8" />
                    <Text style={styles.timeHintText}>날짜를 먼저 선택해주세요</Text>
                  </View>
                ) : availabilityLoading ? (
                  <View style={styles.timeHint}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={styles.timeHintText}>예약 가능 시간 확인 중...</Text>
                  </View>
                ) : (
                  <View style={styles.timeGrid}>
                    {RESERVATION_TIMES.map((time) => {
                      const blocked  = isSelectedDateUnavailable || unavailableTimeSet.has(time);
                      const selected = visitTime === time;
                      return (
                        <Pressable
                          key={time}
                          disabled={blocked}
                          onPress={() => setVisitTime(time)}
                          style={[
                            styles.timeChip,
                            selected && styles.timeChipSelected,
                            blocked  && styles.timeChipBlocked,
                          ]}
                        >
                          <Text style={[
                            styles.timeChipText,
                            selected && styles.timeChipTextSelected,
                            blocked  && styles.timeChipTextBlocked,
                          ]}>
                            {time}
                          </Text>
                          {blocked && <Text style={styles.timeBlockedLabel}>불가</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {isValidDate(visitDate) && !availabilityLoading && unavailableTimes.length > 0 && (
                  <Text style={styles.helperText}>회색 시간은 예약이 마감됐습니다.</Text>
                )}
              </View>
            </View>
          </View>

          {/* ── 진단 정보 ── */}
          <View style={styles.section}>
            <SectionHeader icon="clipboard" title="진단 정보" />
            <View style={styles.card}>
              <FieldRow label="진단 내용">
                <View style={styles.readonlyField}>
                  <Text style={[styles.readonlyText, !issueSummary && styles.placeholder]}>
                    {issueSummary || "연결된 진단 기록 없음"}
                  </Text>
                </View>
              </FieldRow>
              <View style={styles.fieldDivider} />
              <FieldRow label="추가 요청사항">
                <TextInput
                  value={requestNote}
                  onChangeText={setRequestNote}
                  placeholder="업체에 전달할 추가 내용을 적어주세요 (선택)"
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  style={[styles.input, styles.textarea]}
                />
              </FieldRow>
            </View>
          </View>

          {/* ── 제출 버튼 ── */}
          <View style={styles.btnArea}>
            <Pressable
              onPress={handleReserve}
              disabled={submitting || isSelectedDateUnavailable}
              style={[styles.submitBtn, (submitting || isSelectedDateUnavailable) && styles.submitBtnDisabled]}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>예약 신청 완료</Text>
              }
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>취소하기</Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: C.bg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 20 },

  // ── 업체 카드 ──
  vendorCard: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  vendorCardTop: { flexDirection: "row", gap: 8, marginBottom: 14 },
  vendorBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(79,70,229,0.22)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(79,70,229,0.35)",
  },
  vendorBadgeText: { fontSize: 11, fontWeight: "800", color: "#A5B4FC" },
  externalBadge: {
    backgroundColor: "rgba(148,163,184,0.18)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.3)",
  },
  externalBadgeText: { fontSize: 11, fontWeight: "700", color: "#94A3B8" },
  vendorName: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", marginBottom: 12, letterSpacing: -0.3 },
  vendorMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 4 },
  vendorMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  vendorMetaText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  vendorIntro: {
    marginTop: 12, fontSize: 13, color: "#64748B", lineHeight: 19,
    borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 12,
  },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 12, padding: 12, borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  warningText: { flex: 1, fontSize: 13, color: "#FCA5A5", fontWeight: "600", lineHeight: 18 },

  // ── 섹션 ──
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: C.primary },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.text },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  fieldRow: { paddingVertical: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: C.sub, marginBottom: 8, letterSpacing: 0.3, textTransform: "uppercase" },
  fieldDivider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: -2 },

  input: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
  },
  textarea: { minHeight: 100, lineHeight: 22 },

  readonlyField: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readonlyText: { fontSize: 15, color: C.sub, fontWeight: "500" },
  placeholder: { color: "#94A3B8" },

  // ── 날짜 ──
  dateField: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldBlocked: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  dateFieldText: { fontSize: 15, color: C.text, fontWeight: "600" },
  datePickerBox: {
    marginTop: 8,
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    paddingVertical: 4,
  },
  datePickerDoneBtn: {
    margin: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  datePickerDoneText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  blockedHint: { fontSize: 12, color: "#DC2626", fontWeight: "700", marginTop: 6 },

  // ── 시간 그리드 ──
  timeHint: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  timeHintText: { fontSize: 13, color: C.sub, fontWeight: "600" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  timeChip: {
    width: "30%",
    minWidth: 84,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.primaryBg,
    borderWidth: 1.5,
    borderColor: C.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  timeChipBlocked:  { backgroundColor: "#F1F5F9", borderColor: C.border },
  timeChipText:        { fontSize: 14, fontWeight: "800", color: C.primary },
  timeChipTextSelected:{ color: "#fff" },
  timeChipTextBlocked: { color: "#CBD5E1" },
  timeBlockedLabel: { fontSize: 9, color: "#CBD5E1", marginTop: 2, fontWeight: "700" },
  helperText: { fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 18 },

  // ── 버튼 ──
  btnArea: { marginTop: 8, gap: 12 },
  submitBtn: {
    backgroundColor: C.primary,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  cancelBtnText: { color: C.sub, fontSize: 15, fontWeight: "700" },
});
