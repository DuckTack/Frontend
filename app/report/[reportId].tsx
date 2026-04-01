import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getMe, Me } from "@/src/api/users";
import { getHistoryDetail, HistoryDetail } from "@/src/api/histories";
import { downloadReport, generateReport, getMyReportById, MyReportItem, openReportPdf } from "@/src/api/reports";
import { loadReportDraft, saveReportDraft, type ReportDraft } from "@/src/store/reportDraftStorage";

function fmtIssue(t: HistoryDetail["issueType"]) {
  switch (t) {
    case "CRACK": return "균열";
    case "LEAK": return "누수";
    case "MOLD": return "곰팡이";
    case "DAMAGE": return "파손";
    case "ELECTRIC": return "전기";
    case "GAS": return "가스";
    default: return "기타";
  }
}

function fmtRec(t: HistoryDetail["recommendation"]) {
  return t === "DIY" ? "DIY 권장" : "전문업체 권장";
}

function emptyDraft(): ReportDraft {
  return {
    repairMethod: "",
    repairDate: "",
    contractorName: "",
    contractorContact: "",
    repairSummary: "",
    materialCost: "",
    laborCost: "",
    totalCost: "",
    notes: "",
  };
}

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState<MyReportItem | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft());
  const [savingDraft, setSavingDraft] = useState(false);

  async function load() {
    try {
      setLoading(true);
      if (!reportId) return;
      const baseItem = await getMyReportById(String(reportId));
      if (!baseItem) {
        Alert.alert("리포트 없음", "해당 리포트를 찾지 못했어요.");
        router.back();
        return;
      }
      const [meData, historyData, draftData] = await Promise.all([
        getMe(),
        getHistoryDetail(baseItem.historyId),
        loadReportDraft(String(reportId)),
      ]);
      setBase(baseItem);
      setMe(meData);
      setHistory(historyData);
      setDraft(draftData);
    } catch {
      Alert.alert("불러오기 실패", "리포트 상세 API 흐름을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reportId]);

  const autoFields = useMemo(() => {
    if (!history) return [] as string[];
    return [
      `문제 유형: ${fmtIssue(history.issueType)}`,
      `위험도: ${history.riskScore}`,
      `권장 결과: ${fmtRec(history.recommendation)}`,
      `진단 상태: ${history.status}`,
      `리포트 생성 여부: ${history.report ? "생성됨" : "미생성"}`,
    ];
  }, [history]);

  function updateDraft<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveDraft() {
    if (!reportId) return;
    try {
      setSavingDraft(true);
      await saveReportDraft(String(reportId), draft);
      Alert.alert("임시 저장 완료", "추가 입력 정보가 기기 안에 임시 저장되었습니다.");
    } catch {
      Alert.alert("저장 실패", "임시 저장 중 문제가 발생했습니다.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleGenerate() {
    if (!base) return;
    try {
      await generateReport(base.diagnosisId);
      Alert.alert("생성 요청 완료", "현재 백엔드에서는 자동 진단 정보를 기준으로 PDF를 생성합니다. 사용자가 입력한 추가 정보는 아직 PDF에 반영되지 않습니다.");
      await load();
    } catch {
      Alert.alert("생성 실패", "리포트 생성 API를 확인해주세요.");
    }
  }

  async function handleDownload() {
    if (!base) return;
    try {
      const bytes = await downloadReport(base.diagnosisId);
      Alert.alert("다운로드 API 확인", `PDF 응답 수신 완료 (${bytes} bytes)`);
    } catch {
      Alert.alert("다운로드 실패", "리포트 다운로드 API를 확인해주세요.");
    }
  }

  async function handleOpenPdf() {
    if (!base) return;
    try {
      await openReportPdf(base.diagnosisId);
    } catch {
      Alert.alert("열기 실패", "PDF URL API를 확인해주세요.");
    }
  }

  if (loading) return <ScreenState loading />;
  if (!base || !history) {
    return <ScreenState title="리포트를 찾을 수 없어요" errorMessage="reportId 또는 history 연동을 확인해주세요." />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>리포트 상세</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>기본 정보</Text>
        <Text>리포트 ID: {base.reportId}</Text>
        <Text>작성일시: {new Date(base.createdAt).toISOString().slice(0, 10)}</Text>
        <Text>사용자: {me?.username ?? "-"}</Text>
        <Text>휴대폰 번호: {me?.phoneNumber || "-"}</Text>
        <Text>주소: {me?.address || "-"}</Text>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>자동 반영 정보</Text>
        {autoFields.map((line) => <Text key={line}>{line}</Text>)}
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>추가 입력 정보</Text>
        <Text style={{ opacity: 0.8, lineHeight: 20 }}>
          이 영역은 사용자가 실제 수리를 마친 뒤에 직접 입력하는 정보입니다. 현재 프론트에서는 임시 저장만 가능하며, 입력값을 서버에 저장하거나 PDF 내용에 반영하는 API는 아직 없습니다.
        </Text>

        <Text style={{ fontWeight: "700" }}>수리 방식</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => updateDraft("repairMethod", "DIY")} style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: draft.repairMethod === "DIY" ? 1 : 0.55 }}>
            <Text>직접 수리</Text>
          </Pressable>
          <Pressable onPress={() => updateDraft("repairMethod", "PRO")} style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: draft.repairMethod === "PRO" ? 1 : 0.55 }}>
            <Text>전문업체 수리</Text>
          </Pressable>
        </View>

        <TextInput value={draft.repairDate} onChangeText={(v) => updateDraft("repairDate", v)} placeholder="수리 완료일 (예: 2026-04-01)" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={draft.contractorName} onChangeText={(v) => updateDraft("contractorName", v)} placeholder="업체명 또는 수리자명" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={draft.contractorContact} onChangeText={(v) => updateDraft("contractorContact", v)} placeholder="연락처" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={draft.repairSummary} onChangeText={(v) => updateDraft("repairSummary", v)} placeholder="수리 내용 요약" multiline style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 90, textAlignVertical: "top" }} />
        <TextInput value={draft.materialCost} onChangeText={(v) => updateDraft("materialCost", v)} placeholder="재료비" keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={draft.laborCost} onChangeText={(v) => updateDraft("laborCost", v)} placeholder="인건비" keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={draft.totalCost} onChangeText={(v) => updateDraft("totalCost", v)} placeholder="총 비용" keyboardType="numeric" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
        <TextInput value={draft.notes} onChangeText={(v) => updateDraft("notes", v)} placeholder="기타 메모" multiline style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 90, textAlignVertical: "top" }} />

        <Pressable onPress={handleSaveDraft} disabled={savingDraft} style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: savingDraft ? 0.5 : 1 }}>
          <Text>{savingDraft ? "저장 중..." : "추가 입력 임시 저장"}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={handleGenerate} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
          <Text>PDF 생성 요청</Text>
        </Pressable>
        <Pressable onPress={handleDownload} disabled={base.status !== "READY"} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center", opacity: base.status === "READY" ? 1 : 0.4 }}>
          <Text>PDF 다운로드</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleOpenPdf} disabled={base.status !== "READY"} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center", opacity: base.status === "READY" ? 1 : 0.4 }}>
        <Text>PDF 열기</Text>
      </Pressable>
    </ScrollView>
  );
}
