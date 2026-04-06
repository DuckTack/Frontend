import { Linking } from "react-native";
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

// ★★★ 이게 브라우저에서 PDF 바로 열기 ★★★
export async function openReportPdf(diagnosisId: string | number): Promise<void> {
  const url = await getPdfUrl(diagnosisId);
  await Linking.openURL(url);
}