export type ReportPdfTemplateInput = {
  reportId?: string | number | null;
  diagnosisId?: string | number | null;
  createdAt?: unknown;
  generatedAt?: unknown;

  user?: Record<string, any> | null;
  history?: Record<string, any> | null;
  draft?: Record<string, any> | null;

  beforeImages: string[];
  afterImages: string[];

  diagnosisDate?: unknown;
};

const MAIN_BLUE = "#2563eb";
const DARK = "#0f172a"; // 조금 더 세련된 Ink Slate 색상으로 조정
const TEXT = "#334155";
const MUTED = "#64748b";
const LIGHT = "#f8fafc";
const CARD = "#ffffff";
const BORDER = "#e2e8f0";

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (text.toLowerCase() === "null") return "";
  if (text.toLowerCase() === "undefined") return "";
  return text;
}

function escapeHtml(value: unknown): string {
  return cleanText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");
}

function firstValue(obj: any, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== null && value !== undefined && cleanText(value) !== "") {
      return value;
    }
  }
  return undefined;
}

function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) {
    const [year, month, day] = value;
    if (year && month && day) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return "-";
  }
  const text = cleanText(value);
  if (!text) return "-";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    const date = new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
    if (!Number.isNaN(date.getTime()) && date.getFullYear() > 2000) {
      return date.toISOString().slice(0, 10);
    }
  }
  const date = new Date(text);
  if (!Number.isNaN(date.getTime()) && date.getFullYear() > 2000) {
    return date.toISOString().slice(0, 10);
  }
  return "-";
}

function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatIssueType(value: unknown): string {
  const text = cleanText(value).toUpperCase();
  switch (text) {
    case "CRACK": return "균열";
    case "LEAK": return "누수";
    case "MOLD": return "곰팡이";
    case "PAINT_PEEL":
    case "PEEL": return "박리/벗겨짐";
    case "CORROSION": return "부식";
    case "BULGE": return "들뜸";
    default: return cleanText(value) || "기타";
  }
}

function formatRecommendation(value: unknown): string {
  const text = cleanText(value).toUpperCase();
  if (text === "DIY") return "직접 수리 권장";
  if (text === "PRO" || text === "EXPERT" || text === "PROFESSIONAL") return "전문업체 권장";
  return cleanText(value) || "-";
}

function riskLabel(value: unknown): string {
  const score = Number(value);
  if (!Number.isFinite(score)) return "-";
  if (score >= 80) return "높음";
  if (score >= 50) return "보통";
  return "낮음";
}

function formatWon(value: unknown): string {
  const original = cleanText(value);
  const numericText = original.replace(/,/g, "");
  const number = Number(numericText);
  if (!Number.isFinite(number) || number <= 0) {
    return original || "-";
  }
  return `${Math.round(number).toLocaleString("ko-KR")}원`;
}

function getDiagnosisDate(input: ReportPdfTemplateInput): string {
  const history = input.history || {};
  const candidate =
      input.diagnosisDate ??
      firstValue(history, [
        "diagnosisDate",
        "diagnosedAt",
        "diagnosisCreatedAt",
        "diagnosisCreatedDate",
        "analysisCompletedAt",
        "analyzedAt",
        "createdAt",
        "createdDate",
        "created_at",
        "updatedAt",
      ]) ??
      input.createdAt;
  return formatDate(candidate);
}

function getRepairMethodLabel(value: unknown): string {
  const text = cleanText(value).toUpperCase();
  if (text === "DIY") return "직접 수리";
  if (text === "PRO") return "전문업체 수리";
  return cleanText(value) || "-";
}

function getDiySummary(draft: any): string {
  return (
      cleanText(draft?.diyRepairSummary) ||
      cleanText(draft?.actualWorkSummary) ||
      cleanText(draft?.repairSummary)
  );
}

function getProSummary(draft: any): string {
  return cleanText(draft?.repairSummary) || cleanText(draft?.actualWorkSummary);
}

function infoRow(label: string, value: unknown): string {
  return `
    <div class="info-row">
      <div class="info-label">${escapeHtml(label)}</div>
      <div class="info-value">${escapeHtml(cleanText(value) || "-")}</div>
    </div>
  `;
}

function textBlock(title: string, body: unknown): string {
  const text = cleanText(body);
  if (!text) return "";
  return `
    <div class="text-block">
      <div class="text-block-title">${escapeHtml(title)}</div>
      <div class="text-block-body">${escapeHtml(text)}</div>
    </div>
  `;
}

