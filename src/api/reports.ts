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
    expertVendorId?: string;
    expertVendorName?: string;
    reviewWritten?: boolean;
};

export type UploadedReportImage = {
    fileKey: string;
    url?: string;
};

export type FrontendGeneratedPdfResponse = {
    storageKey?: string;
    url?: string;
    contentType?: string;
    sizeBytes?: number;
};

export type SaveReportDraftRequest = {
    repairMethod: "" | "DIY" | "PRO";
    repairDate: string;
    contractorName: string;
    contractorContact: string;
    repairSummary: string;
    actualCostKrw: number;
    notes: string;
    totalCost: string;
    diyMaterialsUsed: string;
    diyMaterialCost: string;
    diyWorkMemo: string;
    /** 구버전 백엔드 호환용. 전문업체 수리에서는 더 이상 사용하지 않음. */
    materialCost?: string;
    laborCost?: string;
    beforeImageKeys?: string[];
    afterImageKeys?: string[];
    diagnosisImageKeys?: string[];
    useDiagnosisImagesAsBefore?: boolean;
    templateVersion?: string;
};

export type RemoteReportDraft = {
    diagnosisId?: string | number;
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
    updatedAt?: string | null;
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
        expertVendorId: history.expertVendorId,
        expertVendorName: history.expertVendorName,
        reviewWritten: history.reviewWritten,
    };
}

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

export async function getMyReportById(
    reportId: string
): Promise<MyReportItem | null> {
    const list = await listMyReports();
    return list.find((item) => String(item.reportId) === String(reportId)) ?? null;
}

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

export async function generateReport(
    diagnosisId: string | number
): Promise<void> {
    await apiClient.post(
        `/api/reports/diagnosis/${diagnosisId}/generate`
    );
}

export async function getPdfUrl(
    diagnosisId: string | number
): Promise<string> {
    const res = await apiClient.get(
        `/api/reports/diagnosis/${diagnosisId}/pdf-url`
    );
    return String(res.data?.data ?? res.data);
}

export async function getReportDraft(
    diagnosisId: string | number
): Promise<RemoteReportDraft | null> {
    const res = await apiClient.get(
        `/api/reports/diagnosis/${diagnosisId}/draft`
    );

    return res.data?.data ?? res.data ?? null;
}

export async function openReportPdf(
    diagnosisId: string | number
): Promise<void> {
    const url = await getPdfUrl(diagnosisId);
    await Linking.openURL(url);
}

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

function guessMimeType(uri: string) {
    const lower = uri.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".heic")) return "image/heic";
    if (lower.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
}

export async function uploadReportImages(
    diagnosisId: string | number,
    type: "BEFORE" | "AFTER",
    uris: string[]
): Promise<UploadedReportImage[]> {
    if (uris.length === 0) return [];

    const formData = new FormData();
    uris.forEach((uri, index) => {
        const filename = uri.split("/").pop() || `report-image-${index + 1}.jpg`;
        formData.append("files", {
            uri,
            name: filename,
            type: guessMimeType(uri),
        } as any);
    });

    const res = await apiClient.post("/api/reports/images/upload", formData, {
        params: { diagnosisId, type },
        headers: {
            "Content-Type": "multipart/form-data",
        },
        timeout: 60000, // 이미지 업로드는 최대 60초
    });

    const body = res.data?.data ?? res.data;
    const files = Array.isArray(body?.files)
        ? body.files
        : Array.isArray(body)
          ? body
          : [];

    return files.map((file: any) => {
        const fileKey = typeof file === "string" ? file : file?.fileKey ?? file?.key ?? file?.id ?? "";
        return {
            fileKey: String(fileKey),
            url: typeof file === "object" && file?.url ? String(file.url) : undefined,
        };
    });
}

export async function saveReportDraft(
    diagnosisId: string | number,
    data: SaveReportDraftRequest
): Promise<void> {
    await apiClient.put(
        `/api/reports/diagnosis/${diagnosisId}/draft`,
        data
    );
}

export async function uploadFrontendGeneratedPdf(
    diagnosisId: string | number,
    pdfUri: string
): Promise<FrontendGeneratedPdfResponse> {
    const formData = new FormData();
    formData.append("file", {
        uri: pdfUri,
        name: `dduckttack-report-${diagnosisId}.pdf`,
        type: "application/pdf",
    } as any);
    formData.append("templateVersion", "FRONTEND_REPORT_V1");

    const res = await apiClient.post(
        `/api/reports/diagnosis/${diagnosisId}/frontend-pdf`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            timeout: 120000,
        }
    );

    return res.data?.data ?? res.data ?? {};
}
