import AsyncStorage from "@react-native-async-storage/async-storage";
import type { IssueType, Recommendation } from "./histories";

/**
 * 리포트(PDF/증빙)
 *
 * 컨셉: "자동 생성(초안) + 사용자 보완(Draft)" → 제출용(READY)
 *
 * Backend2 연동 포인트(권장)
 * - POST /api/reports/from-history/{historyId}  : 초안 생성
 * - GET  /api/reports                           : 내 리포트 목록
 * - GET  /api/reports/{reportId}                : 리포트 상세
 * - PUT  /api/reports/{reportId}                : Draft 저장(전/후사진/비용 등)
 * - POST /api/reports/{reportId}/submit         : READY 전환
 * - GET  /api/reports/{reportId}/pdf            : PDF 다운로드(또는 presigned URL)
 * - POST /api/reports/{reportId}/share          : 공유 링크 발급
 */

export type ReportStatus = "NONE" | "GENERATING" | "READY" | "FAILED";

/**
 * 마이페이지 "리포트 내역"은 히스토리 기반으로 보여주되,
 * PDF 생성 상태(READY/GENERATING 등)를 추가로 붙여서 UX를 만듭니다.
 */
export type MyReportItem = {
  reportId: string; // 리포트 식별자(없으면 historyId를 써도 됨)
  historyId: string;
  createdAt: string;
  issueType: IssueType;
  riskScore: number;
  recommendation: Recommendation;
  status: ReportStatus;

  // 증빙(전/후 사진) placeholder용: 나중에 업로드 연동 시 배열로 확장
  beforePhotoUri?: string | null;
  afterPhotoUri?: string | null;

  // 진단에 사용한 원본 사진(리포트에 첨부/근거로 활용 가능)
  diagnosisImageUris?: string[];
};

/**
 * ✅ "자동 + 사용자 보완" 모델
 * - 자동 채움(진단 결과/프로필)은 history/users에서 가져와서 표시
 * - 사용자가 입력해야만 알 수 있는(조치/비용/전후사진 등) 필드는 Draft로 로컬 저장(지금은 AsyncStorage)
 * - Backend2가 오면 Draft 저장/조회만 서버로 옮기면 됨(화면 코드는 거의 유지)
 */
export type ReportDraft = {
  reportId: string;
  historyId: string;

  // 사용자가 보완하는 필드(최소)
  actionType?: "DIY" | "PRO"; // 실제 조치 방식
  cleanedAt?: string; // 청소/수리 날짜(YYYY-MM-DD)
  workSummary?: string; // 작업 내용 요약
  workTimeMinutes?: number; // 작업 소요(분)
  materialsCost?: number; // 자재비 합계
  laborCost?: number; // 인건비(전문업체)
  notes?: string; // 비고/특이사항
  beforePhotoUri?: string | null;
  afterPhotoUri?: string | null;

  // 진단 원본 사진(자동 채움) - 사용자가 수정하지 않고 참고용으로 보여줌
  diagnosisImageUris?: string[];

  // 제출용으로 표시한 시각(로컬)
  submittedAt?: string;

  // Draft 기준으로 PDF 준비 상태를 올릴 수 있음(Backend2 오면 서버 상태로 대체)
  statusOverride?: ReportStatus; // NONE/GENERATING/READY/FAILED
};

const DRAFTS_KEY = "reportDrafts_v1";
const MYREPORTS_KEY = "myReports_v1";



// ✅ 마이페이지에서 "생성 중" 상태도 보여주고 싶다 → 2번째를 GENERATING으로 둠
const mockMyReports: MyReportItem[] = [
  {
    reportId: "r1",
    historyId: "h1",
    createdAt: "2026-02-10",
    issueType: "MOLD",
    riskScore: 78,
    recommendation: "DIY",
    status: "GENERATING",
    beforePhotoUri: null,
    afterPhotoUri: null,
  },
  {
    reportId: "r2",
    historyId: "h2",
    createdAt: "2026-02-08",
    issueType: "LEAK",
    riskScore: 85,
    recommendation: "PRO",
    status: "GENERATING",
    beforePhotoUri: null,
    afterPhotoUri: null,
  },
  {
    reportId: "r3",
    historyId: "h3",
    createdAt: "2026-02-05",
    issueType: "CRACK",
    riskScore: 42,
    recommendation: "DIY",
    status: "GENERATING",
    beforePhotoUri: null,
    afterPhotoUri: null,
  },
];


async function readMyReports(): Promise<MyReportItem[]> {
  const raw = await AsyncStorage.getItem(MYREPORTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MyReportItem[];
  } catch {
    return [];
  }
}

async function writeMyReports(items: MyReportItem[]): Promise<void> {
  await AsyncStorage.setItem(MYREPORTS_KEY, JSON.stringify(items));
}

async function ensureSeededMyReports(): Promise<MyReportItem[]> {
  const current = await readMyReports();
  if (current.length > 0) return current;
  // 최초 1회: mock seed 저장
  await writeMyReports(mockMyReports);
  return mockMyReports;
}

async function readDraftMap(): Promise<Record<string, ReportDraft>> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ReportDraft>;
  } catch {
    return {};
  }
}

async function writeDraftMap(map: Record<string, ReportDraft>) {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(map));
}

export async function getReportDraft(reportId: string): Promise<ReportDraft | null> {
  const map = await readDraftMap();
  return map[reportId] ?? null;
}

