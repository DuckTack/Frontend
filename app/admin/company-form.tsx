import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { IssueType } from "../../src/api/histories";
import { createAdminCompany, getAdminCompanyDetail, updateAdminCompany } from "../../src/api/admin";
import { ensureAdminOrRedirect, issueTypeLabel } from "../../src/utils/admin";

const ISSUE_OPTIONS: IssueType[] = ["CRACK", "LEAK", "MOLD", "DAMAGE", "ELECTRIC", "GAS", "ETC"];
const MAIN_BLUE = "#3b82f6";
const TEXT_DARK = "#1e293b";
const TEXT_SUB = "#64748b";

// --- 원본 유효성 검사 함수 유지 ---
function isValidPhone(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length >= 9 && digits.length <= 11;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// 필드 블록 컴포넌트
function FieldBlock({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={{ color: "#ef4444" }}>*</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function AdminCompanyFormPage() {
  const { companyId } = useLocalSearchParams<{ companyId?: string }>();
  const editMode = Boolean(companyId);

  // --- 원본 상태 관리 로직 유지 ---
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [serviceRegionLabel, setServiceRegionLabel] = useState("");
  const [minEstimatedQuoteKrw, setMinEstimatedQuoteKrw] = useState("");
  const [maxEstimatedQuoteKrw, setMaxEstimatedQuoteKrw] = useState("");
  const [capabilityNote, setCapabilityNote] = useState("");
  const [adminMemo, setAdminMemo] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<IssueType[]>([]);

  // --- 원본 데이터 로딩 로직 유지 ---
  useEffect(() => {
    async function load() {
      const allowed = await ensureAdminOrRedirect();
      if (!allowed) return;
      if (!editMode || !companyId) return;

      try {
        setLoading(true);
        const detail = await getAdminCompanyDetail(Number(companyId));
        setName(detail.name ?? "");
        setBusinessRegistrationNumber(detail.businessRegistrationNumber ?? "");
        setRepresentativeName(detail.representativeName ?? "");
        setPhone(detail.phone ?? "");
        setEmail(detail.email ?? "");
        setAddressLine(detail.addressLine ?? "");
        setPostalCode(detail.postalCode ?? "");
        setServiceRegionLabel(detail.serviceRegionLabel ?? "");
        setMinEstimatedQuoteKrw(detail.minEstimatedQuoteKrw ? String(detail.minEstimatedQuoteKrw) : "");
        setMaxEstimatedQuoteKrw(detail.maxEstimatedQuoteKrw ? String(detail.maxEstimatedQuoteKrw) : "");
        setCapabilityNote(detail.capabilityNote ?? "");
        setAdminMemo(detail.adminMemo ?? "");
        setSelectedSpecialties(Array.isArray(detail.specialties) ? detail.specialties : []);
      } catch {
        Alert.alert("불러오기 실패", "업체 상세 API를 확인해주세요.");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, editMode]);

  const minValue = useMemo(() => Number(minEstimatedQuoteKrw || 0), [minEstimatedQuoteKrw]);
  const maxValue = useMemo(() => Number(maxEstimatedQuoteKrw || 0), [maxEstimatedQuoteKrw]);

  function toggleSpecialty(issue: IssueType) {
    setSelectedSpecialties((prev) => (prev.includes(issue) ? prev.filter((v) => v !== issue) : [...prev, issue]));
  }

  // --- 원본 저장 핸들러 로직 유지 ---
  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedRegion = serviceRegionLabel.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) { Alert.alert("입력 필요", "업체명은 필수입니다."); return; }
    if (!trimmedRegion) { Alert.alert("입력 필요", "서비스 지역을 입력해주세요."); return; }
    if (trimmedPhone && !isValidPhone(trimmedPhone)) { Alert.alert("형식 확인", "전화번호 형식을 확인해주세요."); return; }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) { Alert.alert("형식 확인", "이메일 형식을 확인해주세요."); return; }
    if (minEstimatedQuoteKrw && Number.isNaN(minValue)) { Alert.alert("형식 확인", "최소 견적은 숫자로 입력해주세요."); return; }
    if (maxEstimatedQuoteKrw && Number.isNaN(maxValue)) { Alert.alert("형식 확인", "최대 견적은 숫자로 입력해주세요."); return; }
    if (minEstimatedQuoteKrw && maxEstimatedQuoteKrw && minValue > maxValue) { Alert.alert("형식 확인", "최소 견적이 최대 견적보다 클 수 없습니다."); return; }

    const payload = {
      name: trimmedName,
      businessRegistrationNumber: businessRegistrationNumber.trim() || undefined,
      representativeName: representativeName.trim() || undefined,
      phone: trimmedPhone || undefined,
      email: trimmedEmail || undefined,
      addressLine: addressLine.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      serviceRegionLabel: trimmedRegion,
      specialties: selectedSpecialties,
      minEstimatedQuoteKrw: minEstimatedQuoteKrw ? Number(minEstimatedQuoteKrw) : undefined,
      maxEstimatedQuoteKrw: maxEstimatedQuoteKrw ? Number(maxEstimatedQuoteKrw) : undefined,
      capabilityNote: capabilityNote.trim() || undefined,
      adminMemo: adminMemo.trim() || undefined,
      active: true,
    };

    try {
      setSaving(true);
      if (editMode && companyId) {
        await updateAdminCompany(Number(companyId), payload);
        Alert.alert("저장 완료", "업체 정보가 수정되었습니다.");
      } else {
        await createAdminCompany(payload);
        Alert.alert("등록 완료", "업체가 등록되었습니다.");
      }
      router.replace("/admin/companies");
    } catch {
      Alert.alert("저장 실패", "업체 등록/수정 API를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color={MAIN_BLUE} />
        <Text style={{ marginTop: 12, color: TEXT_SUB }}>업체 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="x" size={20} color={TEXT_DARK} />
          </Pressable>
          <Text style={styles.headerTitle}>{editMode ? "업체 정보 수정" : "신규 업체 등록"}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 기본 정보 섹션 */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          <FieldBlock label="업체명" required>
            <TextInput value={name} onChangeText={setName} placeholder="예: 뚝딱 홈케어" style={styles.input} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
          <FieldBlock label="서비스 지역" required>
            <TextInput value={serviceRegionLabel} onChangeText={setServiceRegionLabel} placeholder="예: 서울 강남구" style={styles.input} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <FieldBlock label="대표자명">
                <TextInput value={representativeName} onChangeText={setRepresentativeName} placeholder="예: 김대표" style={styles.input} placeholderTextColor="#cbd5e1" />
              </FieldBlock>
            </View>
            <View style={{ flex: 1.5 }}>
              <FieldBlock label="사업자번호">
                <TextInput value={businessRegistrationNumber} onChangeText={setBusinessRegistrationNumber} placeholder="000-00-00000" keyboardType="number-pad" style={styles.input} placeholderTextColor="#cbd5e1" />
              </FieldBlock>
            </View>
          </View>
        </View>

        {/* 연락처 및 주소 섹션 */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>연락처 및 주소</Text>
          <FieldBlock label="전화번호">
            <TextInput value={phone} onChangeText={setPhone} placeholder="숫자만 입력" keyboardType="phone-pad" style={styles.input} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
          <FieldBlock label="이메일">
            <TextInput value={email} onChangeText={setEmail} placeholder="help@company.com" autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
          <FieldBlock label="상세 주소">
            <TextInput value={addressLine} onChangeText={setAddressLine} placeholder="특별시/광역도 포함 전체 주소" style={styles.input} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
          <FieldBlock label="우편번호">
            <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="5자리 번호" keyboardType="number-pad" style={styles.input} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
        </View>

        {/* 전문성 및 견적 섹션 (튀어나옴 수정 완료) */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>전문성 및 견적</Text>
          <FieldBlock label="전문 분야 (다중 선택)">
            <View style={styles.tagContainer}>
              {ISSUE_OPTIONS.map((issue) => {
                const selected = selectedSpecialties.includes(issue);
                return (
                  <Pressable key={issue} onPress={() => toggleSpecialty(issue)} style={[styles.tag, selected && styles.tagSelected]}>
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{issueTypeLabel(issue)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </FieldBlock>
          <FieldBlock label="예상 견적 범위 (단위: 원)">
            <View style={styles.inputRow}>
              <View style={styles.flexOne}>
                <TextInput value={minEstimatedQuoteKrw} onChangeText={setMinEstimatedQuoteKrw} placeholder="최소" keyboardType="number-pad" style={styles.input} placeholderTextColor="#cbd5e1" />
              </View>
              <Text style={styles.rangeDivider}>~</Text>
              <View style={styles.flexOne}>
                <TextInput value={maxEstimatedQuoteKrw} onChangeText={setMaxEstimatedQuoteKrw} placeholder="최대" keyboardType="number-pad" style={styles.input} placeholderTextColor="#cbd5e1" />
              </View>
            </View>
          </FieldBlock>
          <FieldBlock label="업체 전문성 설명">
            <TextInput value={capabilityNote} onChangeText={setCapabilityNote} placeholder="보유 장비, 방문 정책 등" multiline style={styles.textArea} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
        </View>

        {/* 내부 메모 */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>내부 관리</Text>
          <FieldBlock label="관리자 메모 (미노출)">
            <TextInput value={adminMemo} onChangeText={setAdminMemo} placeholder="특이사항 기록" multiline style={[styles.textArea, { backgroundColor: "#fff9f9" }]} placeholderTextColor="#cbd5e1" />
          </FieldBlock>
        </View>

        <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => [styles.submitBtn, (saving || pressed) && { opacity: 0.8 }]}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>{editMode ? "수정 저장하기" : "업체 등록하기"}</Text>}
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: TEXT_DARK },
  scrollContent: { padding: 20 },
  formSection: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#f1f5f9" },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: MAIN_BLUE, marginBottom: 18, letterSpacing: -0.5 },
  fieldBlock: { marginBottom: 16, gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#475569", marginLeft: 2 },
  input: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 15, color: TEXT_DARK, width: "100%" },
  textArea: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, fontSize: 15, color: TEXT_DARK, minHeight: 100, textAlignVertical: "top" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
  flexOne: { flex: 1 },
  rangeDivider: { color: TEXT_SUB, fontWeight: "700", paddingHorizontal: 4 },
  tagContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  tagSelected: { backgroundColor: "#eff6ff", borderColor: MAIN_BLUE },
  tagText: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  tagTextSelected: { color: MAIN_BLUE, fontWeight: "800" },
  submitBtn: { backgroundColor: TEXT_DARK, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: 10 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});