import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import ScreenState from "../../src/components/ScreenState";
import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
// getCachedDiagnosisImages 는 미구현 상태이므로 제거 (diagnosis.ts에 없음)
import {
  getPdfUrl,
  getReportDraft,
  saveReportDraft,
  type ReportStatus,
  uploadFrontendGeneratedPdf,
} from "../../src/api/reports";
import {
  EMPTY_DRAFT,
  loadReportDraft,
  saveLocalReportDraft,
  type ReportDraft,
} from "../../src/store/reportDraftStorage";
import { createDesignedReportPdf } from "../../src/utils/reportPdf";

const MAIN_BLUE = "#3b82f6";
const MAX_BEFORE_EXTRA_IMAGES = 2;
const MAX_AFTER_IMAGES = 3;

type ImageField = "beforeImageUris" | "afterImageUris";

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

function reportStatusFromHistory(history: HistoryDetail): ReportStatus {
  if (history.status === "FAILED") return "FAILED";
  if (history.report) return "READY";
  return "GENERATING";
}

function createEmptyDraft(): ReportDraft {
  return { ...EMPTY_DRAFT };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function cleanAutoValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();

  if (!text) return "";
  if (text === "0") return "";
  if (text.toLowerCase() === "undefined") return "";
  if (text.toLowerCase() === "null") return "";
  if (text === "전문업체") return "";
  if (text.startsWith("업체 #")) return "";

  return text;
}

function normalizeCost(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? String(value) : "";
  }

  const text = cleanAutoValue(value).replace(/,/g, "");
  if (!text || text === "0") return "";

  return text;
}

function normalizeRepairMethod(value: unknown): "" | "DIY" | "PRO" {
  const text = cleanAutoValue(value).toUpperCase();
  if (text === "DIY") return "DIY";
  if (text === "PRO") return "PRO";
  return "";
}

function formatDisplayDate(value: unknown): string {
  if (value === null || value === undefined) return "-";

  if (Array.isArray(value)) {
    const [year, month, day] = value;
    if (!year || !month || !day) return "-";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const text = cleanAutoValue(value);
  if (!text) return "-";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const asNumber = Number(text);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const date = new Date(asNumber > 10_000_000_000 ? asNumber : asNumber * 1000);
    if (!Number.isNaN(date.getTime()) && date.getFullYear() > 2000) {
      return date.toISOString().slice(0, 10);
    }
  }

  const date = new Date(text);
  if (!Number.isNaN(date.getTime()) && date.getFullYear() > 2000) {
    return date.toISOString().slice(0, 10);
  }

  return "-";
}

function getReservedCompanyName(historyData: HistoryDetail | null): string {
  const h: any = historyData;

  return (
    cleanAutoValue(h?.expertVendorName) ||
    cleanAutoValue(h?.companyName) ||
    cleanAutoValue(h?.kakaoPlaceName) ||
    cleanAutoValue(h?.vendorName) ||
    ""
  );
}

function getReservedCompanyPhone(historyData: HistoryDetail | null): string {
  const h: any = historyData;

  return (
    cleanAutoValue(h?.expertVendorPhone) ||
    cleanAutoValue(h?.companyPhone) ||
    cleanAutoValue(h?.kakaoPlacePhone) ||
    cleanAutoValue(h?.vendorPhone) ||
    cleanAutoValue(h?.phone) ||
    ""
  );
}

type RemoteReportDraft = {
  repairMethod?: string | null;
  repairDate?: string | null;
  contractorName?: string | null;
  contractorContact?: string | null;
  repairSummary?: string | null;
  actualCostKrw?: number | string | null;
  notes?: string | null;
  totalCost?: string | number | null;
  diyMaterialsUsed?: string | null;
  diyMaterialCost?: string | number | null;
  diyWorkMemo?: string | null;
  beforeImageUris?: string[] | null;
  afterImageUris?: string[] | null;
};

