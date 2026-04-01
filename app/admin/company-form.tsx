import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { IssueType } from "@/src/api/histories";
import ScreenState from "@/src/components/ScreenState";
import { createAdminCompany, getAdminCompanyDetail, updateAdminCompany } from "@/src/api/admin";
import { ensureAdminOrRedirect, issueTypeLabel } from "@/src/utils/admin";

const ISSUE_TYPES: IssueType[] = ["CRACK", "LEAK", "MOLD", "DAMAGE", "ELECTRIC", "GAS", "ETC"];

const phoneRegex = /^[0-9\-+() ]{8,20}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      if (!allowed || !editMode || !companyId) return;
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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, editMode]);

  const parsedMin = useMemo(() => (minEstimatedQuoteKrw.trim() ? Number(minEstimatedQuoteKrw.trim()) : undefined), [minEstimatedQuoteKrw]);
  const parsedMax = useMemo(() => (maxEstimatedQuoteKrw.trim() ? Number(maxEstimatedQuoteKrw.trim()) : undefined), [maxEstimatedQuoteKrw]);

  function toggleSpecialty(issueType: IssueType) {
    setSelectedSpecialties((prev) => (prev.includes(issueType) ? prev.filter((item) => item !== issueType) : [...prev, issueType]));
  }

  function validate() {
    if (!name.trim()) {
      Alert.alert("입력 확인", "업체명은 필수입니다.");
      return false;
    }
    if (phone.trim() && !phoneRegex.test(phone.trim())) {
      Alert.alert("입력 확인", "전화번호 형식이 올바르지 않습니다.");
      return false;
    }
    if (email.trim() && !emailRegex.test(email.trim())) {
      Alert.alert("입력 확인", "이메일 형식이 올바르지 않습니다.");
      return false;
    }
    if (serviceRegionLabel && !serviceRegionLabel.trim()) {
      Alert.alert("입력 확인", "서비스 지역은 공백만 입력할 수 없습니다.");
      return false;
    }
    if (minEstimatedQuoteKrw.trim() && Number.isNaN(parsedMin)) {
      Alert.alert("입력 확인", "최소 예상 견적은 숫자로 입력해주세요.");
      return false;
    }
    if (maxEstimatedQuoteKrw.trim() && Number.isNaN(parsedMax)) {
      Alert.alert("입력 확인", "최대 예상 견적은 숫자로 입력해주세요.");
      return false;
    }
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      Alert.alert("입력 확인", "최소 예상 견적이 최대 예상 견적보다 클 수 없습니다.");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (saving || !validate()) return;
    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        businessRegistrationNumber: businessRegistrationNumber.trim() || undefined,
        representativeName: representativeName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        addressLine: addressLine.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        serviceRegionLabel: serviceRegionLabel.trim() || undefined,
        specialties: selectedSpecialties,
        minEstimatedQuoteKrw: parsedMin,
        maxEstimatedQuoteKrw: parsedMax,
        capabilityNote: capabilityNote.trim() || undefined,
        adminMemo: adminMemo.trim() || undefined,
      };
      if (editMode && companyId) {
        await updateAdminCompany(Number(companyId), payload);
        Alert.alert("저장 완료", "업체 정보가 수정되었습니다.");
      } else {
        await createAdminCompany(payload);
        Alert.alert("저장 완료", "업체가 등록되었습니다.");
      }
      router.replace("/admin/companies");
    } catch {
      Alert.alert("저장 실패", "업체 등록/수정 API를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ScreenState loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{editMode ? "업체 수정" : "업체 등록"}</Text>

      <TextInput value={name} onChangeText={setName} placeholder="업체명 *" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={businessRegistrationNumber} onChangeText={setBusinessRegistrationNumber} placeholder="사업자등록번호" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={representativeName} onChangeText={setRepresentativeName} placeholder="대표자명" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="전화번호" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={email} onChangeText={setEmail} placeholder="이메일" keyboardType="email-address" autoCapitalize="none" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={addressLine} onChangeText={setAddressLine} placeholder="주소" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="우편번호" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={serviceRegionLabel} onChangeText={setServiceRegionLabel} placeholder="서비스 지역" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 }}>
        <Text style={{ fontWeight: "800" }}>전문 분야</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ISSUE_TYPES.map((issueType) => {
            const selected = selectedSpecialties.includes(issueType);
            return (
              <Pressable key={issueType} onPress={() => toggleSpecialty(issueType)} style={{ borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, opacity: selected ? 1 : 0.55 }}>
                <Text>{issueTypeLabel(issueType)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextInput value={minEstimatedQuoteKrw} onChangeText={setMinEstimatedQuoteKrw} placeholder="최소 예상 견적" keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={maxEstimatedQuoteKrw} onChangeText={setMaxEstimatedQuoteKrw} placeholder="최대 예상 견적" keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      <TextInput value={capabilityNote} onChangeText={setCapabilityNote} placeholder="업체 소개/가능 작업" multiline style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: "top" }} />
      <TextInput value={adminMemo} onChangeText={setAdminMemo} placeholder="관리자 메모" multiline style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: "top" }} />

      <Pressable onPress={handleSave} disabled={saving} style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: saving ? 0.5 : 1 }}>
        <Text>{saving ? "저장 중..." : editMode ? "수정 저장" : "업체 등록"}</Text>
      </Pressable>
    </ScrollView>
  );
}
