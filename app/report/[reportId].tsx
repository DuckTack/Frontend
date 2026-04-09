import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";

import ScreenState from "../../src/components/ScreenState";
import { useLocalSearchParams } from "expo-router";

import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
import {
  downloadReport,
  generateReport,
  openReportPdf,
  saveReportDraft
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

// 🔥 날짜 변환 함수 (핵심)
function formatDate(input: string): string {
  // 이미 yyyy-mm-dd 형태면 그대로
  if (input.includes("-")) return input;

  // 0101 → 2026-01-01
  if (input.length === 4) {
    const month = input.slice(0, 2);
    const day = input.slice(2, 4);
    return `2026-${month}-${day}`;
  }

  return input;
}

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);

  const [repairMethod, setRepairMethod] = useState("");
  const [repairDate, setRepairDate] = useState("");
  const [cost, setCost] = useState("");
  const [memo, setMemo] = useState("");

  const diagnosisId = Number(reportId);

  async function load() {
    try {
      setLoading(true);

      const [meData, historyData] = await Promise.all([
        getMe(),
        getHistoryDetail(diagnosisId),
      ]);

      setMe(meData);
      setHistory(historyData);

    } catch (e) {
      console.log(e);
      Alert.alert("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reportId]);

  async function handleSave() {
    try {
      if (!repairDate) {
        Alert.alert("날짜를 입력하세요");
        return;
      }

      await saveReportDraft(diagnosisId, {
        repairMethod,
        completionDate: formatDate(repairDate), // 🔥 수정 완료
        companyOrPersonName: "직접수리",
        contactInfo: "",
        workSummary: repairMethod,
        actualCostKrw: Number(cost || 0),
        memo,
      });

      Alert.alert("저장 완료 (PDF 자동 반영됨)");

    } catch (e) {
      console.log(e);
      Alert.alert("저장 실패");
    }
  }

  async function handleGenerate() {
    try {
      await generateReport(diagnosisId);
      Alert.alert("PDF 생성 완료");
    } catch {
      Alert.alert("생성 실패");
    }
  }

  async function handleDownload() {
    try {
      const uri = await downloadReport(diagnosisId);
      Alert.alert("다운로드 완료", uri);
    } catch {
      Alert.alert("다운로드 실패");
    }
  }

  async function handleOpenPdf() {
    try {
      await openReportPdf(diagnosisId);
    } catch {
      Alert.alert("열기 실패");
    }
  }

  if (loading) return <ScreenState loading />;

  if (!history) {
    return (
        <ScreenState
            title="리포트를 찾을 수 없어요"
            errorMessage="diagnosisId 기준 조회 실패"
        />
    );
  }

  return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>리포트 상세</Text>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}>
          <Text>문제 유형: {fmtIssue(history.issueType)}</Text>
          <Text>위험도: {history.riskScore}</Text>
          <Text>권장: {fmtRec(history.recommendation)}</Text>
          <Text>사용자: {me?.username ?? "-"}</Text>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
          <Text style={{ fontWeight: "800" }}>수리 정보 입력</Text>

          <TextInput
              placeholder="수리 방법"
              value={repairMethod}
              onChangeText={setRepairMethod}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <TextInput
              placeholder="수리 날짜 (예: 0101 또는 2026-01-01)"
              value={repairDate}
              onChangeText={setRepairDate}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <TextInput
              placeholder="비용"
              value={cost}
              onChangeText={setCost}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <TextInput
              placeholder="메모"
              value={memo}
              onChangeText={setMemo}
              style={{ borderWidth: 1, padding: 8 }}
          />

          <Pressable onPress={handleSave} style={{ backgroundColor: "#ddd", padding: 10 }}>
            <Text>수정 저장</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleGenerate}><Text>PDF 생성</Text></Pressable>
        <Pressable onPress={handleDownload}><Text>PDF 다운로드</Text></Pressable>
        <Pressable onPress={handleOpenPdf}><Text>PDF 열기</Text></Pressable>
      </ScrollView>
  );
}