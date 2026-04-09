import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import ScreenState from "../../src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
import { downloadReport, generateReport, getMyReportById, MyReportItem, openReportPdf } from "../../src/api/reports";
import { loadReportDraft, saveReportDraft, type ReportDraft } from "../../src/store/reportDraftStorage";

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

const EMPTY_DRAFT: ReportDraft = {
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

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [base, setBase] = useState<MyReportItem | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_DRAFT);

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

  async function handleSaveDraft() {
    if (!reportId) return;
    try {
      setSavingDraft(true);
      await saveReportDraft(String(reportId), draft);
      Alert.alert("임시 저장 완료", "수리 후 입력 정보가 기기에 저장되었습니다.");
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
      Alert.alert("생성 요청 완료");
      await load();
    } catch {
      Alert.alert("생성 실패");
    }
  }

  async function handleDownload() {
    if (!base) return;
    try {
      const fileUri = await downloadReport(base.diagnosisId);
      Alert.alert("다운로드 완료", fileUri);
    } catch {
      Alert.alert("다운로드 실패");
    }
  }

  async function handleOpenPdf() {
    if (!base) return;
    try {
      await openReportPdf(base.diagnosisId);
    } catch {
      Alert.alert("열기 실패");
    }
  }

  if (loading) return <ScreenState loading />;

  if (!base || !history) {
    return <ScreenState title="리포트를 찾을 수 없어요" errorMessage="데이터 확인 필요" />;
  }

  return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>리포트 상세</Text>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}>
          <Text>문제 유형: {fmtIssue(history.issueType)}</Text>
          <Text>위험도: {history.riskScore}</Text>
          <Text>권장: {fmtRec(history.recommendation)}</Text>
          <Text>사용자: {me?.username ?? "-"}</Text>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
          <Text style={{ fontWeight: "800" }}>수리 후 입력</Text>

          <TextInput
              placeholder="수리 완료일"
              value={draft.repairDate}
              onChangeText={(text) => setDraft({ ...draft, repairDate: text })}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <TextInput
              placeholder="수리 내용"
              value={draft.repairSummary}
              onChangeText={(text) => setDraft({ ...draft, repairSummary: text })}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <TextInput
              placeholder="총 비용"
              value={draft.totalCost}
              onChangeText={(text) => setDraft({ ...draft, totalCost: text })}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <Pressable onPress={handleSaveDraft} style={{ backgroundColor: "#ddd", padding: 10 }}>
            <Text>임시 저장</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleGenerate}><Text>PDF 생성</Text></Pressable>
        <Pressable onPress={handleDownload}><Text>PDF 다운로드</Text></Pressable>
        <Pressable onPress={handleOpenPdf}><Text>PDF 열기</Text></Pressable>
      </ScrollView>
  );
}