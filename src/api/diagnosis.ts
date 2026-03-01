import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HistoryDetail, IssueType, Recommendation } from "./histories";
import { createHistory } from "./histories";
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

/* 현재는 mock 분석(Backend1 오면 실제 업로드/분석 API로 교체)
 - 반환값은 historyId
 - 동시에 히스토리 저장(createHistory)까지 수행해서, result 화면이 id 기반으로 조회 가능 */
/**
 * 진단 시작
 *
 * Backend1 연동 포인트(권장)
 * - POST /api/diagnoses
 *   - req: multipart/form-data(images[])
 *   - res: { historyId, diagnosisId, issueType, riskScore, recommendation, ... }
 * - 이후 historyId로 GET /api/histories/{id} 조회 가능
 *
 * 현재 구현은 "로컬 mock"이며, 결과를 AsyncStorage 히스토리에 저장하고
 * 동시에 리포트 초안을 ensureReportForHistory로 생성합니다.
 */
export async function startDiagnosis(): Promise<{ historyId: string }> {
  // TODO(Backend1): 서버에 이미지 업로드 → 분석 결과 받기
  const images = await getPendingImages();
  if (images.length === 0) {
    // 이미지 없이도 흐름이 깨지지 않도록 기본값
  }

  // 아주 단순한 mock rule: 이미지가 있으면 곰팡이, 없으면 기타
  const issueType: IssueType = images.length > 0 ? "MOLD" : "ETC";
  const riskScore = images.length > 0 ? 78 : 40;
  const recommendation: Recommendation = riskScore >= 70 ? "DIY" : "DIY";

  const detail: Omit<HistoryDetail, "id"> = {
    status: "COMPLETED",
    createdAt: new Date().toISOString().slice(0, 10),
    issueType,
    riskScore,
    recommendation,
    imageUris: images,
    cause: issueType === "MOLD" ? "환기 부족으로 인한 곰팡이 가능성이 높아요." : "추가 분석이 필요해요.",
    naturalOrHuman: "자연(환경) 요인 가능성 ↑",
    caution: "호흡기 민감하면 마스크 착용 권장. 표면만 닦고 끝내지 말고 원인 제거가 중요해요.",
  };

  const created = await createHistory(detail);
  const historyId = String((created as any).historyId ?? (created as any).id);
  // 진단이 끝나면 리포트 '초안'을 자동으로 만들어둠(상태: GENERATING)
  await ensureReportForHistory(historyId, {
    createdAt: detail.createdAt,
    issueType: detail.issueType,
    riskScore: detail.riskScore,
    recommendation: detail.recommendation,
    diagnosisImageUris: images,
  });
  await clearPendingImages();
  return { historyId };
}
