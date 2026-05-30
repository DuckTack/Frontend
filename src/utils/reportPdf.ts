import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";

import { buildReportPdfHtml, type ReportPdfTemplateInput } from "./reportPdfTemplate";

export type CreatedReportPdf = {
  uri: string;
  numberOfPages?: number;
};

function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".heic") || lower.includes(".heif")) return "image/heic";
  return "image/jpeg";
}

function isLocalImageUri(uri: string): boolean {
  return (
      uri.startsWith("file://") ||
      uri.startsWith("content://") ||
      uri.startsWith("asset://") ||
      uri.startsWith("ph://")
  );
}

async function toPrintableImageSrc(uri: string): Promise<string> {
  if (isLocalImageUri(uri)) {
    // 로컬 파일 → base64 변환
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${guessMimeType(uri)};base64,${base64}`;
  }

  // 원격 URL → 다운로드 후 base64 변환
  // expo-print가 원격 이미지를 못 불러오는 경우 대응
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const localUri =
        FileSystem.cacheDirectory +
        "report_img_" +
        Date.now() +
        "_" +
        Math.random().toString(36).slice(2) +
        ".jpg";

    const downloadResult = await FileSystem.downloadAsync(uri, localUri);

    if (downloadResult.status === 200) {
      const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return `data:${guessMimeType(uri)};base64,${base64}`;
    }
  }

  return uri;
}

async function prepareImages(uris: string[]): Promise<string[]> {
  const unique = Array.from(new Set(uris.filter(Boolean)));
  const converted = await Promise.all(
      unique.map(async (uri) => {
        try {
          return await toPrintableImageSrc(uri);
        } catch (error) {
          console.warn("PDF 이미지 변환 실패:", uri, error);
          return "";
        }
      })
  );
  return converted.filter(Boolean);
}

export async function createDesignedReportPdf(
    input: ReportPdfTemplateInput
): Promise<CreatedReportPdf> {
  const [beforeImages, afterImages] = await Promise.all([
    prepareImages(input.beforeImages),
    prepareImages(input.afterImages),
  ]);

  const html = buildReportPdfHtml({
    ...input,
    beforeImages,
    afterImages,
  });

  const result = await Print.printToFileAsync({ html });
  return {
    uri: result.uri,
    numberOfPages: result.numberOfPages,
  };
}