function mergeRemoteDraft(localDraft: ReportDraft, remoteDraft?: RemoteReportDraft | null): ReportDraft {
  if (!remoteDraft) return localDraft;

  const remoteTotalCost =
    normalizeCost(remoteDraft.totalCost) || normalizeCost(remoteDraft.actualCostKrw);

  return {
    ...localDraft,
    repairMethod: normalizeRepairMethod(remoteDraft.repairMethod) || localDraft.repairMethod,
    repairDate: cleanAutoValue(remoteDraft.repairDate) || localDraft.repairDate,
    contractorName: cleanAutoValue(remoteDraft.contractorName) || localDraft.contractorName,
    contractorContact: cleanAutoValue(remoteDraft.contractorContact) || localDraft.contractorContact,
    repairSummary: cleanAutoValue(remoteDraft.repairSummary) || localDraft.repairSummary,
    totalCost: remoteTotalCost || localDraft.totalCost,
    notes: cleanAutoValue(remoteDraft.notes) || localDraft.notes,
    diyMaterialsUsed: cleanAutoValue(remoteDraft.diyMaterialsUsed) || localDraft.diyMaterialsUsed,
    diyMaterialCost: normalizeCost(remoteDraft.diyMaterialCost) || localDraft.diyMaterialCost,
    diyWorkMemo: cleanAutoValue(remoteDraft.diyWorkMemo) || localDraft.diyWorkMemo,
    /*
     * 서버에 이미 업로드된 이미지 목록을 다시 병합하면, PDF 생성 실패 후 재진입 시
     * 같은 사진이 계속 누적되어 보이고 PDF 용량도 커진다.
     * 프론트 PDF 생성 방식에서는 로컬에 사용자가 첨부한 사진 + 진단 사진만 사용한다.
     */
    beforeImageUris: uniqueStrings(localDraft.beforeImageUris).slice(0, MAX_BEFORE_EXTRA_IMAGES),
    afterImageUris: uniqueStrings(localDraft.afterImageUris).slice(0, MAX_AFTER_IMAGES),
  };
}

function applyReservedCompanyToDraft(
  draft: ReportDraft,
  historyData: HistoryDetail | null,
): ReportDraft {
  const contractorName = getReservedCompanyName(historyData);
  const contractorContact = getReservedCompanyPhone(historyData);
  const hasReservedCompany = Boolean(contractorName || contractorContact);

  if (!hasReservedCompany) return draft;

  return {
    ...draft,
    repairMethod: draft.repairMethod || "PRO",
    contractorName: contractorName || draft.contractorName,
    contractorContact: contractorContact || draft.contractorContact,
  };
}

