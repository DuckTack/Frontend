import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./apiClient";

const PENDING_IMAGES_KEY = "pending_images_v1";

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

export async function startDiagnosis(): Promise<{
  historyId: string;
  diagnosisId: string;
  status: string;
}> {
  // 1. 저장된 이미지 가져오기
  const images = await getPendingImages();
  if (images.length === 0) {
    throw new Error("NO_PENDING_IMAGES");
  }

  // 2. FormData 생성
  const formData = new FormData();
  images.forEach((uri, index) => {
    const filename = uri.split("/").pop() || `image-${index + 1}.jpg`;
    const ext = filename.split(".").pop()?.toLowerCase();
    const type = ext === "png" ? "image/png" : "image/jpeg";

    formData.append("files", {
      uri,
      name: filename,
      type,
    } as any);
  });

  // 3. 파일 업로드
  const uploadRes = await apiClient.post("/api/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });

  const uploaded = uploadRes.data?.data ?? uploadRes.data;

  // ⭐ 여기 key 사용해야 함
  const fileKeys = Array.isArray(uploaded)
      ? uploaded.map((item: any) => item?.key).filter(Boolean)
      : [];

  if (fileKeys.length === 0) {
    throw new Error("UPLOAD_KEY_MISSING");
  }

  // 4. 분석 시작
  const analysisRes = await apiClient.post("/api/analysis", {
    imageKeys: fileKeys,
  });

  const result = analysisRes.data?.data ?? analysisRes.data;

  // 5. 이미지 목록 삭제
  await clearPendingImages();

  return {
    historyId: String(result?.historyId),
    diagnosisId: String(result?.diagnosisId),
    status: String(result?.status ?? "ANALYZING"),
  };
}