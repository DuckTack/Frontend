import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";
import { createHistory, IssueType, Recommendation, saveHistoryExtras } from "./histories";
import { ensureReportForHistory } from "./reports";

const PENDING_IMAGES_KEY = "pending_images_v1";

export async function setPendingImages(uris: string[]) {
  await AsyncStorage.setItem(PENDING_IMAGES_KEY, JSON.stringify(uris));
}

export async function getPendingImages(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PENDING_IMAGES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function clearPendingImages() {
  await AsyncStorage.removeItem(PENDING_IMAGES_KEY);
}

function createFilePart(uri: string, index: number) {
  const filename = uri.split("/").pop() || `image_${index + 1}.jpg`;
  const lower = filename.toLowerCase();
  const type = lower.endsWith(".png") ? "image/png" : lower.endsWith(".heic") ? "image/heic" : "image/jpeg";
  return { uri, name: filename, type } as any;
}

export async function startDiagnosis(): Promise<{ historyId: string }> {
  const images = await getPendingImages();

  try {
    if (images.length === 0) {
      throw new Error("NO_IMAGES");
    }

    const form = new FormData();
    images.forEach((uri, index) => {
      form.append("files", createFilePart(uri, index));
    });

    const uploadRes = await apiClient.post("/api/files/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 30000,
    });
    const uploadBody = uploadRes.data;
    const uploaded = uploadBody?.data ?? uploadBody;
    const imageKeys: string[] = Array.isArray(uploaded) ? uploaded.map((item: any) => item?.key).filter(Boolean) : [];

    const analysisRes = await apiClient.post("/api/analysis", { imageKeys }, { timeout: 30000 });
    const analysisBody = analysisRes.data;
    const started = analysisBody?.data ?? analysisBody;
    const historyId = String(started?.historyId);
    const diagnosisId = String(started?.diagnosisId ?? historyId);

    await saveHistoryExtras(historyId, {
      imageUris: images,
      cause: "AI 분석 결과를 불러오는 중입니다.",
      naturalOrHuman: "분석 중",
      caution: "분석 완료 후 상세 결과를 확인해주세요.",
    });

    await createHistory({
      historyId,
      id: historyId,
      diagnosisId,
      status: "ANALYZING",
      riskScore: 0,
      issueType: "ETC",
      recommendation: "DIY",
      createdAt: new Date().toISOString(),
      imageUris: images,
      cause: "AI 분석 결과를 불러오는 중입니다.",
      naturalOrHuman: "분석 중",
      caution: "분석 완료 후 상세 결과를 확인해주세요.",
    });

    await ensureReportForHistory(historyId, {
      createdAt: new Date().toISOString(),
      issueType: "ETC",
      riskScore: 0,
      recommendation: "DIY",
      diagnosisImageUris: images,
    });

    await clearPendingImages();
    return { historyId };
  } catch {
    const issueType: IssueType = images.length > 0 ? "MOLD" : "ETC";
    const riskScore = images.length > 0 ? 78 : 40;
    const recommendation: Recommendation = riskScore >= 70 ? "PRO" : "DIY";

    const created = await createHistory({
      status: "COMPLETED",
      createdAt: new Date().toISOString().slice(0, 10),
      issueType,
      riskScore,
      recommendation,
      imageUris: images,
      cause: issueType === "MOLD" ? "환기 부족으로 인한 곰팡이 가능성이 높아요." : "추가 분석이 필요해요.",
      naturalOrHuman: "자연(환경) 요인 가능성 ↑",
      caution: "호흡기 민감하면 마스크 착용 권장. 표면만 닦고 끝내지 말고 원인 제거가 중요해요.",
    });
    const historyId = String((created as any).historyId ?? (created as any).id);
    await ensureReportForHistory(historyId, {
      createdAt: created.createdAt,
      issueType: created.issueType,
      riskScore: created.riskScore,
      recommendation: created.recommendation,
      diagnosisImageUris: images,
    });
    await clearPendingImages();
    return { historyId };
  }
}
