import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";

export type IssueType = "CRACK" | "LEAK" | "MOLD" | "DAMAGE" | "ELECTRIC" | "GAS" | "ETC";
export type DiagnosisStatus = "ANALYZING" | "COMPLETED" | "FAILED";
export type Recommendation = "DIY" | "PRO";

export type HistorySummary = {
  id?: string | number;
  historyId?: string | number;
  diagnosisId?: string | number;
  status: DiagnosisStatus;
  riskScore: number;
  issueType: IssueType;
  createdAt: string;
  imageUris?: string[];
  recommendation?: Recommendation;
  cause?: string;
  naturalOrHuman?: string;
  caution?: string;
  report?: { storageKey: string; contentType: string; sizeBytes: number } | null;
};

export type HistoryDetail = HistorySummary;

type LocalHistoryExtras = Pick<HistoryDetail, "imageUris" | "cause" | "naturalOrHuman" | "caution">;

const STORAGE_KEYS = ["histories_v1", "histories", "HISTORIES"];
const HISTORY_EXTRAS_KEY = "history_extras_v1";

function normalizeId(h: HistorySummary): string {
  const raw = (h.historyId ?? h.id ?? h.diagnosisId) as any;
  return String(raw ?? "");
}

function toRecommendation(riskScore: number): Recommendation {
  return riskScore >= 70 ? "PRO" : "DIY";
}

function seedMockIfEmpty(): HistorySummary[] {
  return [
    {
      historyId: "seed-1",
      diagnosisId: "d-seed-1",
      status: "COMPLETED",
      riskScore: 62,
      issueType: "MOLD",
      recommendation: "DIY",
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

async function readExtrasMap(): Promise<Record<string, LocalHistoryExtras>> {
  const raw = await AsyncStorage.getItem(HISTORY_EXTRAS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, LocalHistoryExtras>;
  } catch {
    return {};
  }
}

async function writeExtrasMap(map: Record<string, LocalHistoryExtras>) {
  await AsyncStorage.setItem(HISTORY_EXTRAS_KEY, JSON.stringify(map));
}

export async function saveHistoryExtras(historyId: string | number, extras: LocalHistoryExtras): Promise<void> {
  const map = await readExtrasMap();
  map[String(historyId)] = extras;
  await writeExtrasMap(map);
}

async function withExtras(item: HistorySummary): Promise<HistorySummary> {
  const map = await readExtrasMap();
  const id = normalizeId(item);
  const extras = map[id] ?? {};
  return {
    ...item,
    recommendation: item.recommendation ?? toRecommendation(item.riskScore),
    imageUris: item.imageUris ?? extras.imageUris ?? [],
    cause: item.cause ?? extras.cause,
    naturalOrHuman: item.naturalOrHuman ?? extras.naturalOrHuman,
    caution: item.caution ?? extras.caution,
  };
}

function normalizeBackendHistory(raw: any): HistorySummary {
  const riskScore = Number(raw?.riskScore ?? 0);
  return {
    historyId: raw?.id,
    id: raw?.id,
    diagnosisId: raw?.diagnosisId,
    status: raw?.status ?? "ANALYZING",
    riskScore,
    issueType: raw?.issueType ?? "ETC",
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    recommendation: toRecommendation(riskScore),
    report: raw?.report ?? null,
  };
}

export async function listHistories(): Promise<HistorySummary[]> {
  try {
    const res = await apiClient.get("/api/histories", {
      params: {
        page: 0,
        size: 50,
        sort: "createdAt,desc",
      },
    });
    const body = res.data;
    const page = body?.data ?? body;
    const items = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
    if (items.length > 0) {
      const normalized = await Promise.all(items.map((h: any) => withExtras(normalizeBackendHistory(h))));
      await writePrimary(normalized);
      return normalized;
    }
  } catch {
    // fallback below
  }

  const items = await readFirstAvailable();
  if (items.length > 0) {
    return Promise.all(
      items.map((h) =>
        withExtras({
          ...h,
          status: (h as any).status ?? "COMPLETED",
          historyId: h.historyId ?? h.id,
          id: h.id ?? h.historyId ?? h.diagnosisId,
        })
      )
    );
  }

  const seed = seedMockIfEmpty();
  await writePrimary(seed);
  return seed;
}

export async function getHistoryDetail(historyId: string | number): Promise<HistoryDetail> {
  try {
    const res = await apiClient.get(`/api/histories/${historyId}`);
    const body = res.data;
    const normalized = normalizeBackendHistory(body?.data ?? body);
    return await withExtras(normalized);
  } catch {
    const all = await listHistories();
    const found = all.find((h) => normalizeId(h) === String(historyId));
    if (found) return found;
    return {
      historyId,
      id: historyId,
      diagnosisId: String(historyId),
      status: "COMPLETED",
      riskScore: 0,
      issueType: "ETC",
      recommendation: "DIY",
      createdAt: new Date().toISOString(),
      imageUris: [],
    };
  }
}

export async function createHistory(input: Omit<HistorySummary, "createdAt"> & { createdAt?: string }): Promise<HistorySummary> {
  const all = await listHistories();
  const newItem: HistorySummary = {
    ...input,
    status: input.status ?? "COMPLETED",
    createdAt: input.createdAt ?? new Date().toISOString(),
    historyId: input.historyId ?? input.id ?? `h-${Date.now()}`,
    id: (input.id ?? input.historyId) as any,
    recommendation: input.recommendation ?? toRecommendation(input.riskScore),
  };

  newItem.id = newItem.id ?? newItem.historyId;

  const merged = [newItem, ...all].reduce<HistorySummary[]>((acc, cur) => {
    const id = normalizeId(cur);
    if (!id) return acc;
    if (acc.some((x) => normalizeId(x) === id)) return acc;
    acc.push(cur);
    return acc;
  }, []);

  await writePrimary(merged);
  await saveHistoryExtras(String(newItem.historyId ?? newItem.id), {
    imageUris: newItem.imageUris ?? [],
    cause: newItem.cause,
    naturalOrHuman: newItem.naturalOrHuman,
    caution: newItem.caution,
  });
  return newItem;
}

export async function deleteHistory(historyId: string | number): Promise<void> {
  try {
    await apiClient.delete("/api/histories", {
      data: { ids: [Number(historyId)] },
    });
  } catch {
    // fallback below
  }

  const all = await listHistories();
  const filtered = all.filter((h) => normalizeId(h) !== String(historyId));
  await writePrimary(filtered);
}
