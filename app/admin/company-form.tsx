import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { IssueType } from "../../src/api/histories";
import { createAdminCompany, getAdminCompanyDetail, updateAdminCompany } from "../../src/api/admin";
import { ensureAdminOrRedirect, issueTypeLabel } from "../../src/utils/admin";

const ISSUE_OPTIONS: IssueType[] = ["CRACK", "LEAK", "MOLD", "DAMAGE", "ELECTRIC", "GAS", "ETC"];

function onlyDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function isValidPhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length >= 9 && digits.length <= 11;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AdminCompanyFormPage() {
  const { companyId } = useLocalSearchParams<{ companyId?: string }>();
  const editMode = Boolean(companyId);

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

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedRegion = serviceRegionLabel.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert("입력 필요", "업체명은 필수입니다.");
      return;
    }
    if (!trimmedRegion) {
      Alert.alert("입력 필요", "서비스 지역을 입력해주세요.");
      return;
    }
    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      Alert.alert("형식 확인", "전화번호 형식을 확인해주세요.");
      return;
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      Alert.alert("형식 확인", "이메일 형식을 확인해주세요.");
      return;
    }
    if (minEstimatedQuoteKrw && Number.isNaN(minValue)) {
      Alert.alert("형식 확인", "최소 견적은 숫자로 입력해주세요.");
      return;
    }
    if (maxEstimatedQuoteKrw && Number.isNaN(maxValue)) {
      Alert.alert("형식 확인", "최대 견적은 숫자로 입력해주세요.");
      return;
    }
    if (minEstimatedQuoteKrw && maxEstimatedQuoteKrw && minValue > maxValue) {
      Alert.alert("형식 확인", "최소 견적이 최대 견적보다 클 수 없습니다.");
      return;
    }

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
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><Text>불러오는 중...</Text></View>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{editMode ? "업체 수정" : "업체 등록"}</Text>

      <TextInput value={name} onChangeText={setName} placeholder="업체명 *" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={businessRegistrationNumber} onChangeText={setBusinessRegistrationNumber} placeholder="사업자등록번호" keyboardType="number-pad" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={representativeName} onChangeText={setRepresentativeName} placeholder="대표자명" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="전화번호" keyboardType="phone-pad" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={email} onChangeText={setEmail} placeholder="이메일" autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={addressLine} onChangeText={setAddressLine} placeholder="주소" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="우편번호" keyboardType="number-pad" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={serviceRegionLabel} onChangeText={setServiceRegionLabel} placeholder="서비스 지역 *" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "700" }}>전문 분야</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ISSUE_OPTIONS.map((issue) => {
            const selected = selectedSpecialties.includes(issue);
            return (
              <Pressable key={issue} onPress={() => toggleSpecialty(issue)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 999, opacity: selected ? 1 : 0.6 }}>
                <Text>{issueTypeLabel(issue)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput value={minEstimatedQuoteKrw} onChangeText={setMinEstimatedQuoteKrw} placeholder="최소 견적" keyboardType="number-pad" style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={maxEstimatedQuoteKrw} onChangeText={setMaxEstimatedQuoteKrw} placeholder="최대 견적" keyboardType="number-pad" style={{ flex: 1, borderWidth: 1, borderRadius: 10, padding: 12 }} />
      </View>

      <TextInput value={capabilityNote} onChangeText={setCapabilityNote} placeholder="업체 설명" multiline style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: "top" }} />
      <TextInput value={adminMemo} onChangeText={setAdminMemo} placeholder="관리자 메모" multiline style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: "top" }} />

      <Pressable onPress={handleSave} disabled={saving} style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: saving ? 0.5 : 1 }}>
        <Text>{saving ? "저장 중..." : editMode ? "수정 저장" : "업체 등록"}</Text>
      </Pressable>
    </ScrollView>
  );
}
