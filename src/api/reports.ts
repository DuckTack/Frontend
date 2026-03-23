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

export async function getReportStatusMapForHistoryIds(historyIds: string[]): Promise<Record<string, ReportStatus>> {
  const details = await Promise.all(historyIds.map((id) => getHistoryDetail(id)));
  return details.reduce<Record<string, ReportStatus>>((acc, detail) => {
    acc[String(detail.id)] = statusFromHistory(detail);
    return acc;
  }, {});
}

export async function getMyReportById(reportId: string): Promise<MyReportItem | null> {
  const detail = await getHistoryDetail(reportId);
  if (!detail?.diagnosisId) return null;
  return toReportItem(detail);
}

export async function generateReport(diagnosisId: string | number): Promise<void> {
  await apiClient.post(`/api/reports/diagnosis/${diagnosisId}/generate`);
}

export async function downloadReport(diagnosisId: string | number): Promise<number> {
  const res = await apiClient.get(`/api/reports/diagnosis/${diagnosisId}/download`, {
    responseType: "arraybuffer",
    timeout: 30000,
  });
  const bytes = res.data?.byteLength ?? res.data?.length ?? 0;
  return Number(bytes);
}
