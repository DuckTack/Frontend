import { Linking } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { apiClient } from "./apiClient";
import {
    getHistoryDetail,
    listHistories,
    type HistoryDetail,
    type IssueType,
    type Recommendation,
} from "./histories";

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

// =========================
// 리스트
// =========================
export async function listMyReports(): Promise<MyReportItem[]> {
    const histories = await listHistories();

    const completed = histories.filter(
        (item) => item.status !== "ANALYZING" || item.diagnosisId
    );

    const details = await Promise.all(
        completed.map((item) => getHistoryDetail(item.id))
    );

    return details
        .filter((detail) => Boolean(detail.diagnosisId))
        .map(toReportItem)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// =========================
// 단건 조회
// =========================
export async function getMyReportById(
    reportId: string
): Promise<MyReportItem | null> {
    const list = await listMyReports();
    return list.find((item) => String(item.reportId) === String(reportId)) ?? null;
}

// =========================
// 상태맵
// =========================
export async function getReportStatusMapForHistoryIds(
    historyIds: string[]
): Promise<Record<string, ReportStatus>> {
    const details = await Promise.all(
        historyIds.map(async (historyId) => {
            try {
                const detail = await getHistoryDetail(historyId);
                return [historyId, statusFromHistory(detail)] as const;
            } catch {
                return [historyId, "NONE"] as const;
            }
        })
    );

    return Object.fromEntries(details);
}

// =========================
// PDF 생성
// =========================
export async function generateReport(
    diagnosisId: string | number
): Promise<void> {
    await apiClient.post(
        `/api/reports/diagnosis/${diagnosisId}/generate`
    );
}

// =========================
// PDF URL
// =========================
export async function getPdfUrl(
    diagnosisId: string | number
): Promise<string> {
    const res = await apiClient.get(
        `/api/reports/diagnosis/${diagnosisId}/pdf-url`
    );
    return String(res.data?.data ?? res.data);
}

// =========================
// PDF 열기
// =========================
export async function openReportPdf(
    diagnosisId: string | number
): Promise<void> {
    const url = await getPdfUrl(diagnosisId);
    await Linking.openURL(url);
}

// =========================
// PDF 다운로드
// =========================
export async function downloadReport(
    diagnosisId: string | number
): Promise<string> {
    const url = await getPdfUrl(diagnosisId);

    const fileUri =
        FileSystem.documentDirectory + `report-${diagnosisId}.pdf`;

    const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri
    );

    const result = await downloadResumable.downloadAsync();

    if (!result || !result.uri) {
        throw new Error("다운로드 실패");
    }

    await Sharing.shareAsync(result.uri);
    return result.uri;
}

// =========================
// 🔥 드래프트 저장 (최종 수정본)
// =========================
export async function saveReportDraft(
    diagnosisId: string | number,
    data: {
        repairMethod: string;
        repairDate: string;
        contractorName: string;
        contractorContact: string;
        repairSummary: string;
        actualCostKrw: number;
        notes: string;

        materialCost: string;
        laborCost: string;
        totalCost: string;

        diyMaterialsUsed: string;
        diyMaterialCost: string;
        diyWorkMemo: string;
    }
): Promise<void> {
    await apiClient.put(
        `/api/reports/diagnosis/${diagnosisId}/draft`,
        data
    );
}