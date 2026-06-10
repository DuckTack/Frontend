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
import { SafeAreaView } from "react-native-safe-area-context";
import { apiClient } from "../../src/api/apiClient";
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

const MAIN_BLUE = "#4F46E5";
const MAX_BEFORE_EXTRA_IMAGES = 2;
const MAX_AFTER_IMAGES = 3;

type ImageField = "beforeImageUris" | "afterImageUris";

function fmtIssue(t?: string | null) {
  const value = String(t ?? "").trim().toUpperCase();

  switch (value) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    case "PEEL":
    case "PAINT_PEEL":
      return "박리";
    case "CORROSION":
      return "부식";
    case "BULGE":
      return "들뜸";
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
  return { ...EMPTY_DRAFT };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeBackendFileUrlWithOrigin(value?: unknown, backendOrigin = ""): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (
      raw.startsWith("data:") ||
      raw.startsWith("file://") ||
      raw.startsWith("content://") ||
      raw.startsWith("asset://") ||
      raw.startsWith("ph://")
  ) {
    return raw;
  }

  if (backendOrigin) {
    const storageIndex = raw.indexOf("/storage/");
    if (storageIndex >= 0) {
      return `${backendOrigin}${raw.slice(storageIndex)}`;
    }

    const uploadsIndex = raw.indexOf("/uploads/");
    if (uploadsIndex >= 0) {
      return `${backendOrigin}${raw.slice(uploadsIndex)}`;
    }

    if (raw.startsWith("/")) {
      return `${backendOrigin}${raw}`;
    }
  }

  return raw;
}

function collectImageUrisWithOrigin(backendOrigin: string, ...values: any[]): string[] {
  const result: string[] = [];

  for (const value of values) {
    if (!value) continue;

    if (Array.isArray(value)) {
      result.push(...collectImageUrisWithOrigin(backendOrigin, ...value));
      continue;
    }

    if (typeof value === "object") {
      result.push(
          ...collectImageUrisWithOrigin(
              backendOrigin,
              value.url,
              value.uri,
              value.imageUrl,
              value.image_url,
              value.imageUri,
              value.image_uri,
              value.diagnosisImageUrl,
              value.diagnosis_image_url,
              value.imageUris,
              value.image_uris,
              value.beforeImageUris,
              value.before_image_uris,
          ),
      );
      continue;
    }

    const normalized = normalizeBackendFileUrlWithOrigin(value, backendOrigin);
    if (normalized) result.push(normalized);
  }

  return result;
}