// 비포&애프터를 좌우 혹은 컴팩트하게 매핑하기 위한 빌더 함수 변경
function buildImageSections(beforeImages: string[], afterImages: string[]): string {
  const cleanBefores = Array.from(new Set((beforeImages || []).filter(Boolean)));
  const cleanAfters = Array.from(new Set((afterImages || []).filter(Boolean)));
  const maxImages = Math.max(cleanBefores.length, cleanAfters.length);

  if (maxImages === 0) {
    return `<div class="empty-box">첨부된 전·후 사진이 없습니다.</div>`;
  }

  let rowsHtml = "";
  for (let i = 0; i < Math.min(maxImages, 2); i++) { // 최대 2개 세트만 공간 보장 파괴 방지용
    const beforeSrc = cleanBefores[i];
    const afterSrc = cleanAfters[i];

    rowsHtml += `
      <div class="image-compare-row">
        <div class="photo-card">
          ${beforeSrc ? `<img src="${beforeSrc}" />` : `<div class="no-img">미첨부</div>`}
          <figcaption>수리 전 사진 ${i + 1}</figcaption>
        </div>
        <div class="photo-card">
          ${afterSrc ? `<img src="${afterSrc}" />` : `<div class="no-img">미첨부</div>`}
          <figcaption>수리 후 사진 ${i + 1}</figcaption>
        </div>
      </div>
    `;
  }

  return `
    <section class="section avoid-break">
      <div class="section-head">
        <h2>수리 전 · 후 사진 비교</h2>
        <p>현장 진단 당시의 상태와 조치 완료 후의 상태 비교 사진입니다.</p>
      </div>
      <div class="image-compare-container">
        ${rowsHtml}
      </div>
    </section>
  `;
}