export async function upsertReportDraft(reportId: string, patch: Partial<ReportDraft>): Promise<ReportDraft> {
  const map = await readDraftMap();
  const cur = map[reportId] ?? { reportId, historyId: patch.historyId ?? "" };
  const next: ReportDraft = {
    ...cur,
    ...patch,
    reportId,
    historyId: patch.historyId ?? cur.historyId,
  };
  map[reportId] = next;
  await writeDraftMap(map);
  return next;
}

export async function setReportStatus(reportId: string, status: ReportStatus): Promise<void> {
  await upsertReportDraft(reportId, { statusOverride: status });
}

export async function markReportSubmitted(reportId: string): Promise<void> {
  await upsertReportDraft(reportId, { submittedAt: new Date().toISOString(), statusOverride: "READY" });
}

export async function ensureReportForHistory(
  historyId: string,
  opts?: {
    reportId?: string;
    createdAt?: string;
    issueType?: IssueType;
    riskScore?: number;
    recommendation?: Recommendation;
    diagnosisImageUris?: string[];
  }
): Promise<MyReportItem> {
  const list = await ensureSeededMyReports();
  // 이미 존재하는 report가 있으면 그대로
  const existing = list.find((x) => x.historyId === historyId);
  if (existing) return existing;

  const reportId = opts?.reportId ?? `rep_${historyId}`;
  const createdAt = opts?.createdAt ?? new Date().toISOString().slice(0, 10);
  const item: MyReportItem = {
    reportId,
    historyId,
    createdAt,
    issueType: opts?.issueType ?? "ETC",
    riskScore: opts?.riskScore ?? 0,
    recommendation: opts?.recommendation ?? "DIY",
    status: "GENERATING",
    beforePhotoUri: null,
    afterPhotoUri: null,
    diagnosisImageUris: opts?.diagnosisImageUris ?? [],
  };

  const next = [item, ...list];
  await writeMyReports(next);
  return item;
}

export async function getReportForHistory(historyId: string): Promise<MyReportItem | null> {
  const list = await ensureSeededMyReports();
  const found = list.find((x) => x.historyId === historyId);
  if (!found) return null;
  return await getMyReportById(found.reportId);
}


export async function listMyReports(): Promise<MyReportItem[]> {
  // DEV_TOKEN or 서버 미연동 상황에서도 동작하도록 로컬 seed + draft merge 구조
  try {
    const base = (await ensureSeededMyReports()).slice();
    const drafts = await readDraftMap();

    const merged = base.map((r) => {
      const d = drafts[r.reportId];
      if (!d) return r;

      const submitted = !!d.submittedAt;
      const status: ReportStatus =
        submitted ? "READY" : (d.statusOverride ?? r.status ?? "GENERATING");

      return {
        ...r,
        status,
        beforePhotoUri: d.beforePhotoUri ?? r.beforePhotoUri ?? null,
        afterPhotoUri: d.afterPhotoUri ?? r.afterPhotoUri ?? null,
        diagnosisImageUris: d.diagnosisImageUris ?? r.diagnosisImageUris ?? [],
      };
    });

    // 최신순
    merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return merged;
  } catch {
    // 최후 fallback
    return mockMyReports;
  }
}

/**
 * 히스토리 목록에서 "리포트(PDF) 상태"를 바로 보여주기 위한 헬퍼.
 * - key: historyId
 * - value: ReportStatus (NONE/GENERATING/READY/FAILED)
 */
export async function getReportStatusMapForHistoryIds(
  historyIds: string[]
): Promise<Record<string, ReportStatus>> {
  const map: Record<string, ReportStatus> = {};
  if (historyIds.length === 0) return map;

  try {
    const base = await ensureSeededMyReports();
    const drafts = await readDraftMap();

    // historyId -> reportId
    const reportByHistory = new Map<string, string>();
    for (const r of base) reportByHistory.set(r.historyId, r.reportId);

    for (const hid of historyIds) {
      const rid = reportByHistory.get(hid);
      if (!rid) {
        map[hid] = "NONE";
        continue;
      }

      const r = base.find((x) => x.reportId === rid);
      const d = drafts[rid];

      // Draft가 제출되었으면 READY로 간주
      const submitted = !!d?.submittedAt;
      const status: ReportStatus =
        submitted ? "READY" : (d?.statusOverride ?? r?.status ?? "GENERATING");
      map[hid] = status;
    }

    return map;
  } catch {
    // 최후 fallback: 상태를 알 수 없으면 NONE으로
    for (const hid of historyIds) map[hid] = "NONE";
    return map;
  }
}



export async function getMyReportById(reportId: string): Promise<MyReportItem | null> {
  const base = await ensureSeededMyReports();
  const drafts = await readDraftMap();
  const found = base.find((x) => x.reportId === reportId);
  if (!found) return null;

  const d = drafts[reportId];
  if (!d) return found;

  const submitted = !!d.submittedAt;
  const status: ReportStatus = submitted ? "READY" : (d.statusOverride ?? found.status);

  return {
    ...found,
    status,
    beforePhotoUri: d.beforePhotoUri ?? found.beforePhotoUri ?? null,
    afterPhotoUri: d.afterPhotoUri ?? found.afterPhotoUri ?? null,
    diagnosisImageUris: d.diagnosisImageUris ?? found.diagnosisImageUris ?? [],
  };
}

export async function downloadReport(_reportId: string): Promise<void> {
  // Backend2에서 presigned URL 등 내려주면 구현
  throw new Error("준비중");
}

export async function createShareLink(_reportId: string): Promise<string> {
  throw new Error("준비중");
}