function getDiagnosisImageUrisFromHistory(historyData: HistoryDetail | null, backendOrigin: string): string[] {
  const h: any = historyData;
  if (!h) return [];

  const diagnosisResult =
      h.diagnosisResult ??
      h.diagnosis_result ??
      h.result ??
      {};

  return uniqueStrings(
      collectImageUrisWithOrigin(
          backendOrigin,
          h.imageUrl,
          h.image_url,
          h.imageUri,
          h.image_uri,
          h.imageUris,
          h.image_uris,
          h.diagnosisImageUrl,
          h.diagnosis_image_url,
          h.diagnosisImageUris,
          h.diagnosis_image_uris,
          diagnosisResult.imageUrl,
          diagnosisResult.image_url,
          diagnosisResult.imageUri,
          diagnosisResult.image_uri,
          diagnosisResult.imageUris,
          diagnosisResult.image_uris,
      ),
  );
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

function getReservationRepairInfo(historyData: HistoryDetail | null) {
  const h: any = historyData;

  if (!h) {
    return {
      repairCompletedDate: "",
      repairTotalCost: "",
      repairSummary: "",
      contractorName: "",
      contractorContact: "",
    };
  }

  return {
    repairCompletedDate: cleanAutoValue(
        h.repairCompletedDate || h.reservationRepairCompletedDate,
    ),
    repairTotalCost: normalizeCost(
        h.repairTotalCost ?? h.reservationRepairTotalCost ?? h.totalCost,
    ),
    repairSummary: cleanAutoValue(
        h.repairSummary || h.reservationRepairSummary,
    ),
    contractorName: getReservedCompanyName(historyData),
    contractorContact: getReservedCompanyPhone(historyData),
  };
}

function buildMethodDraft(input: ReportDraft): ReportDraft {
  const method = normalizeRepairMethod(input.repairMethod);

  if (method === "DIY") {
    const diyMaterialCost = normalizeCost(
        input.diyMaterialCost || (input as any).materialCost,
    );

    return {
      ...input,
      repairMethod: "DIY",
      contractorName: "",
      contractorContact: "",
      totalCost: "",
      diyMaterialCost,
      materialCost: diyMaterialCost,
      repairSummary: cleanAutoValue(input.repairSummary),
      diyMaterialsUsed: cleanAutoValue(input.diyMaterialsUsed),
      diyWorkMemo: cleanAutoValue(input.diyWorkMemo),
      notes: cleanAutoValue(input.notes),
    } as ReportDraft;
  }

  if (method === "PRO") {
    return {
      ...input,
      repairMethod: "PRO",
      repairDate: cleanAutoValue(input.repairDate),
      contractorName: cleanAutoValue(input.contractorName),
      contractorContact: cleanAutoValue(input.contractorContact),
      totalCost: normalizeCost(input.totalCost),
      repairSummary: cleanAutoValue(input.repairSummary),
      diyMaterialsUsed: "",
      diyMaterialCost: "",
      diyWorkMemo: "",
      materialCost: "",
      notes: cleanAutoValue(input.notes),
    } as ReportDraft;
  }

  return { ...input, repairMethod: "" } as ReportDraft;
}

function validateDraftBeforeSave(input: ReportDraft): boolean {
  const method = normalizeRepairMethod(input.repairMethod);

  if (!method) {
    Alert.alert("수리 방식 선택", "직접 수리 또는 전문업체 수리를 선택해주세요.");
    return false;
  }

  if (method === "DIY") {
    const missing: string[] = [];

    if (!cleanAutoValue(input.diyMaterialsUsed)) missing.push("사용한 자재");
    if (!normalizeCost(input.diyMaterialCost || (input as any).materialCost)) missing.push("자재비");
    if (!cleanAutoValue(input.diyWorkMemo)) missing.push("직접 수리 메모");
    if (!cleanAutoValue(input.repairSummary)) missing.push("실제 작업 요약");

    if (missing.length > 0) {
      Alert.alert(
          "직접 수리 정보 필요",
          `직접 수리 PDF를 생성하려면 ${missing.join(", ")} 항목을 입력해야 합니다.`,
      );
      return false;
    }

    return true;
  }

  const missing: string[] = [];

  if (!cleanAutoValue(input.repairDate)) missing.push("수리 완료일");
  if (!normalizeCost(input.totalCost)) missing.push("총 비용");
  if (!cleanAutoValue(input.repairSummary)) missing.push("실제 작업 요약");

  if (missing.length > 0) {
    Alert.alert(
        "전문업체 수리 정보 필요",
        `전문업체 수리 PDF를 생성하려면 ${missing.join(", ")} 항목을 입력해야 합니다.`,
    );
    return false;
  }

  return true;
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
  if (draft.repairMethod === "DIY") {
    return draft;
  }

  const repairInfo = getReservationRepairInfo(historyData);

  const hasRepairInfo = Boolean(
      repairInfo.repairCompletedDate ||
      repairInfo.repairTotalCost ||
      repairInfo.repairSummary ||
      repairInfo.contractorName ||
      repairInfo.contractorContact,
  );

  if (!hasRepairInfo) return draft;

  return {
    ...draft,
    repairMethod: "PRO",
    repairDate: repairInfo.repairCompletedDate || draft.repairDate,
    contractorName: repairInfo.contractorName || draft.contractorName,
    contractorContact: repairInfo.contractorContact || draft.contractorContact,
    totalCost: repairInfo.repairTotalCost || draft.totalCost,
    repairSummary: repairInfo.repairSummary || draft.repairSummary,
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
      () => uniqueStrings([
        ...getDiagnosisImageUrisFromHistory(history, getBackendOrigin()),
        ...collectImageUrisWithOrigin(getBackendOrigin(), cachedDiagnosisImages?.imageUris),
      ]),
      [history, cachedDiagnosisImages?.imageUris],
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

      const methodDraft = buildMethodDraft(draft);

      const cleanedDraft: ReportDraft = {
        ...methodDraft,
        beforeImageUris: uniqueStrings(methodDraft.beforeImageUris).slice(0, MAX_BEFORE_EXTRA_IMAGES),
        afterImageUris: uniqueStrings(methodDraft.afterImageUris).slice(0, MAX_AFTER_IMAGES),
      };

      if (!validateDraftBeforeSave(cleanedDraft)) {
        return false;
      }

      await saveLocalReportDraft(String(reportId), cleanedDraft);
      setDraft(cleanedDraft);

      const actualCostKrw = cleanedDraft.repairMethod === "DIY"
          ? Number(normalizeCost(cleanedDraft.diyMaterialCost || (cleanedDraft as any).materialCost) || 0)
          : Number(normalizeCost(cleanedDraft.totalCost) || 0);

      await saveReportDraft(String(reportBase.diagnosisId), {
        repairMethod: cleanedDraft.repairMethod,
        repairDate: cleanedDraft.repairDate,
        contractorName: cleanedDraft.repairMethod === "PRO" ? cleanedDraft.contractorName : "",
        contractorContact: cleanedDraft.repairMethod === "PRO" ? cleanedDraft.contractorContact : "",
        repairSummary: cleanedDraft.repairSummary,
        actualCostKrw,
        notes: cleanedDraft.notes,
        totalCost: cleanedDraft.repairMethod === "PRO" ? cleanedDraft.totalCost : "",
        diyMaterialsUsed: cleanedDraft.repairMethod === "DIY" ? cleanedDraft.diyMaterialsUsed : "",
        diyMaterialCost: cleanedDraft.repairMethod === "DIY" ? cleanedDraft.diyMaterialCost : "",
        diyWorkMemo: cleanedDraft.repairMethod === "DIY" ? cleanedDraft.diyWorkMemo : "",
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

      const pdfDraft = buildMethodDraft(
          applyReservationRepairInfoToDraft(
              applyReservedCompanyToDraft(draft, history),
              history,
          ),
      );

      if (!validateDraftBeforeSave(pdfDraft)) {
        return;
      }

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

  function getBackendOrigin() {
    return String(apiClient.defaults.baseURL || "")
        .replace(/\/api\/?$/, "")
        .replace(/\/$/, "");
  }

  function normalizeBackendFileUrl(url?: string | null) {
    return normalizeBackendFileUrlWithOrigin(url, getBackendOrigin());
  }
  async function handleOpenPdf() {
    if (!reportBase?.diagnosisId) return;

    try {
      const url = await getPdfUrl(reportBase.diagnosisId);
      const fixedUrl = normalizeBackendFileUrl(url);

      console.log("PDF original URL:", url);
      console.log("PDF fixed URL:", fixedUrl);

      if (fixedUrl) {
        await Linking.openURL(fixedUrl);
        return;
      }

      Alert.alert("PDF 없음", "생성된 PDF URL이 없습니다. 먼저 PDF를 생성해주세요.");
    } catch (e) {
      console.log("PDF 열기 실패:", e);
      Alert.alert("PDF 열기 실패", "생성된 PDF를 불러오지 못했습니다. 먼저 PDF를 다시 생성해주세요.");
    }
  }

  if (loading) return <ScreenState loading />;
  if (!history) return <ScreenState title="리포트 없음" errorMessage="해당 리포트를 찾을 수 없습니다." />;

  return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardAvoidingView}>
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
              <View style={styles.infoRow}><Text style={styles.infoLabel}>진단일시</Text><Text style={styles.infoValue}>{formatDisplayDate(reportBase?.createdAt)}</Text></View>
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
                <View style={[styles.badge, { backgroundColor: '#EDEDFF' }]}><Text style={[styles.badgeText, { color: MAIN_BLUE }]}>{fmtIssue(history.issueType)}</Text></View>
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
                <Pressable
                    onPress={() => setDraft((prev) => {
                      const repairInfo = getReservationRepairInfo(history);
                      const shouldClearAutoSummary =
                          cleanAutoValue(prev.repairSummary) === repairInfo.repairSummary;

                      return {
                        ...prev,
                        repairMethod: "DIY",
                        contractorName: "",
                        contractorContact: "",
                        totalCost: "",
                        repairSummary: shouldClearAutoSummary ? "" : prev.repairSummary,
                      };
                    })}
                    style={[styles.tab, draft.repairMethod === "DIY" && styles.tabActive]}
                >
                  <Text style={[styles.tabText, draft.repairMethod === "DIY" && styles.tabTextActive]}>직접 수리</Text>
                </Pressable>
                <Pressable
                    onPress={() => setDraft((prev) => applyReservationRepairInfoToDraft({ ...prev, repairMethod: "PRO" }, history))}
                    style={[styles.tab, draft.repairMethod === "PRO" && styles.tabActive]}
                >
                  <Text style={[styles.tabText, draft.repairMethod === "PRO" && styles.tabTextActive]}>전문업체 수리</Text>
                </Pressable>
              </View>

              {draft.repairMethod === "DIY" ? (
                  <View style={styles.noticeBox}>
                    <Ionicons name="information-circle-outline" size={18} color={MAIN_BLUE} />
                    <Text style={styles.noticeText}>
                      직접 수리는 사용한 자재, 자재비, 직접 수리 메모,{"\n"}실제 작업 요약을 모두 입력해야 PDF가 생성됩니다.
                    </Text>
                  </View>
              ) : draft.repairMethod === "PRO" ? (
                  <View style={styles.noticeBox}>
                    <Ionicons name="information-circle-outline" size={18} color={MAIN_BLUE} />
                    <Text style={styles.noticeText}>
                      전문업체 수리는 업체가 수리 완료일, 총 비용,{"\n"}실제 작업 요약을 입력해야 PDF가 생성됩니다.
                    </Text>
                  </View>
              ) : (
                  <View style={styles.noticeBox}>
                    <Ionicons name="information-circle-outline" size={18} color={MAIN_BLUE} />
                    <Text style={styles.noticeText}>수리 방식을 선택한 뒤 수리 후 정보를 입력해주세요.</Text>
                  </View>
              )}

              <TextInput
                  value={draft.repairDate}
                  onChangeText={(text) => setDraft((prev) => ({ ...prev, repairDate: text }))}
                  placeholder="수리 완료일 (예: 2026-04-06)"
                  style={styles.input}
                  placeholderTextColor="#94a3b8"
              />

              {draft.repairMethod === "DIY" ? (
                  <View style={styles.methodBox}>
                    <TextInput value={draft.diyMaterialsUsed} onChangeText={(text) => setDraft((p) => ({ ...p, diyMaterialsUsed: text }))} placeholder="사용한 자재" style={styles.input} placeholderTextColor="#94a3b8" />
                    <TextInput value={draft.diyMaterialCost || (draft as any).materialCost} onChangeText={(text) => setDraft((p) => ({ ...p, diyMaterialCost: text, materialCost: text } as ReportDraft))} placeholder="자재비" keyboardType="number-pad" style={styles.input} placeholderTextColor="#94a3b8" />
                    <TextInput value={draft.diyWorkMemo} multiline onChangeText={(text) => setDraft((p) => ({ ...p, diyWorkMemo: text }))} placeholder="직접 수리 메모" style={styles.textArea} placeholderTextColor="#94a3b8" />
                    <TextInput value={draft.repairSummary} multiline onChangeText={(text) => setDraft((p) => ({ ...p, repairSummary: text }))} placeholder="실제 작업 요약" style={styles.textArea} placeholderTextColor="#94a3b8" />
                  </View>
              ) : draft.repairMethod === "PRO" ? (
                  <View style={styles.methodBox}>
                    <TextInput value={draft.contractorName} onChangeText={(text) => setDraft((p) => ({ ...p, contractorName: text }))} placeholder="업체명" style={styles.input} placeholderTextColor="#94a3b8" />
                    <TextInput value={draft.contractorContact} onChangeText={(text) => setDraft((p) => ({ ...p, contractorContact: text }))} placeholder="업체 연락처" style={styles.input} placeholderTextColor="#94a3b8" />
                    <TextInput value={draft.totalCost} onChangeText={(t) => setDraft(p => ({ ...p, totalCost: t }))} placeholder="총 비용" keyboardType="number-pad" style={[styles.input, { color: MAIN_BLUE, fontWeight: '700' }]} placeholderTextColor="#94a3b8" />
                    <TextInput value={draft.repairSummary} multiline onChangeText={(text) => setDraft((p) => ({ ...p, repairSummary: text }))} placeholder="실제 작업 요약" style={styles.textArea} placeholderTextColor="#94a3b8" />
                  </View>
              ) : null}

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
                            <Image source={{ uri: normalizeBackendFileUrl(uri) }} style={styles.imagePreview} onError={(e) => console.log("리포트 이미지 로드 실패", uri, e.nativeEvent)} />
                            <View style={styles.autoImageBadge}>
                              <Text style={styles.autoImageBadgeText}>진단 사진</Text>
                            </View>
                          </View>
                      ))}
                      {draft.beforeImageUris.map((uri, index) => (
                          <View key={`before-extra-${uri}-${index}`} style={styles.imagePreviewCard}>
                            <Image source={{ uri: normalizeBackendFileUrl(uri) }} style={styles.imagePreview} onError={(e) => console.log("리포트 이미지 로드 실패", uri, e.nativeEvent)} />
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
                            <Image source={{ uri: normalizeBackendFileUrl(uri) }} style={styles.imagePreview} onError={(e) => console.log("리포트 이미지 로드 실패", uri, e.nativeEvent)} />
                            <Pressable style={styles.imageRemoveButton} onPress={() => removeImage("afterImageUris", index)}>
                              <Ionicons name="close-circle" size={22} color="#ef4444" />
                            </Pressable>
                          </View>
                      ))}
                    </ScrollView>
                )}
              </View>

              <Pressable onPress={handleSaveDraft} disabled={savingDraft} style={[styles.saveButton, savingDraft && { opacity: 0.6 }]}>
                {savingDraft ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>입력 정보 임시 저장</Text>}
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
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  keyboardAvoidingView: { flex: 1, backgroundColor: "#fff" },
  container: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 100 },
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
  methodBox: { gap: 10 },
  noticeBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#EDEDFF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 14,
    padding: 12,
    marginBottom: 2,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, color: "#2563eb", fontWeight: "700" },
  input: { height: 52, backgroundColor: "#f8fafc", borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 10 },
  textArea: { minHeight: 100, backgroundColor: "#f8fafc", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, textAlignVertical: 'top', color: "#1e293b" },
  imageSection: { marginTop: 14, gap: 10 },
  imageSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  imageSectionTitle: { fontSize: 14, fontWeight: "800", color: "#334155" },
  imageAddButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EDEDFF", borderWidth: 1, borderColor: "#C7D2FE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
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