export function buildReportPdfHtml(input: ReportPdfTemplateInput): string {
  const history = input.history || {};
  const draft = input.draft || {};
  const user = input.user || {};

  const generatedDate = formatDate(input.generatedAt || input.createdAt) !== "-"
      ? formatDate(input.generatedAt || input.createdAt)
      : today();

  const diagnosisDate = getDiagnosisDate(input);
  const repairMethod = cleanText(draft.repairMethod).toUpperCase();
  const isDiy = repairMethod === "DIY";

  const issueType = firstValue(history, ["issueType", "defectType", "mainIssueType", "type"]) || "-";
  const riskScore = firstValue(history, ["riskScore", "risk", "score", "riskScoreOutOf100"]) || "-";
  const recommendation = firstValue(history, ["recommendation", "recommendedAction", "repairRecommendation"]) || "-";

  const userName = firstValue(user, ["username", "name", "nickname", "loginId"]) || "-";
  const userPhone = firstValue(user, ["phoneNumber", "phone", "tel"]) || "-";
  const userAddress = firstValue(user, ["address", "addressLine", "homeAddress"]) || firstValue(history, ["address", "addressLine"]) || "-";

  const repairRows = isDiy
      ? [
        infoRow("수리 방식", "직접 수리"),
        infoRow("완료일", formatDate(draft.repairDate)),
        infoRow("사용한 자재", draft.diyMaterialsUsed),
        infoRow("자재비", formatWon(draft.diyMaterialCost || draft.materialCost)),
      ].join("")
      : [
        infoRow("수리 방식", getRepairMethodLabel(draft.repairMethod)),
        infoRow("완료일", formatDate(draft.repairDate)),
        infoRow("업체명", draft.contractorName),
        infoRow("업체 연락처", draft.contractorContact),
        infoRow("총 비용", formatWon(draft.totalCost || draft.actualCostKrw)),
      ].join("");

  const summaryBlock = isDiy ? textBlock("실제 작업 요약", getDiySummary(draft)) : textBlock("작업 요약", getProSummary(draft));
  const memoBlock = isDiy ? textBlock("직접 수리 메모", draft.diyWorkMemo) : "";
  const userMemoBlock = textBlock("사용자 메모", draft.notes);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DuckTack 수리 기록 리포트</title>
  <style>
    @page {
      size: A4;
      margin: 28px 32px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: ${TEXT};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
    }
    .page {
      width: 100%;
    }
    
    /* 깔끔한 화이트 테마 헤더 디자인 */
    .hero {
      position: relative;
      border-bottom: 2px solid {DARK};
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      background: #eff6ff;
      color: ${MAIN_BLUE};
      font-size: 11px;
      letter-spacing: 1px;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .hero h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.25;
      font-weight: 800;
      color: ${DARK};
      letter-spacing: -0.5px;
    }
    .hero-meta {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
    }
    .subtitle {
      max-width: 520px;
      margin: 0;
      color: ${MUTED};
      font-size: 13px;
      font-weight: 500;
    }
    .date-chip {
      font-size: 12px;
      color: ${DARK};
      font-weight: 700;
      background: ${LIGHT};
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid {BORDER};
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 18px;
      margin-bottom: 18px;
    }
    .section {
      background: ${CARD};
      border: 1px solid ${BORDER};
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 18px;
    }
    .section.compact { margin-bottom: 0; }
    .section-head {
      margin-bottom: 16px;
      border-bottom: 1px solid {LIGHT};
      padding-bottom: 8px;
    }
    h2 {
      margin: 0 0 4px;
      color: ${DARK};
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    p {
      margin: 0;
      color: ${MUTED};
      font-size: 11.5px;
      font-weight: 500;
    }

    /* 테이블 로우 최적화 */
    .info-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding: 9px 4px;
      gap: 12px;
    }
    .info-row:last-of-type { border-bottom: 0; }
    .info-label {
      width: 100px;
      color: ${MUTED};
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .info-value {
      flex: 1;
      color: ${DARK};
      font-size: 12.5px;
      font-weight: 600;
      word-break: break-word;
    }

    /* 위험도 카드 미니멀리즘 디자인 변경 */
    .risk-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 110px;
      border-radius: 10px;
      background: ${LIGHT};
      border: 1px solid {BORDER};
      margin-top: 8px;
      position: relative;
    }
    .risk-number {
      color: ${MAIN_BLUE};
      font-size: 38px;
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .risk-label {
      margin-top: 4px;
      color: ${TEXT};
      font-size: 13px;
      font-weight: 700;
    }
    .risk-max {
      position: absolute;
      right: 12px;
      bottom: 8px;
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
    }

    .pill-row {
      display: flex;
      gap: 6px;
      margin-top: 14px;
    }
    .pill {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background: ${LIGHT};
      border: 1px solid {BORDER};
      color: ${TEXT};
      font-size: 11px;
      font-weight: 600;
    }

    /* 2페이지 고정 대응 - 비포 애프터 양옆 정렬 나란히 구조 */
    .image-compare-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .image-compare-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .photo-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid {BORDER};
      border-radius: 10px;
      background: ${LIGHT};
    }
    .photo-card img {
      display: block;
      width: 100%;
      height: 180px;
      object-fit: cover;
    }
    .no-img {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 180px;
      background: #f1f5f9;
      color: #94a3b8;
      font-weight: 600;
      font-size: 12px;
    }
    .photo-card figcaption {
      padding: 8px 12px;
      color: ${DARK};
      font-size: 11.5px;
      font-weight: 600;
      background: #ffffff;
      border-top: 1px solid {BORDER};
      text-align: center;
    }

    .empty-box {
      padding: 30px;
      border-radius: 10px;
      background: ${LIGHT};
      border: 1px dashed #cbd5e1;
      color: #94a3b8;
      text-align: center;
      font-weight: 600;
    }

    .text-block {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 8px;
      background: ${LIGHT};
      border: 1px solid {BORDER};
    }
    .text-block-title {
      color: ${MAIN_BLUE};
      font-size: 11.5px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .text-block-body {
      color: ${DARK};
      font-size: 12.5px;
      font-weight: 500;
      word-break: break-word;
    }

    .footer-note {
      margin-top: 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid {BORDER};
      color: ${MUTED};
      font-size: 11px;
      line-height: 1.5;
      font-weight: 500;
    }

    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <!-- PAGE 1: 기본 정보 및 진단 요약 단락 -->
  <div class="page">
    <header class="hero">
      <div class="brand">DDUCKTACK REPORT</div>
      <h1>AI 진단 기반<br />수리 기록 리포트</h1>
      <div class="hero-meta">
        <p class="subtitle">
          진단 결과, 수리 전·후 사진, 사용자 입력 수리 내역을 하나의 PDF 형태로 정리했습니다.
        </p>
        <div class="date-chip">생성일 ${escapeHtml(generatedDate)}</div>
      </div>
    </header>

    <div class="summary-grid">
      <section class="section compact">
        <div class="section-head">
          <h2>진단 요약</h2>
          <p>AI 엔진 진단 및 권장 처리 조치안</p>
        </div>
        ${infoRow("문제 유형", formatIssueType(issueType))}
        ${infoRow("진단일", diagnosisDate)}
        ${infoRow("권장 방향", formatRecommendation(recommendation))}
        <div class="pill-row">
          <span class="pill">기록용 리포트</span>
          <span class="pill">AI 자동 진단</span>
        </div>
      </section>

      <section class="section compact">
        <div class="section-head">
          <h2>위험도 점수</h2>
          <p>종합 분석 결함도 수치</p>
        </div>
        <div class="risk-card">
          <div class="risk-number">${escapeHtml(riskScore)}</div>
          <div class="risk-label">${escapeHtml(riskLabel(riskScore))}</div>
          <div class="risk-max">/ 100</div>
        </div>
      </section>
    </div>

    <section class="section">
      <div class="section-head">
        <h2>사용자 및 위치 정보</h2>
        <p>기록 작성 시점 기준 시스템 데이터 정보</p>
      </div>
      ${infoRow("사용자", userName)}
      ${infoRow("연락처", userPhone)}
      ${infoRow("주소", userAddress)}
    </section>

    <!-- PAGE 2: 조치 사진 대조 및 상세 조치 내역 기록 -->
    <div class="page-break"></div>

    ${buildImageSections(input.beforeImages, input.afterImages)}

    <section class="section avoid-break" style="margin-top: 14px;">
      <div class="section-head">
        <h2>실제 수리 기록 및 내역</h2>
      </div>
      <div style="margin-bottom: 6px;">
        ${repairRows}
      </div>
      ${summaryBlock}
      ${memoBlock}
      ${userMemoBlock}
    </section>

    <div class="footer-note avoid-break">
      본 문서는 사용자가 직접 기록한 앱 입력 정보와 시스템 AI 진단 결과를 정형화하여 보관하는 데이터 증빙용 기록 리포트입니다. 법적 효력을 갖는 감정서 또는 공인 문서가 아님을 인지하시기 바랍니다.
    </div>
  </div>
</body>
</html>`;
}