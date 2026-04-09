import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import ScreenState from "../../src/components/ScreenState";
import { useLocalSearchParams } from "expo-router";

import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
import {
  generateReport,
  getPdfUrl,
  saveReportDraft
} from "../../src/api/reports";

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
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
    diyMaterialsUsed: "",
    diyMaterialCost: "",
    diyWorkMemo: "",
  });

  const inputStyle = {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    color: "#000",
    fontSize: 16
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [meData, historyData] = await Promise.all([
        getMe(),
        getHistoryDetail(String(reportId)),
      ]);

      setMe(meData);
      setHistory(historyData);

    } catch {
      Alert.alert("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { load(); }, []);

  // 🔥 핵심: 날짜 그냥 문자열 그대로 보냄
  async function handleSaveDraft() {
    if (!history?.diagnosisId) return;

    try {
      setSavingDraft(true);

      await saveReportDraft(history.diagnosisId, {
        repairMethod: draft.repairMethod,
        completionDate: draft.repairDate,   // 🔥 변환 안함
        companyOrPersonName: draft.contractorName,
        contactInfo: draft.contractorContact,
        workSummary: draft.repairSummary,
        actualCostKrw: Number(draft.totalCost || 0),
        memo: draft.notes,

        materialCost: draft.materialCost,
        laborCost: draft.laborCost,
        diyMaterialsUsed: draft.diyMaterialsUsed,
        diyMaterialCost: draft.diyMaterialCost,
        diyWorkMemo: draft.diyWorkMemo,
      });

      Alert.alert("저장 완료", "PDF에 반영됩니다");

    } catch (e) {
      console.log(e);
      Alert.alert("저장 실패");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleGenerate() {
    if (!history?.diagnosisId) return;

    await generateReport(history.diagnosisId);
    Alert.alert("PDF 생성 완료");
  }

  async function handleOpenPdf() {
    if (!history?.diagnosisId) return;

    const url = await getPdfUrl(history.diagnosisId);
    await Linking.openURL(url);
  }

  if (loading) return <ScreenState loading />;

  return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* 기본 정보 */}
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>기본 정보</Text>
          <Text>사용자: {me?.username}</Text>
          <Text>문제: {history?.issueType}</Text>
          <Text>위험도: {history?.riskScore}</Text>
        </View>

        {/* 입력 */}
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>수리 후 입력</Text>

          {/* 선택 버튼 */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
                onPress={() => setDraft({ ...draft, repairMethod: "DIY" })}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: draft.repairMethod === "DIY" ? "#000" : "#eee"
                }}
            >
              <Text style={{ textAlign: "center", color: draft.repairMethod === "DIY" ? "#fff" : "#333" }}>
                직접 수리
              </Text>
            </Pressable>

            <Pressable
                onPress={() => setDraft({ ...draft, repairMethod: "PRO" })}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: draft.repairMethod === "PRO" ? "#000" : "#eee"
                }}
            >
              <Text style={{ textAlign: "center", color: draft.repairMethod === "PRO" ? "#fff" : "#333" }}>
                업체 수리
              </Text>
            </Pressable>
          </View>

          {/* 날짜 */}
          <TextInput
              value={draft.repairDate}
              onChangeText={(t) => setDraft({ ...draft, repairDate: t })}
              placeholder="수리 날짜 (자유 입력 가능)"
              placeholderTextColor="#888"
              style={inputStyle}
          />

          {/* 조건 분기 */}
          {draft.repairMethod === "DIY" ? (
              <>
                <TextInput
                    value={draft.diyMaterialsUsed}
                    onChangeText={(t) => setDraft({ ...draft, diyMaterialsUsed: t })}
                    placeholder="사용 자재"
                    placeholderTextColor="#888"
                    style={inputStyle}
                />
                <TextInput
                    value={draft.diyMaterialCost}
                    onChangeText={(t) => setDraft({ ...draft, diyMaterialCost: t })}
                    placeholder="자재비"
                    placeholderTextColor="#888"
                    style={inputStyle}
                />
              </>
          ) : (
              <>
                <TextInput
                    value={draft.contractorName}
                    onChangeText={(t) => setDraft({ ...draft, contractorName: t })}
                    placeholder="업체명"
                    placeholderTextColor="#888"
                    style={inputStyle}
                />
                <TextInput
                    value={draft.contractorContact}
                    onChangeText={(t) => setDraft({ ...draft, contractorContact: t })}
                    placeholder="연락처"
                    placeholderTextColor="#888"
                    style={inputStyle}
                />
              </>
          )}

          <TextInput
              value={draft.repairSummary}
              onChangeText={(t) => setDraft({ ...draft, repairSummary: t })}
              placeholder="작업 요약"
              placeholderTextColor="#888"
              multiline
              style={[inputStyle, { minHeight: 80 }]}
          />

          <Pressable onPress={handleSaveDraft} style={{ padding: 14, backgroundColor: "#000", borderRadius: 10 }}>
            <Text style={{ color: "#fff", textAlign: "center" }}>
              {savingDraft ? "저장 중..." : "임시 저장"}
            </Text>
          </Pressable>
        </View>

        {/* 버튼 */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={handleGenerate} style={{ flex: 1, padding: 14, backgroundColor: "#000", borderRadius: 10 }}>
            <Text style={{ color: "#fff", textAlign: "center" }}>PDF 생성</Text>
          </Pressable>

          <Pressable onPress={handleOpenPdf} style={{ flex: 1, padding: 14, borderWidth: 1, borderRadius: 10 }}>
            <Text style={{ textAlign: "center" }}>PDF 보기</Text>
          </Pressable>
        </View>

      </ScrollView>
  );
}