import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import ScreenState from "../../src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
import {
  downloadReport,
  generateReport,
  getMyReportById,
  MyReportItem,
  openReportPdf,
  saveReportDraft   // 🔥 API로 변경
} from "../../src/api/reports";

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

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [base, setBase] = useState<MyReportItem | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);

  const [draft, setDraft] = useState({
    repairMethod: "",
    repairDate: "",
    contractorName: "",
    contractorContact: "",
    repairSummary: "",
    materialCost: "",
    laborCost: "",
    totalCost: "",
    notes: "",
  });

  async function load() {
    try {
      setLoading(true);

      const baseItem = await getMyReportById(String(reportId));
      if (!baseItem) {
        Alert.alert("리포트 없음");
        router.back();
        return;
      }

      const [meData, historyData] = await Promise.all([
        getMe(),
        getHistoryDetail(baseItem.historyId),
      ]);

      setBase(baseItem);
      setMe(meData);
      setHistory(historyData);

    } catch {
      Alert.alert("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reportId]);

  // 🔥 핵심 수정
  async function handleSaveDraft() {
    if (!base) return;

    try {
      setSavingDraft(true);

      await saveReportDraft(base.diagnosisId, {
        repairMethod: draft.repairMethod,
        completionDate: draft.repairDate,
        companyOrPersonName: draft.contractorName,
        contactInfo: draft.contractorContact,
        workSummary: draft.repairSummary,
        actualCostKrw: Number(draft.totalCost || 0),
        memo: draft.notes,

        materialCost: draft.materialCost,
        laborCost: draft.laborCost,
        diyMaterialsUsed: "",
        diyMaterialCost: "",
        diyWorkMemo: "",
      });

      Alert.alert("저장 완료", "PDF에 바로 반영됩니다");

    } catch {
      Alert.alert("저장 실패");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleGenerate() {
    if (!base) return;
    await generateReport(base.diagnosisId);
    Alert.alert("PDF 생성 완료");
  }

  async function handleDownload() {
    if (!base) return;
    await downloadReport(base.diagnosisId);
  }

  async function handleOpenPdf() {
    if (!base) return;
    await openReportPdf(base.diagnosisId);
  }

  if (loading) return <ScreenState loading />;

  if (!base || !history) {
    return <ScreenState title="리포트 없음" />;
  }

  return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>

        <Text style={{ fontSize: 22, fontWeight: "800" }}>리포트 상세</Text>

        {/* 기본 정보 */}
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}>
          <Text>문제 유형: {fmtIssue(history.issueType)}</Text>
          <Text>위험도: {history.riskScore}</Text>
          <Text>권장: {fmtRec(history.recommendation)}</Text>
        </View>

        {/* 입력 */}
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>

          <TextInput
              value={draft.repairDate}
              onChangeText={(t) => setDraft({ ...draft, repairDate: t })}
              placeholder="수리 날짜"
              style={{ borderWidth: 1, padding: 10, backgroundColor: "#fff" }}
          />

          <TextInput
              value={draft.contractorName}
              onChangeText={(t) => setDraft({ ...draft, contractorName: t })}
              placeholder="업체명"
              style={{ borderWidth: 1, padding: 10, backgroundColor: "#fff" }}
          />

          <TextInput
              value={draft.contractorContact}
              onChangeText={(t) => setDraft({ ...draft, contractorContact: t })}
              placeholder="연락처"
              style={{ borderWidth: 1, padding: 10, backgroundColor: "#fff" }}
          />

          <TextInput
              value={draft.repairSummary}
              onChangeText={(t) => setDraft({ ...draft, repairSummary: t })}
              placeholder="작업 요약"
              multiline
              style={{ borderWidth: 1, padding: 10, backgroundColor: "#fff", minHeight: 80 }}
          />

          <Pressable onPress={handleSaveDraft} style={{ padding: 12, borderWidth: 1 }}>
            <Text>{savingDraft ? "저장 중..." : "저장"}</Text>
          </Pressable>
        </View>

        {/* 버튼 */}
        <Pressable onPress={handleGenerate} style={{ padding: 12, borderWidth: 1 }}>
          <Text>PDF 생성</Text>
        </Pressable>

        <Pressable onPress={handleDownload} style={{ padding: 12, borderWidth: 1 }}>
          <Text>PDF 다운로드</Text>
        </Pressable>

        <Pressable onPress={handleOpenPdf} style={{ padding: 12, borderWidth: 1 }}>
          <Text>PDF 열기</Text>
        </Pressable>

      </ScrollView>
  );
}