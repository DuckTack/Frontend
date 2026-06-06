import type { Me } from "../api/users";
import type { HistoryDetail } from "../api/histories";
import type { ReportDraft } from "../store/reportDraftStorage";

export type ReportPdfTemplateInput = {
  reportId?: string | number | null;
  diagnosisId?: string | number | null;
  createdAt?: unknown;
  generatedAt?: unknown;
  diagnosisDate?: unknown;
  user?: Me | null;
  history?: HistoryDetail | null;
  draft?: ReportDraft | null;
  beforeImages: string[];
  afterImages: string[];
};

const MAIN_BLUE = "#2563eb";
const DARK = "#0f172a";
const TEXT = "#334155";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BG = "#f8fafc";
const SOFT_BLUE = "#eff6ff";

function valueOf(obj: any, keys: string[]): unknown {
  if (!obj) return undefined;

  for (const key of keys) {
    const value = obj[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return undefined;
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();

  if (!text) return "";
  if (text.toLowerCase() === "null") return "";
  if (text.toLowerCase() === "undefined") return "";

  return text;
}

function escapeHtml(value: unknown): string {
  const text = cleanText(value);

  return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");
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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function fmtIssue(type: unknown): string {
  const value = cleanText(type).toUpperCase();

  switch (value) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    case "PEEL":
    case "PAINT_PEEL":
      return "박리";
    case "CORROSION":
      return "부식";
    case "BULGE":
      return "들뜸";
    default:
      return "기타";
  }
}

function fmtRecommendation(value: unknown): string {
  const text = cleanText(value).toUpperCase();

  if (text === "DIY") return "직접 수리 권장";
  if (text === "PRO" || text === "EXPERT" || text === "PROFESSIONAL") {
    return "전문업체 권장";
  }

  return cleanText(value) || "-";
}

function riskLabel(score: unknown): string {
  const n = Number(score);

  if (!Number.isFinite(n)) return "-";
  if (n >= 80) return "높음";
  if (n >= 50) return "보통";

  return "낮음";
}

function riskToneClass(score: unknown): string {
  const n = Number(score);

  if (!Number.isFinite(n)) return "risk-low";
  if (n >= 80) return "risk-high";
  if (n >= 50) return "risk-mid";
  return "risk-low";
}

function formatWon(value: unknown): string {
  const original = cleanText(value);
  const text = original.replace(/,/g, "");
  const n = Number(text);

  if (!Number.isFinite(n) || n <= 0) {
    return original || "-";
  }

  return `${Math.round(n).toLocaleString("ko-KR")}원`;
}

function getDiagnosisDate(input: ReportPdfTemplateInput): string {
  const h: any = input.history;

  const candidate =
      input.diagnosisDate ??
      valueOf(h, [
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

function repairMethodLabel(value: unknown): string {
  const text = cleanText(value).toUpperCase();

  if (text === "DIY") return "직접 수리";
  if (text === "PRO") return "전문업체 수리";

  return cleanText(value) || "-";
}

function getActiveSummary(draft: any): string {
  if (cleanText(draft?.repairMethod).toUpperCase() === "DIY") {
    return (
        cleanText(draft?.diyRepairSummary) ||
        cleanText(draft?.actualWorkSummary) ||
        cleanText(draft?.repairSummary)
    );
  }

  return cleanText(draft?.repairSummary) || cleanText(draft?.actualWorkSummary);
}

function uniqueImages(uris: string[]): string[] {
  return Array.from(new Set((uris || []).filter(Boolean)));
}

function infoRow(label: string, value: unknown): string {
  return `
    <div class="info-row">
      <div class="info-label">${escapeHtml(label)}</div>
      <div class="info-value">${escapeHtml(cleanText(value) || "-")}</div>
    </div>
  `;
}

function detailBlock(title: string, body: unknown): string {
  const text = cleanText(body);

  if (!text) return "";

  return `
    <div class="text-block">
      <div class="text-block-title">${escapeHtml(title)}</div>
      <div class="text-block-body">${escapeHtml(text)}</div>
    </div>
  `;
}

function photoSlot(type: "before" | "after", src: string | undefined, index: number): string {
  const label = type === "before" ? "수리 전" : "수리 후";
  const badge = type === "before" ? "BEFORE" : "AFTER";

  return `
    <figure class="photo-card ${type}">
      <div class="photo-topline">
        <span class="photo-badge">${badge}</span>
        <span class="photo-index">${index + 1}</span>
      </div>
      ${
      src
          ? `<img src="${escapeHtml(src)}" />`
          : `<div class="no-img">미첨부</div>`
  }
      <figcaption>${escapeHtml(label)} 사진 ${index + 1}</figcaption>
    </figure>
  `;
}

function buildImageCompare(beforeImages: string[], afterImages: string[]): string {
  const before = uniqueImages(beforeImages);
  const after = uniqueImages(afterImages);
  const maxCount = Math.max(before.length, after.length);

  if (maxCount === 0) {
    return `
      <section class="section avoid-break image-section">
        <div class="section-head">
          <div>
            <h2>수리 전 · 후 사진 비교</h2>
            <p>현장 진단 당시의 상태와 조치 완료 후의 상태 비교 사진입니다.</p>
          </div>
        </div>
        <div class="empty">첨부된 전·후 사진이 없습니다.</div>
      </section>
    `;
  }

  const rows = Array.from({ length: maxCount })
      .map(
          (_, index) => `
        <div class="compare-row">
          ${photoSlot("before", before[index], index)}
          ${photoSlot("after", after[index], index)}
        </div>
      `,
      )
      .join("");

  return `
    <section class="section avoid-break image-section">
      <div class="section-head inline-head">
        <div>
          <h2>수리 전 · 후 사진 비교</h2>
          <p>진단 당시 사진과 수리 완료 후 사진을 나란히 배치했습니다.</p>
        </div>
        <div class="section-chip">BEFORE / AFTER</div>
      </div>
      <div class="compare-grid">
        ${rows}
      </div>
    </section>
  `;
}

export function buildReportPdfHtml(input: ReportPdfTemplateInput): string {
  const history: any = input.history ?? {};
  const draft: any = input.draft ?? {};
  const user: any = input.user ?? {};

  const generatedDate =
      formatDate(input.generatedAt || input.createdAt) !== "-"
          ? formatDate(input.generatedAt || input.createdAt)
          : today();

  const diagnosisDate = getDiagnosisDate(input);
  const repairMethod = cleanText(draft.repairMethod).toUpperCase();
  const isDiy = repairMethod === "DIY";
  const issueType = valueOf(history, ["issueType", "defectType", "mainIssueType", "type"]);
  const riskScore = valueOf(history, ["riskScore", "risk", "score", "riskScoreOutOf100"]);
  const recommendation = valueOf(history, ["recommendation", "recommendedAction", "repairRecommendation"]);

  const userName = valueOf(user, ["username", "name", "nickname", "loginId"]);
  const userPhone = valueOf(user, ["phoneNumber", "phone", "tel"]);
  const userAddress =
      valueOf(user, ["address", "addressLine", "homeAddress"]) ||
      valueOf(history, ["address", "addressLine"]);

  const totalCost = isDiy
      ? draft.diyMaterialCost || draft.materialCost
      : draft.totalCost || draft.actualCostKrw;

  const repairRows = isDiy
      ? [
        infoRow("수리 방식", "직접 수리"),
        infoRow("완료일", formatDate(draft.repairDate)),
        infoRow("사용한 자재", draft.diyMaterialsUsed),
        infoRow("자재비", formatWon(totalCost)),
      ].join("")
      : [
        infoRow("수리 방식", repairMethodLabel(draft.repairMethod)),
        infoRow("완료일", formatDate(draft.repairDate)),
        infoRow("업체명", draft.contractorName),
        infoRow("업체 연락처", draft.contractorContact),
        infoRow("총 비용", formatWon(totalCost)),
      ].join("");

  const summaryBlock = detailBlock(
      isDiy ? "실제 작업 요약" : "작업 요약",
      getActiveSummary(draft),
  );

  const memoBlock = isDiy ? detailBlock("직접 수리 메모", draft.diyWorkMemo) : "";
  const userMemoBlock = detailBlock("사용자 메모", draft.notes);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DuckTack 수리 기록 리포트</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 28px 32px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: ${TEXT};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", Arial, sans-serif;
      font-size: 12.5px;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 100%;
    }

    .hero {
      position: relative;
      padding: 0 0 22px;
      margin-bottom: 22px;
      border-bottom: 2px solid ${DARK};
    }

    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .brand {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 7px;
      background: ${SOFT_BLUE};
      color: ${MAIN_BLUE};
      font-size: 10.5px;
      letter-spacing: 1.4px;
      font-weight: 900;
    }

    .doc-type {
      color: ${MUTED};
      font-size: 11px;
      font-weight: 800;
    }

    .hero h1 {
      margin: 0;
      color: ${DARK};
      font-size: 30px;
      line-height: 1.23;
      font-weight: 900;
      letter-spacing: -0.8px;
    }

    .hero-bottom {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: end;
      margin-top: 12px;
    }

    .subtitle {
      margin: 0;
      max-width: 520px;
      color: ${MUTED};
      font-size: 12px;
      font-weight: 600;
    }

    .date-chip {
      display: inline-block;
      border: 1px solid ${BORDER};
      border-radius: 8px;
      background: ${BG};
      color: ${DARK};
      padding: 7px 12px;
      font-size: 11.5px;
      font-weight: 900;
      white-space: nowrap;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1.18fr 0.82fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .section {
      background: #ffffff;
      border: 1px solid ${BORDER};
      border-radius: 14px;
      padding: 18px;
      margin-bottom: 16px;
    }

    .section.compact {
      margin-bottom: 0;
      padding: 17px;
    }

    .section-head {
      padding-bottom: 9px;
      margin-bottom: 9px;
      border-bottom: 1px solid #f1f5f9;
    }

    .inline-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    h2 {
      margin: 0 0 3px;
      color: ${DARK};
      font-size: 16.5px;
      font-weight: 900;
      letter-spacing: -0.2px;
    }

    p {
      margin: 0;
      color: ${MUTED};
      font-size: 11px;
      font-weight: 600;
    }

    .section-chip {
      display: inline-block;
      padding: 5px 9px;
      border-radius: 999px;
      background: ${SOFT_BLUE};
      color: ${MAIN_BLUE};
      font-size: 10px;
      font-weight: 900;
      white-space: nowrap;
    }

    .info-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding: 8.5px 2px;
      gap: 12px;
    }

    .info-row:last-of-type {
      border-bottom: 0;
    }

    .info-label {
      width: 96px;
      color: ${MUTED};
      font-size: 11.5px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .info-value {
      flex: 1;
      color: ${DARK};
      font-size: 12px;
      font-weight: 800;
      text-align: right;
      word-break: break-word;
    }

    .risk-card {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 118px;
      border-radius: 12px;
      background: ${BG};
      border: 1px solid ${BORDER};
      position: relative;
      margin-top: 8px;
    }

    .risk-number {
      color: ${MAIN_BLUE};
      font-size: 39px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: -0.6px;
    }

    .risk-label {
      margin-top: 5px;
      font-size: 13px;
      font-weight: 900;
    }

    .risk-high .risk-label { color: #dc2626; }
    .risk-mid .risk-label { color: #f97316; }
    .risk-low .risk-label { color: #16a34a; }

    .risk-max {
      position: absolute;
      right: 12px;
      bottom: 8px;
      color: #94a3b8;
      font-size: 10.5px;
      font-weight: 900;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 12px;
    }

    .pill {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 7px;
      background: ${BG};
      border: 1px solid ${BORDER};
      color: ${TEXT};
      font-size: 10.5px;
      font-weight: 900;
    }

    .image-section {
      margin-top: 2px;
    }

    .compare-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .compare-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .photo-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid ${BORDER};
      border-radius: 12px;
      background: ${BG};
      page-break-inside: avoid;
      position: relative;
    }

    .photo-topline {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background: #ffffff;
      border-bottom: 1px solid ${BORDER};
    }

    .photo-badge {
      color: ${MAIN_BLUE};
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 0.6px;
    }

    .photo-index {
      color: ${MUTED};
      font-size: 10px;
      font-weight: 900;
    }

    .photo-card img,
    .no-img {
      display: block;
      width: 100%;
      height: 178px;
      object-fit: cover;
      background: #f1f5f9;
    }

    .no-img {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 800;
    }

    .photo-card figcaption {
      padding: 8px 10px;
      color: ${DARK};
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      background: #ffffff;
      border-top: 1px solid ${BORDER};
    }

    .empty {
      margin-top: 10px;
      padding: 28px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      background: ${BG};
      color: #94a3b8;
      text-align: center;
      font-weight: 800;
    }

    .repair-section {
      margin-top: 14px;
    }

    .text-block {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      background: ${BG};
      border: 1px solid ${BORDER};
    }

    .text-block-title {
      margin-bottom: 5px;
      color: ${MAIN_BLUE};
      font-size: 11px;
      font-weight: 900;
    }

    .text-block-body {
      color: ${DARK};
      font-size: 12px;
      font-weight: 600;
      word-break: break-word;
      white-space: normal;
    }

    .footer-note {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      background: ${BG};
      border: 1px solid ${BORDER};
      color: ${MUTED};
      font-size: 10.5px;
      line-height: 1.5;
      font-weight: 600;
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
  <main class="page">
    <header class="hero">
      <div class="brand-row">
        <div class="brand">DDUCKTACK REPORT</div>
        <div class="doc-type">AI DIAGNOSIS · REPAIR RECORD</div>
      </div>
      <h1>AI 진단 기반<br />수리 기록 리포트</h1>
      <div class="hero-bottom">
        <p class="subtitle">진단 결과, 수리 전·후 사진, 사용자 입력 수리 내역을 하나의 기록용 문서로 정리했습니다.</p>
        <div class="date-chip">생성일 ${escapeHtml(generatedDate)}</div>
      </div>
    </header>

    <div class="summary-grid">
      <section class="section compact">
        <div class="section-head">
          <h2>진단 요약</h2>
          <p>AI 진단 결과와 수리 권장 방향입니다.</p>
        </div>
        ${infoRow("문제 유형", fmtIssue(issueType))}
        ${infoRow("진단일", diagnosisDate)}
        ${infoRow("권장 방향", fmtRecommendation(recommendation))}
        <div class="pill-row">
          <span class="pill">기록용 리포트</span>
          <span class="pill">AI 자동 진단</span>
        </div>
      </section>

      <section class="section compact">
        <div class="section-head">
          <h2>위험도 점수</h2>
          <p>종합 분석 기준 위험도입니다.</p>
        </div>
        <div class="risk-card ${riskToneClass(riskScore)}">
          <div class="risk-number">${escapeHtml(riskScore ?? "-")}</div>
          <div class="risk-label">${escapeHtml(riskLabel(riskScore))}</div>
          <div class="risk-max">/ 100</div>
        </div>
      </section>
    </div>

    <section class="section avoid-break">
      <div class="section-head">
        <h2>사용자 및 위치 정보</h2>
        <p>회원 정보와 주소는 리포트 작성 당시 앱에 저장된 값 기준입니다.</p>
      </div>
      ${infoRow("사용자", userName)}
      ${infoRow("연락처", userPhone)}
      ${infoRow("주소", userAddress)}
    </section>

    <div class="page-break"></div>

    ${buildImageCompare(input.beforeImages || [], input.afterImages || [])}

    <section class="section avoid-break repair-section">
      <div class="section-head">
        <h2>실제 수리 기록 및 내역</h2>
        <p>사용자가 앱에서 입력한 수리 완료 후 기록입니다.</p>
      </div>
      ${repairRows}
      ${summaryBlock}
      ${memoBlock}
      ${userMemoBlock}
    </section>

    <div class="footer-note avoid-break">
      이 문서는 사용자의 앱 입력값과 AI 진단 결과를 정리한 기록용 리포트이며, 법적 감정서 또는 공식 보증 문서가 아닙니다.
    </div>
  </main>
</body>
</html>`;
}