function applyReservationRepairInfoToDraft(
  draft: ReportDraft,
  historyData: HistoryDetail | null,
): ReportDraft {
  const h: any = historyData;
  if (!h) return draft;

  const repairCompletedDate = cleanAutoValue(
    h.repairCompletedDate || h.reservationRepairCompletedDate,
  );
  const repairTotalCost = normalizeCost(
    h.repairTotalCost ?? h.reservationRepairTotalCost ?? h.totalCost,
  );
  const repairSummary = cleanAutoValue(
    h.repairSummary || h.reservationRepairSummary,
  );

  const contractorName = getReservedCompanyName(historyData);
  const contractorContact = getReservedCompanyPhone(historyData);

  const hasRepairInfo = Boolean(
    repairCompletedDate || repairTotalCost || repairSummary || contractorName || contractorContact,
  );
  if (!hasRepairInfo) return draft;

  return {
    ...draft,
    repairMethod: "PRO",
    repairDate: repairCompletedDate || draft.repairDate,
    contractorName: contractorName || draft.contractorName,
    contractorContact: contractorContact || draft.contractorContact,
    totalCost: repairTotalCost || draft.totalCost,
    repairSummary: repairSummary || draft.repairSummary,
  };
}

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);
  const [cachedDiagnosisImages, setCachedDiagnosisImages] = useState<{ imageUris?: string[]; imageKeys?: string[] } | null>(null);
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

  const diagnosisBeforeImageUris = useMemo(
    () => uniqueStrings([...(history?.imageUris ?? []), ...(cachedDiagnosisImages?.imageUris ?? [])]),
    [history?.imageUris, cachedDiagnosisImages?.imageUris],
  );

  const diagnosisBeforeImageKeys = useMemo(
    () => uniqueStrings([...(history?.diagnosisImageKeys ?? []), ...(cachedDiagnosisImages?.imageKeys ?? [])]),
    [history?.diagnosisImageKeys, cachedDiagnosisImages?.imageKeys],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (!reportId) return;

      const [meData, historyData, localDraftData] = await Promise.all([
        getMe().catch(() => null),
        getHistoryDetail(String(reportId)).catch(() => null),
        loadReportDraft(String(reportId)).catch(() => null),
      ]);

      const remoteDraftData = historyData?.diagnosisId
        ? await getReportDraft(String(historyData.diagnosisId)).catch(() => null)
        : null;

      setMe(meData);
      setHistory(historyData);
      setCachedDiagnosisImages(null); // 미구현 API — history.imageUris 로 대체됨

      let nextDraft = mergeRemoteDraft(
        localDraftData ?? createEmptyDraft(),
        remoteDraftData,
      );
      nextDraft = applyReservedCompanyToDraft(nextDraft, historyData);
      nextDraft = applyReservationRepairInfoToDraft(nextDraft, historyData);

      setDraft(nextDraft);
    } catch (e) {
      console.log("데이터 로딩 실패:", e);
      Alert.alert("오류", "데이터를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickImages(targetField: ImageField) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "사진 첨부를 위해 사진 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.35,
      selectionLimit: targetField === "afterImageUris" ? MAX_AFTER_IMAGES : MAX_BEFORE_EXTRA_IMAGES,
    });

    if (result.canceled) return;

    const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
    if (uris.length === 0) return;

    setDraft((prev) => {
      const limit = targetField === "afterImageUris" ? MAX_AFTER_IMAGES : MAX_BEFORE_EXTRA_IMAGES;
      const nextUris = uniqueStrings([...prev[targetField], ...uris]).slice(0, limit);

      if (nextUris.length < prev[targetField].length + uris.length) {
        Alert.alert(
          "사진 첨부 제한",
          targetField === "afterImageUris"
            ? `수리 후 사진은 최대 ${MAX_AFTER_IMAGES}장까지 첨부할 수 있습니다.`
            : `추가 수리 전 사진은 최대 ${MAX_BEFORE_EXTRA_IMAGES}장까지 첨부할 수 있습니다.`
        );
      }

      return {
        ...prev,
        [targetField]: nextUris,
      };
    });
  }

  function removeImage(targetField: ImageField, index: number) {
    setDraft((prev) => ({
      ...prev,
      [targetField]: prev[targetField].filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function saveDraftToServer(showSuccessMessage: boolean): Promise<boolean> {
    if (!reportId) return false;

    try {
      setSavingDraft(true);

      console.log("reportId:", reportId);
      console.log("history:", JSON.stringify(history, null, 2));
      console.log("reportBase:", reportBase);

      if (!reportBase?.diagnosisId) {
        if (showSuccessMessage) {
          Alert.alert("저장 대기 중", "진단 기록을 불러오는 중입니다. 잠시 후 다시 저장해주세요.");
        }
        return false;
      }

      const cleanedDraft: ReportDraft = {
        ...draft,
        beforeImageUris: uniqueStrings(draft.beforeImageUris).slice(0, MAX_BEFORE_EXTRA_IMAGES),
        afterImageUris: uniqueStrings(draft.afterImageUris).slice(0, MAX_AFTER_IMAGES),
      };

      await saveLocalReportDraft(String(reportId), cleanedDraft);
      setDraft(cleanedDraft);

      await saveReportDraft(String(reportBase.diagnosisId), {
        repairMethod: cleanedDraft.repairMethod,
        repairDate: cleanedDraft.repairDate,
        contractorName: cleanedDraft.contractorName,
        contractorContact: cleanedDraft.contractorContact,
        repairSummary: cleanedDraft.repairSummary,
        actualCostKrw: Number(cleanedDraft.totalCost || cleanedDraft.diyMaterialCost || 0),
        notes: cleanedDraft.notes,
        totalCost: cleanedDraft.totalCost,
        diyMaterialsUsed: cleanedDraft.diyMaterialsUsed,
        diyMaterialCost: cleanedDraft.diyMaterialCost,
        diyWorkMemo: cleanedDraft.diyWorkMemo,
        diagnosisImageKeys: diagnosisBeforeImageKeys,
        useDiagnosisImagesAsBefore: true,
        templateVersion: "FRONTEND_REPORT_V1",
      });

      if (showSuccessMessage) {
        Alert.alert("수리 정보 저장 완료", "작성한 수리 정보가 저장되었습니다.");
      }

      return true;
    } catch (e: any) {
      console.log("report draft save failed");

      if (e.response) {
        console.log("status:", e.response.status);
        console.log("data:", JSON.stringify(e.response.data, null, 2));
        console.log("url:", e.config?.url);
        console.log("method:", e.config?.method);
        console.log("body:", e.config?.data);
      } else {
        console.log("message:", e.message);
      }

      Alert.alert("저장 실패", "수리 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return false;
    } finally {
      setSavingDraft(false);
    }
  }
  async function handleSaveDraft() {
    await saveDraftToServer(true);
  }

  async function handleGenerate() {
    if (!reportBase?.diagnosisId || !history) {
      Alert.alert("PDF 생성 불가", "진단 기록을 불러온 뒤 다시 시도해주세요.");
      return;
    }

    try {
      setGeneratingPdf(true);

      const saved = await saveDraftToServer(false);
      if (!saved) return;

      const pdfDraft = applyReservationRepairInfoToDraft(
        applyReservedCompanyToDraft(draft, history),
        history,
      );

      const pdf = await createDesignedReportPdf({
        reportId: reportBase.reportId,
        diagnosisId: reportBase.diagnosisId,
        createdAt: reportBase.createdAt,
        user: me,
        history,
        draft: pdfDraft,
        beforeImages: uniqueStrings([
          ...diagnosisBeforeImageUris.slice(0, 1),
          ...pdfDraft.beforeImageUris.slice(0, MAX_BEFORE_EXTRA_IMAGES),
        ]),
        afterImages: uniqueStrings(pdfDraft.afterImageUris).slice(0, MAX_AFTER_IMAGES),
      });

      await uploadFrontendGeneratedPdf(reportBase.diagnosisId, pdf.uri);

      Alert.alert("PDF 생성 완료", "리포트 PDF가 생성되었습니다.\n이제 PDF를 열어 확인할 수 있습니다.");
      await load();
    } catch (e) {
      console.log("frontend pdf generate failed", e);
      Alert.alert("PDF 생성 실패", "PDF 파일 용량이 크거나 네트워크가 불안정해 저장하지 못했습니다. 사진 수를 줄인 뒤 다시 시도해주세요.");
    } finally {
      setGeneratingPdf(false);
    }
  }
  async function handleOpenPdf() {
    if (!reportBase?.diagnosisId) return;
    try {
      const url = await getPdfUrl(reportBase.diagnosisId);
      if (url) await Linking.openURL(url);
    } catch {
      Alert.alert("PDF 열기 실패", "생성된 PDF를 불러오지 못했습니다. 먼저 PDF를 다시 생성해주세요.");
    }
  }

  if (loading) return <ScreenState loading />;
  if (!history) return <ScreenState title="리포트 없음" errorMessage="해당 리포트를 찾을 수 없습니다." />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1e293b" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>리포트 상세</Text>
            <Text style={styles.headerSubtitle}>진단 결과 및 수리 내역을 확인하세요</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={20} color={MAIN_BLUE} />
            <Text style={styles.cardTitle}>기본 정보</Text>
          </View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>리포트 ID</Text><Text style={styles.infoValue}>{reportBase?.reportId || "-"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>작성일시</Text><Text style={styles.infoValue}>{formatDisplayDate(reportBase?.createdAt)}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>사용자</Text><Text style={styles.infoValue}>{me?.username || "-"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>연락처</Text><Text style={styles.infoValue}>{me?.phoneNumber || "-"}</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>주소</Text><Text style={styles.infoValue}>{me?.address || "-"}</Text></View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>자동 반영 정보</Text>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: '#eff6ff' }]}><Text style={[styles.badgeText, { color: MAIN_BLUE }]}>{fmtIssue(history.issueType)}</Text></View>
            <View style={[styles.badge, { backgroundColor: '#fff7ed' }]}><Text style={[styles.badgeText, { color: '#f97316' }]}>위험도 {history.riskScore}</Text></View>
            <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}><Text style={[styles.badgeText, { color: '#16a34a' }]}>{fmtRec(history.recommendation)}</Text></View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>수리 후 직접 입력</Text>
          </View>

          <View style={styles.tabContainer}>
            <Pressable onPress={() => setDraft((prev) => ({ ...prev, repairMethod: "DIY" }))} style={[styles.tab, draft.repairMethod === "DIY" && styles.tabActive]}>
              <Text style={[styles.tabText, draft.repairMethod === "DIY" && styles.tabTextActive]}>직접 수리</Text>
            </Pressable>
            <Pressable onPress={() => setDraft((prev) => ({ ...prev, repairMethod: "PRO" }))} style={[styles.tab, draft.repairMethod === "PRO" && styles.tabActive]}>
              <Text style={[styles.tabText, draft.repairMethod === "PRO" && styles.tabTextActive]}>전문업체 수리</Text>
            </Pressable>
          </View>

          <TextInput
            value={draft.repairDate}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, repairDate: text }))}
            placeholder="수리 완료일 (예: 2026-04-06)"
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />

          {draft.repairMethod === "DIY" ? (
            <View style={{ gap: 10 }}>
              <TextInput value={draft.diyMaterialsUsed} onChangeText={(text) => setDraft((p) => ({ ...p, diyMaterialsUsed: text }))} placeholder="사용한 자재" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.diyMaterialCost || draft.materialCost} onChangeText={(text) => setDraft((p) => ({ ...p, diyMaterialCost: text, materialCost: text }))} placeholder="자재비" keyboardType="number-pad" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.diyWorkMemo} multiline onChangeText={(text) => setDraft((p) => ({ ...p, diyWorkMemo: text }))} placeholder="직접 수리 메모" style={styles.textArea} placeholderTextColor="#94a3b8" />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput value={draft.contractorName} onChangeText={(text) => setDraft((p) => ({ ...p, contractorName: text }))} placeholder="업체명" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.contractorContact} onChangeText={(text) => setDraft((p) => ({ ...p, contractorContact: text }))} placeholder="업체 연락처" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.totalCost} onChangeText={(t) => setDraft(p => ({ ...p, totalCost: t }))} placeholder="총 비용" keyboardType="number-pad" style={[styles.input, { color: MAIN_BLUE, fontWeight: '700' }]} placeholderTextColor="#94a3b8" />
            </View>
          )}

          <TextInput value={draft.repairSummary} multiline onChangeText={(text) => setDraft((p) => ({ ...p, repairSummary: text }))} placeholder="실제 작업 요약" style={[styles.textArea, { marginTop: 10 }]} placeholderTextColor="#94a3b8" />
          <TextInput value={draft.notes} multiline onChangeText={(text) => setDraft((p) => ({ ...p, notes: text }))} placeholder="사용자 메모" style={[styles.textArea, { marginTop: 10 }]} placeholderTextColor="#94a3b8" />

          <View style={[styles.imageSection, { marginTop: 14 }]}> 
            <View style={styles.imageSectionHeader}>
              <Text style={styles.imageSectionTitle}>수리 전 사진 · 진단 사진 자동 반영</Text>
              <Pressable style={styles.imageAddButton} onPress={() => pickImages("beforeImageUris")}>
                <Ionicons name="images-outline" size={16} color={MAIN_BLUE} />
                <Text style={styles.imageAddButtonText}>추가 첨부</Text>
              </Pressable>
            </View>
            {diagnosisBeforeImageUris.length === 0 && draft.beforeImageUris.length === 0 ? (
              <View style={styles.emptyImageBox}>
                <Text style={styles.emptyImageText}>진단 사진 URL이 아직 응답되지 않았습니다. 추가 사진은 직접 첨부할 수 있습니다.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
                {diagnosisBeforeImageUris.map((uri, index) => (
                  <View key={`diagnosis-${uri}-${index}`} style={styles.imagePreviewCard}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <View style={styles.autoImageBadge}>
                      <Text style={styles.autoImageBadgeText}>진단 사진</Text>
                    </View>
                  </View>
                ))}
                {draft.beforeImageUris.map((uri, index) => (
                  <View key={`before-extra-${uri}-${index}`} style={styles.imagePreviewCard}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <Pressable style={styles.imageRemoveButton} onPress={() => removeImage("beforeImageUris", index)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Text style={styles.imageSectionTitle}>수리 후 사진</Text>
              <Pressable style={styles.imageAddButton} onPress={() => pickImages("afterImageUris")}>
                <Ionicons name="images-outline" size={16} color={MAIN_BLUE} />
                <Text style={styles.imageAddButtonText}>이미지 첨부</Text>
              </Pressable>
            </View>
            {draft.afterImageUris.length === 0 ? (
              <View style={styles.emptyImageBox}><Text style={styles.emptyImageText}>첨부한 사진이 없습니다.</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
                {draft.afterImageUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imagePreviewCard}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <Pressable style={styles.imageRemoveButton} onPress={() => removeImage("afterImageUris", index)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <Pressable onPress={handleSaveDraft} disabled={savingDraft} style={[styles.saveButton, savingDraft && { opacity: 0.6 }]}> 
            {savingDraft ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>후입력 정보 임시 저장</Text>}
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={handleGenerate} disabled={generatingPdf || savingDraft} style={[styles.secondaryButton, (generatingPdf || savingDraft) && { opacity: 0.6 }]}>
            {generatingPdf ? <ActivityIndicator size="small" color={MAIN_BLUE} /> : <Text style={styles.secondaryButtonText}>PDF 생성</Text>}
          </Pressable>
          <Pressable onPress={handleOpenPdf} disabled={reportBase?.status !== "READY"} style={[styles.primaryButton, reportBase?.status !== "READY" && { backgroundColor: '#cbd5e1' }]}> 
            <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>PDF 열기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#1e293b" },
  headerSubtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#334155" },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
  infoValue: { fontSize: 14, color: "#1e293b", fontWeight: "700", flex: 1, textAlign: "right" },
  badgeContainer: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  tabContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: MAIN_BLUE },
  tabText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  tabTextActive: { color: "#fff" },
  input: { height: 52, backgroundColor: "#f8fafc", borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 10 },
  textArea: { minHeight: 100, backgroundColor: "#f8fafc", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, textAlignVertical: 'top', color: "#1e293b" },
  imageSection: { marginTop: 14, gap: 10 },
  imageSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  imageSectionTitle: { fontSize: 14, fontWeight: "800", color: "#334155" },
  imageAddButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#dbeafe", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  imageAddButtonText: { fontSize: 13, fontWeight: "700", color: MAIN_BLUE },
  imageScrollContent: { gap: 10, paddingRight: 4 },
  imagePreviewCard: { width: 120, height: 120, borderRadius: 16, overflow: "hidden", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", position: "relative" },
  imagePreview: { width: "100%", height: "100%" },
  imageRemoveButton: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999 },
  autoImageBadge: { position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(30,41,59,0.86)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  autoImageBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  emptyImageBox: { minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "dashed", backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  emptyImageText: { fontSize: 13, color: "#94a3b8" },
  saveButton: { marginTop: 16, height: 54, borderRadius: 16, backgroundColor: "#334155", alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  secondaryButton: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: "#64748b", fontWeight: "700", fontSize: 15 },
  primaryButton: { flex: 1.2, height: 56, borderRadius: 16, backgroundColor: MAIN_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
