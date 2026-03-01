import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 히스토리(진단 기록)
 *
 * Backend1 연동 포인트
 * - GET /api/histories            : 내 진단 기록 목록
 * - GET /api/histories/{id}       : 진단 기록 상세
 * - DELETE /api/histories         : 선택 삭제(예: { ids: [...] })
 *
 * 현재 구현은 Backend 미연동 상태에서도 앱이 깨지지 않도록
 * AsyncStorage를 "로컬 DB"처럼 사용합니다.
 */

export type IssueType = "CRACK" | "LEAK" | "MOLD" | "ETC";
export type DiagnosisStatus = "ANALYZING" | "COMPLETED" | "FAILED";
// 진단 결과에 따른 추천 액션
export type Recommendation = "DIY" | "PRO";

export type HistorySummary = {
  /**
   * Some versions of the app used `id`, others used `historyId`.
   * Keep both optional for backward compatibility.
   */
  id?: string | number;
  historyId?: string | number;

  diagnosisId?: string | number;
  status: DiagnosisStatus;
  riskScore: number;
  issueType: IssueType;
  createdAt: string;
  imageUris?: string[];

  /**
   * 아래 필드들은 "상세(결과 화면)"에서 쓰이는 진단 결과 필드입니다.
   * Backend1 연동 시 /api/histories/{id} 응답에 포함되면 그대로 매핑하면 됩니다.
   */
  recommendation?: Recommendation;
  cause?: string;
  naturalOrHuman?: string;
  caution?: string;
};

export type HistoryDetail = HistorySummary & {
  // add extra fields as needed
};

const STORAGE_KEYS = [
  "histories_v1",
  "histories", // legacy
  "HISTORIES", // legacy (rare)
];

function normalizeId(h: HistorySummary): string {
  const raw = (h.historyId ?? h.id ?? h.diagnosisId) as any;
  return String(raw ?? "");
}

function seedMockIfEmpty(): HistorySummary[] {
  // Minimal seed so Histories never renders empty in DEV while backend isn't connected.
  // If you already have real saved histories, we won't use this.
  return [
    {
      historyId: "seed-1",
      diagnosisId: "d-seed-1",
      status: "COMPLETED",
      riskScore: 62,
      issueType: "MOLD",
      createdAt: new Date().toISOString(),
      imageUris: [],
    },
  ];
}

async function readFirstAvailable(): Promise<HistorySummary[]> {
  for (const k of STORAGE_KEYS) {
    const raw = await AsyncStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as HistorySummary[];
    } catch {
      // ignore
    }
  }
  return [];
}

async function writePrimary(items: HistorySummary[]) {
  await AsyncStorage.setItem(STORAGE_KEYS[0], JSON.stringify(items));
}

export async function listHistories(): Promise<HistorySummary[]> {
  const items = await readFirstAvailable();
  if (items.length > 0) {
    // Ensure IDs are stable and status exists
    return items.map((h) => ({
      ...h,
      status: (h as any).status ?? "COMPLETED",
      historyId: h.historyId ?? h.id,
      id: h.id ?? h.historyId ?? h.diagnosisId,
    }));
  }

  // If nothing saved yet, return a seed mock to avoid blank UI
  const seed = seedMockIfEmpty();
  await writePrimary(seed);
  return seed;
}

export async function getHistoryDetail(historyId: string | number): Promise<HistoryDetail> {
  const all = await listHistories();
  const found = all.find((h) => normalizeId(h) === String(historyId));
  if (found) return found;
  // fallback
  return {
    historyId,
    id: historyId,
    diagnosisId: String(historyId),
    status: "COMPLETED",
    riskScore: 0,
    issueType: "ETC",
    createdAt: new Date().toISOString(),
    imageUris: [],
  };
}

export async function createHistory(input: Omit<HistorySummary, "createdAt"> & { createdAt?: string }): Promise<HistorySummary> {
  const all = await listHistories();
  const newItem: HistorySummary = {
    ...input,
    status: input.status ?? "COMPLETED",
    createdAt: input.createdAt ?? new Date().toISOString(),
    historyId: input.historyId ?? input.id ?? `h-${Date.now()}`,
    id: (input.id ?? input.historyId) as any,
  };

  // id가 비어있으면 historyId로 통일
  newItem.id = newItem.id ?? newItem.historyId;

  const merged = [newItem, ...all].reduce<HistorySummary[]>((acc, cur) => {
    const id = normalizeId(cur);
    if (!id) return acc;
    if (acc.some((x) => normalizeId(x) === id)) return acc;
    acc.push(cur);
    return acc;
  }, []);

  await writePrimary(merged);
  return newItem;
}

export async function deleteHistory(historyId: string | number): Promise<void> {
  const all = await listHistories();
  const filtered = all.filter((h) => normalizeId(h) !== String(historyId));
  await writePrimary(filtered);
}
