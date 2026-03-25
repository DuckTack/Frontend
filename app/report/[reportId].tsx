import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getMe, Me } from "@/src/api/users";
import { getHistoryDetail, HistoryDetail } from "@/src/api/histories";
import { downloadReport, generateReport, getMyReportById, MyReportItem } from "@/src/api/reports";

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
  const [base, setBase] = useState<MyReportItem | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);

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
      const [meData, historyData] = await Promise.all([getMe(), getHistoryDetail(baseItem.historyId)]);
      setBase(baseItem);
      setMe(meData);
      setHistory(historyData);
    } catch {
      Alert.alert("불러오기 실패", "리포트 상세 API 흐름을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reportId]);

  async function handleGenerate() {
    if (!base) return;
    try {
      await generateReport(base.diagnosisId);
      Alert.alert("생성 요청 완료", "백엔드에서 PDF 생성 요청을 받았습니다.");
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
        <Text style={{ fontSize: 16, fontWeight: "800" }}>진단 정보</Text>
        <Text>문제 유형: {fmtIssue(history.issueType)}</Text>
        <Text>위험도: {history.riskScore}</Text>
        <Text>권장: {fmtRec(history.recommendation)}</Text>
        <Text>백엔드 상태: {history.status}</Text>
        <Text>리포트 첨부 여부: {history.report ? "있음" : "없음"}</Text>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>현재 한계</Text>
        <Text style={{ opacity: 0.8 }}>전/후 사진, 비용, 작업 요약 입력은 이번 버전에서 제거했습니다. 백엔드에 Draft 저장 API가 없어서 순수 API 모드에서는 리포트 생성/다운로드 호출만 남겼습니다.</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={handleGenerate} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
          <Text>PDF 생성 요청</Text>
        </Pressable>
        <Pressable onPress={handleDownload} disabled={base.status !== "READY"} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center", opacity: base.status === "READY" ? 1 : 0.4 }}>
          <Text>PDF 다운로드</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
