import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";

const PENDING_IMAGES_KEY = "pending_images_v1";
const LAST_DIAGNOSIS_KEY = "last_diagnosis_result_v2";

// ─── 타입 정의 ────────────────────────────────────────────────
export type DiagnosisStep = {
  order: number;
  title: string;
  description: string;
  warning?: string | null;
};

export type DiagnosisProduct = {
  name: string;
  category: string;
  search_keyword: string;
  reason: string;
  quantity: number;
  estimated_price: number;
};

export type DiagnosisApiResult = {
  diagnosisId: number;
  imageUrl: string;
  issueType: string;
  mainDefect: string;
  riskScore: number;
  riskScore100: number;
  riskLevel: string;
  detectionCount: number;
  guide: {
    guide: {
      title: string;
      summary: string;
      difficulty: string;
      steps: DiagnosisStep[];
      warnings: string[];
      estimated_time_min: number;
      next_action: "DIY_OK" | "RECALL_IN_24H" | "CALL_PRO";
    };
    products: DiagnosisProduct[];
  };
  guideFallback: boolean;
};

// ─── 이미지 임시 저장 ─────────────────────────────────────────
export async function setPendingImages(uris: string[]) {
  await AsyncStorage.setItem(PENDING_IMAGES_KEY, JSON.stringify(uris));
}

export async function getPendingImages(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PENDING_IMAGES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export async function clearPendingImages() {
  await AsyncStorage.removeItem(PENDING_IMAGES_KEY);
}

// ─── 진단 결과 캐시 ───────────────────────────────────────────
export async function getLastDiagnosisResult(): Promise<DiagnosisApiResult | null> {
  const raw = await AsyncStorage.getItem(LAST_DIAGNOSIS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── 메인: 진단 시작 (/api/diagnosis 호출) ────────────────────
export async function startDiagnosis(preferDiy = false): Promise<{
  diagnosisId: string;
}> {
  const images = await getPendingImages();
  if (images.length === 0) throw new Error("NO_PENDING_IMAGES");

  // 첫 번째 이미지 사용 (새 엔드포인트는 이미지 1장)
  const uri = images[0];
  const filename = uri.split("/").pop() || "image.jpg";
  const ext = filename.split(".").pop()?.toLowerCase();
  const type = ext === "png" ? "image/png" : "image/jpeg";

  const formData = new FormData();
  formData.append("image", { uri, name: filename, type } as any);

  const url = preferDiy ? "/api/diagnosis?preferDiy=true" : "/api/diagnosis";

  const res = await apiClient.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000, // YOLO + LLM 합산 최대 90초
  });

  const data: DiagnosisApiResult = res.data?.data ?? res.data;

  // 결과를 AsyncStorage에 캐싱
  await AsyncStorage.setItem(LAST_DIAGNOSIS_KEY, JSON.stringify(data));
  await clearPendingImages();

  return { diagnosisId: String(data.diagnosisId) };
}
