import { apiClient } from "./apiClient";

export type IssueType = "CRACK" | "LEAK" | "MOLD" | "DAMAGE" | "ELECTRIC" | "GAS" | "ETC";
export type DiagnosisStatus = "ANALYZING" | "COMPLETED" | "FAILED";
export type Recommendation = "DIY" | "PRO";

export type HistorySummary = {
  id: string | number;
  historyId: string | number;
  diagnosisId?: string | number;
  status: DiagnosisStatus;
  riskScore: number;
  issueType: IssueType;
  createdAt: string;
  recommendation: Recommendation;
  imageUris?: string[];
  cause?: string;
  naturalOrHuman?: string;
  caution?: string;
  report?: {
    storageKey: string;
    contentType: string;
    sizeBytes: number;
  } | null;
};

export type HistoryDetail = HistorySummary;

function toRecommendation(riskScore: number): Recommendation {
  return riskScore >= 70 ? "PRO" : "DIY";
}

function normalizeHistoryItem(raw: any): HistorySummary {
  const riskScore = Number(raw?.riskScore ?? 0);
  const id = raw?.id;
  return {
    id,
    historyId: id,
    diagnosisId: raw?.diagnosisId,
    status: (raw?.status ?? "ANALYZING") as DiagnosisStatus,
    riskScore,
    issueType: (raw?.issueType ?? "ETC") as IssueType,
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    recommendation: toRecommendation(riskScore),
    imageUris: [],
    cause: undefined,
    naturalOrHuman: undefined,
    caution: undefined,
    report: raw?.report ?? null,
  };
}

export async function listHistories(): Promise<HistorySummary[]> {
  const res = await apiClient.get("/api/histories", {
    params: { page: 0, size: 50, sort: "createdAt,desc" },
  });
  const page = res.data?.data ?? res.data;
  const content = Array.isArray(page?.content) ? page.content : [];
  return content.map(normalizeHistoryItem);
}

export async function getHistoryDetail(id: string | number): Promise<HistoryDetail> {
  const res = await apiClient.get(`/api/histories/${id}`);
  return normalizeHistoryItem(res.data?.data ?? res.data);
}

export async function deleteHistory(id: string | number): Promise<void> {
  await apiClient.delete("/api/histories", {
    data: { ids: [Number(id)] },
  });
}
