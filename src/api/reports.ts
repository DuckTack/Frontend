import { Linking } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { apiClient } from "./apiClient";
import { getHistoryDetail, listHistories, type HistoryDetail, type IssueType, type Recommendation } from "./histories";

export type ReportStatus = "NONE" | "GENERATING" | "READY" | "FAILED";

export type MyReportItem = {
  reportId: string;
  historyId: string;
  diagnosisId: string;
  createdAt: string;
  issueType: IssueType;
  riskScore: number;
  recommendation: Recommendation;
  status: ReportStatus;
};

function statusFromHistory(history: HistoryDetail): ReportStatus {
  if (history.status === "FAILED") return "FAILED";
  if (history.report) return "READY";
  return "GENERATING";
}

function toReportItem(history: HistoryDetail): MyReportItem {
  return {
    reportId: String(history.id),
    historyId: String(history.id),
    diagnosisId: String(history.diagnosisId ?? ""),
    createdAt: history.createdAt,
    issueType: history.issueType,
    riskScore: history.riskScore,
    recommendation: history.recommendation,
    status: statusFromHistory(history),
  };
}

export async function listMyReports(): Promise<MyReportItem[]> {
  const histories = await listHistories();
  const completed = histories.filter((item) => item.status !== "ANALYZING" || item.diagnosisId);
  const details = await Promise.all(completed.map((item) => getHistoryDetail(item.id)));

  return details
      .filter((detail) => Boolean(detail.diagnosisId))
      .map(toReportItem)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function generateReport(diagnosisId: string | number): Promise<void> {
  await apiClient.post(`/api/reports/diagnosis/${diagnosisId}/generate`);
}

export async function getPdfUrl(diagnosisId: string | number): Promise<string> {
  const res = await apiClient.get(`/api/reports/diagnosis/${diagnosisId}/pdf-url`);
  return String(res.data?.data ?? res.data);
}

// ✅ PDF 열기
export async function openReportPdf(diagnosisId: string | number): Promise<void> {
  const url = await getPdfUrl(diagnosisId);
  await Linking.openURL(url);
}

// ✅ PDF 다운로드 + 공유
export async function downloadReport(diagnosisId: string | number): Promise<string> {
  const url = await getPdfUrl(diagnosisId);

  const fileUri = FileSystem.documentDirectory + `report-${diagnosisId}.pdf`;

  const downloadResumable = FileSystem.createDownloadResumable(url, fileUri);
  const result = await downloadResumable.downloadAsync();

  if (!result || !result.uri) {
    throw new Error("다운로드 실패");
  }

  await Sharing.shareAsync(result.uri);
  return result.uri;
}
export async function getMyReportById(reportId: string): Promise<MyReportItem | null> {
  try {
    const res = await apiClient.get(`/api/reports/${reportId}`);
    return res.data?.data ?? null;
  } catch (e) {
    console.log("getMyReportById error", e);
    return null;
  }
}
// ✅ 드래프트 저장 (백엔드 API 있을 때만 동작)
export async function saveReportDraft(
    diagnosisId: string | number,
    data: {
      repairMethod: string;
      completionDate: string;
      companyOrPersonName: string;
      contactInfo: string;
      workSummary: string;
      actualCostKrw: number;
      memo: string;
    }
): Promise<void> {
  await apiClient.put(`/api/reports/diagnosis/${diagnosisId}/draft`, data);
}