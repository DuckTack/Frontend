import * as FileSystem from "expo-file-system/legacy";
import { apiClient } from "./apiClient";

const FS: any = FileSystem;

export type ReportStatus = "NONE" | "GENERATING" | "READY" | "FAILED";

export interface MyReportItem {
  id: number;
  diagnosisId: number;
  issueType: string;
  riskScore: number;
  status: ReportStatus;
  createdAt: string;
}

/** 페이지 응답 타입 */
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

/** 내 리포트 목록 */
export async function listMyReports(): Promise<PageResponse<MyReportItem>> {
  const res = await apiClient.get(
      "/api/histories?page=0&size=20&sort=createdAt,desc"
  );
  return res.data.data;
}

/** PDF 생성 */
export async function generateReport(diagnosisId: number) {
  await apiClient.post(`/api/reports/diagnosis/${diagnosisId}/generate`);
}

/** PDF URL 가져오기 */
export async function getPdfUrl(diagnosisId: number): Promise<string> {
  const res = await apiClient.get(
      `/api/reports/diagnosis/${diagnosisId}/pdf-url`
  );
  return res.data.data;
}

/** PDF 다운로드 */
export async function downloadReport(
    diagnosisId: number
): Promise<string> {
  const url = await getPdfUrl(diagnosisId);

  const fileUri = FS.documentDirectory + `report_${diagnosisId}.pdf`;

  await FS.downloadAsync(url, fileUri);

  return fileUri;
}

/** 리포트 존재 여부 */
export async function getReportStatusMap(): Promise<Record<string, boolean>> {
  const res = await apiClient.get("/api/reports/status-map");
  return res.data.data;
}