import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import ScreenState from "../../src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
import { generateReport, getPdfUrl, type ReportStatus } from "../../src/api/reports";
import { loadReportDraft, type ReportDraft } from "../../src/store/reportDraftStorage";
import { saveReportDraft } from "../../src/api/reports";// ✅ 추가된 스타일 (핵심)
const inputStyle = {
  borderWidth: 1,
  borderRadius: 10,
  padding: 12,
  color: "#000",
  backgroundColor: "#fff",
};

const textStyle = {
  color: "#000",
};

function fmtIssue(t: HistoryDetail["issueType"]) {
  switch (t) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    case "DAMAGE":
      return "파손";
    case "ELECTRIC":
      return "전기";
    case "GAS":
      return "가스";
    default:
      return "기타";
  }
}

function fmtRec(t: HistoryDetail["recommendation"]) {
  return t === "DIY" ? "DIY 권장" : "전문업체 권장";
}

function reportStatusFromHistory(history: HistoryDetail): ReportStatus {
  if (history.status === "FAILED") return "FAILED";
  if (history.report) return "READY";
  return "GENERATING";
}

function createEmptyDraft(): ReportDraft {
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
    beforeImageUris: [],
    afterImageUris: [],
    diyMaterialsUsed: "",
    diyMaterialCost: "",
    diyWorkMemo: "",
  } as unknown as ReportDraft;
}

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);
  const [draft, setDraft] = useState<ReportDraft>(createEmptyDraft());

  const reportBase = useMemo(() => {
    if (!history) return null;
    return {
      reportId: String(reportId ?? history.id),
      historyId: String(history.id),
      diagnosisId: String(history.diagnosisId ?? ""),
      createdAt: history.createdAt,
      issueType: history.issueType,
      riskScore: history.riskScore,
      recommendation: history.recommendation,
      status: reportStatusFromHistory(history),
    };
  }, [history, reportId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (!reportId) return;

      const [meData, historyData, draftData] = await Promise.all([
        getMe(),
        getHistoryDetail(String(reportId)),
        loadReportDraft(String(reportId)),
      ]);

      if (!historyData?.diagnosisId) {
        Alert.alert("리포트 없음", "해당 진단 기록에 연결된 리포트를 찾지 못했어요.");
        router.back();
        return;
      }

      setMe(meData);
      setHistory(historyData);
      setDraft(draftData ?? createEmptyDraft());
    } catch {
      Alert.alert("불러오기 실패", "리포트 상세 API 흐름을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveDraft() {
    console.log("🔥 버튼 눌림");
    if (!reportId) return;
    console.log("🔥 저장 diagnosisId:", reportBase?.diagnosisId);
    console.log("🔥 reportId:", reportId);
    try {
      setSavingDraft(true);
      console.log("🔥 saveDraft 호출 직전");
      // @ts-ignore
      await saveReportDraft(String(reportBase.diagnosisId), {
        repairMethod: draft.repairMethod,
        repairDate: draft.repairDate,
        contractorName: draft.contractorName,
        contractorContact: draft.contractorContact,
        repairSummary: draft.repairSummary,
        actualCostKrw: Number(draft.totalCost || 0),
        notes: draft.notes,

        materialCost: draft.materialCost,
        laborCost: draft.laborCost,
        totalCost: draft.totalCost,

        diyMaterialsUsed: draft.diyMaterialsUsed,
        diyMaterialCost: draft.diyMaterialCost,
        diyWorkMemo: draft.diyWorkMemo,
      });
      console.log("🔥 saveDraft 완료");

      Alert.alert("저장 완료", "서버에 정상 저장되었습니다.");

    } catch (e) {
      console.log("🔥 저장 에러", e);
      Alert.alert("저장 실패", "임시 저장 중 문제가 발생했습니다.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleGenerate() {
    if (!reportBase?.diagnosisId) return;
    console.log("🔥 생성 diagnosisId:", reportBase.diagnosisId);

    try {
      await generateReport(reportBase.diagnosisId);
      Alert.alert("생성 요청 완료", "백엔드에서 PDF 생성 요청을 받았습니다.");
      await load();
    } catch {
      Alert.alert("생성 실패", "리포트 생성 API를 확인해주세요.");
    }
  }

  async function handleOpenPdf() {
    if (!reportBase?.diagnosisId) return;
    try {
      const url = await getPdfUrl(reportBase.diagnosisId);
      await Linking.openURL(url);
    } catch {
      Alert.alert("열기 실패", "PDF URL API를 확인해주세요.");
    }
  }

  if (loading) return <ScreenState loading />;
  if (!reportBase || !history) {
    return <ScreenState title="리포트를 찾을 수 없어요" errorMessage="reportId 또는 history 연동을 확인해주세요." />;
  }

  return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#000" }}>리포트 상세</Text>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
          <Text style={{ color: "#000", fontWeight: "800" }}>기본 정보</Text>
          <Text style={{ color: "#000" }}>리포트 ID: {reportBase.reportId}</Text>
          <Text style={{ color: "#000" }}>작성일시: {new Date(reportBase.createdAt).toISOString().slice(0, 10)}</Text>
          <Text style={{ color: "#000" }}>사용자: {me?.username ?? "-"}</Text>
          <Text style={{ color: "#000" }}>휴대폰 번호: {me?.phoneNumber || "-"}</Text>
          <Text style={{ color: "#000" }}>주소: {me?.address || "-"}</Text>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>자동 반영 정보</Text>
          <Text style={{ color: "#000" }}>문제 유형: {fmtIssue(history.issueType)}</Text>
          <Text style={{ color: "#000" }}>위험도: {history.riskScore}</Text>
          <Text style={{ color: "#000" }}>권장: {fmtRec(history.recommendation)}</Text>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>수리 후 사용자 입력</Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
                onPress={() => setDraft((prev) => ({ ...prev, repairMethod: "DIY" }))}
                style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: draft.repairMethod === "DIY" ? 1 : 0.6 }}
            >
              <Text style={{ color: "#000" }}>직접 수리</Text>
            </Pressable>
            <Pressable
                onPress={() => setDraft((prev) => ({ ...prev, repairMethod: "PRO" }))}
                style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: draft.repairMethod === "PRO" ? 1 : 0.6 }}
            >
              <Text style={{ color: "#000" }}>전문업체 수리</Text>
            </Pressable>
          </View>

          <TextInput
              value={draft.repairDate}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, repairDate: text }))}
              placeholder="수리 완료일 (예: 2026-04-06)"
              style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
          />

          {draft.repairMethod === "DIY" ? (
              <>
                <TextInput
                    value={(draft as any).diyMaterialsUsed ?? ""}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, diyMaterialsUsed: text } as ReportDraft))}
                    placeholder="사용한 자재"
                    placeholderTextColor="#999"
                    style={{ borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: "#fff", color: "#000" }}
                />
                <TextInput
                    value={(draft as any).diyMaterialCost ?? draft.materialCost}
                    onChangeText={(text) =>
                        setDraft((prev) => ({
                          ...prev,
                          diyMaterialCost: text.replace(/[^0-9]/g, ""),
                          materialCost: text.replace(/[^0-9]/g, ""),
                        } as ReportDraft))
                    }
                    placeholder="자재비"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    style={{ borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: "#fff", color: "#000" }}
                />
                <TextInput
                    value={(draft as any).diyWorkMemo ?? ""}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, diyWorkMemo: text } as ReportDraft))}
                    placeholder="직접 수리 메모"
                    placeholderTextColor="#999"
                    multiline
                    style={{
                      borderWidth: 1,
                      borderRadius: 10,
                      padding: 12,
                      minHeight: 90,
                      textAlignVertical: "top",
                      backgroundColor: "#fff",
                      color: "#000",
                    }}
                />
              </>
          ) : (
              <>
                <TextInput
                    value={draft.contractorName}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, contractorName: text }))}
                    placeholder="업체명"
                    placeholderTextColor="#999"
                    style={{ borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: "#fff", color: "#000" }}
                />
                <TextInput
                    value={draft.contractorContact}
                    onChangeText={(text) => setDraft((prev) => ({ ...prev, contractorContact: text }))}
                    placeholder="업체 연락처"
                    placeholderTextColor="#999"
                    style={{ borderWidth: 1, borderRadius: 10, padding: 12, backgroundColor: "#fff", color: "#000" }}
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                      value={draft.materialCost}
                      onChangeText={(text) =>
                          setDraft((prev) => ({
                            ...prev,
                            materialCost: text.replace(/[^0-9]/g, ""),
                          }))
                      }
                      placeholder="재료비"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 12,
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                  />
                  <TextInput
                      value={draft.laborCost}
                      onChangeText={(text) =>
                          setDraft((prev) => ({
                            ...prev,
                            laborCost: text.replace(/[^0-9]/g, ""),
                          }))
                      }
                      placeholder="인건비"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 12,
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                  />
                </View>

                <TextInput
                    value={draft.totalCost}
                    onChangeText={(text) =>
                        setDraft((prev) => ({
                          ...prev,
                          totalCost: text.replace(/[^0-9]/g, ""),
                        }))
                    }
                    placeholder="총 비용"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    style={{
                      borderWidth: 1,
                      borderRadius: 10,
                      padding: 12,
                      backgroundColor: "#fff",
                      color: "#000",
                    }}
                />
              </>
          )}
          <TextInput
              value={draft.repairSummary}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, repairSummary: text }))}
              placeholder="실제 작업 요약"
              placeholderTextColor="#999"
              multiline
              style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 90, backgroundColor: "#fff", color: "#000" }}
          />
          <TextInput
              value={draft.notes}
              onChangeText={(text) => setDraft((prev) => ({ ...prev, notes: text }))}
              placeholder="추가 메모"
              placeholderTextColor="#999"
              multiline
              style={{ borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 90, backgroundColor: "#fff", color: "#000" }}
          />

          <Pressable
              onPress={handleSaveDraft}
              disabled={savingDraft}
              style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", opacity: savingDraft ? 0.5 : 1 }}
          >
            <Text style={{ color: "#000" }}>
              {savingDraft ? "저장 중..." : "후입력 정보 임시 저장"}
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={handleGenerate} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
            <Text>PDF 생성 요청</Text>
          </Pressable>
          <Pressable
              onPress={handleOpenPdf}
              disabled={reportBase.status !== "READY"}
              style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center", opacity: reportBase.status === "READY" ? 1 : 0.4 }}
          >
            <Text>PDF 열기</Text>
          </Pressable>
        </View>
      </ScrollView>
  );
}