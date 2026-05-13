import type { Me } from "../api/users";
import type { HistoryDetail } from "../api/histories";
import type { ReportDraft } from "../store/reportDraftStorage";

export type ReportPdfTemplateInput = {
  reportId: string;
  diagnosisId: string;
  createdAt?: string;
  user: Me | null;
  history: HistoryDetail;
  draft: ReportDraft;
  beforeImages: string[];
  afterImages: string[];
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

function issueLabel(value: HistoryDetail["issueType"]): string {
  switch (value) {
    case "CRACK": return "균열";
    case "LEAK": return "누수";
    case "MOLD": return "곰팡이";
    case "DAMAGE": return "파손";
    case "ELECTRIC": return "전기";
    case "GAS": return "가스";
    default: return "기타";
  }
}

function recommendationLabel(value: HistoryDetail["recommendation"]): string {
  return value === "DIY" ? "DIY 권장" : "전문업체 권장";
}

function repairMethodLabel(value: ReportDraft["repairMethod"]): string {
  if (value === "DIY") return "직접 수리";
  if (value === "PRO") return "전문업체 수리";
  return "미입력";
}

function riskLevel(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "높음", className: "danger" };
  if (score >= 40) return { label: "주의", className: "warn" };
  return { label: "낮음", className: "safe" };
}

function money(value: string | number | null | undefined): string {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return "-";
  return `${numberValue.toLocaleString("ko-KR")}원`;
}

function imageGrid(title: string, subtitle: string, images: string[]): string {
  const body = images.length === 0
    ? `<div class="empty-image">첨부된 이미지가 없습니다.</div>`
    : `<div class="image-grid">${images.map((src, index) => `
        <figure class="image-card">
          <img src="${escapeHtml(src)}" />
          <figcaption>${escapeHtml(title)} ${index + 1}</figcaption>
        </figure>
      `).join("")}</div>`;

  return `
    <section class="section">
      <div class="section-title-row">
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      ${body}
    </section>
  `;
}

export function buildReportPdfHtml(input: ReportPdfTemplateInput): string {
  const { reportId, diagnosisId, createdAt, user, history, draft, beforeImages, afterImages } = input;
  const riskScore = Number(history.riskScore ?? 0);
  const level = riskLevel(riskScore);
  const isDiy = draft.repairMethod === "DIY";
  const isPro = draft.repairMethod === "PRO";
  const generatedAt = new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { size: A4; margin: 22mm 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
      font-size: 13px;
      line-height: 1.55;
    }
    .cover {
      padding: 28px;
      border-radius: 28px;
      background: linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%);
      color: #fff;
      margin-bottom: 22px;
    }
    .cover-kicker { font-size: 12px; font-weight: 800; letter-spacing: 0.16em; opacity: 0.86; }
    .cover h1 { margin: 8px 0 12px; font-size: 32px; line-height: 1.15; }
    .cover p { margin: 0; color: rgba(255,255,255,0.88); }
    .cover-meta { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
    .cover-chip {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.16);
      font-size: 12px;
      font-weight: 800;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .section {
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 22px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .section h2 { margin: 0 0 4px; font-size: 18px; }
    .section p { margin: 0; color: #64748b; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .info-table th, .info-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: top; }
    .info-table th { width: 34%; color: #64748b; font-weight: 800; }
    .info-table td { color: #0f172a; font-weight: 650; }
    .risk-card {
      margin-top: 14px;
      padding: 18px;
      border-radius: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .risk-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
    .risk-score { font-size: 38px; line-height: 1; font-weight: 950; }
    .risk-label { padding: 7px 12px; border-radius: 999px; font-weight: 900; }
    .danger { color: #dc2626; background: #fef2f2; }
    .warn { color: #ea580c; background: #fff7ed; }
    .safe { color: #16a34a; background: #f0fdf4; }
    .bar { overflow: hidden; height: 10px; margin-top: 14px; background: #e2e8f0; border-radius: 999px; }
    .bar-fill { height: 100%; width: ${Math.min(100, Math.max(0, riskScore))}%; background: #3b82f6; border-radius: 999px; }
    .summary-box { margin-top: 12px; padding: 14px; border-radius: 16px; background: #eff6ff; color: #1e40af; font-weight: 700; }
    .image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .image-card { margin: 0; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; background: #f8fafc; }
    .image-card img { display: block; width: 100%; height: 180px; object-fit: cover; }
    .image-card figcaption { padding: 8px 10px; color: #475569; font-size: 11px; font-weight: 800; }
    .empty-image { margin-top: 12px; padding: 16px; border-radius: 16px; background: #f8fafc; color: #94a3b8; text-align: center; font-weight: 700; }
    .memo { margin-top: 12px; padding: 14px; white-space: pre-wrap; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; }
  </style>
</head>
<body>
  <header class="cover">
    <div class="cover-kicker">DDUCKTACK REPORT</div>
    <h1>AI 진단 기반<br/>수리 기록 리포트</h1>
    <p>진단 결과, 수리 전/후 사진, 사용자 입력 수리 내역을 하나의 PDF로 정리했습니다.</p>
    <div class="cover-meta">
      <span class="cover-chip">리포트 ID ${escapeHtml(reportId)}</span>
      <span class="cover-chip">진단 ID ${escapeHtml(diagnosisId || "-")}</span>
      <span class="cover-chip">생성일 ${generatedAt}</span>
    </div>
  </header>

  <section class="section">
    <h2>진단 요약</h2>
    <p>AI 진단 결과와 수리 권장 방향입니다.</p>
    <div class="grid">
      <table class="info-table">
        <tr><th>문제 유형</th><td>${escapeHtml(issueLabel(history.issueType))}</td></tr>
        <tr><th>진단일</th><td>${escapeHtml(formatDate(createdAt ?? history.createdAt))}</td></tr>
        <tr><th>권장 방향</th><td>${escapeHtml(recommendationLabel(history.recommendation))}</td></tr>
      </table>
      <div class="risk-card">
        <div class="risk-row">
          <div>
            <div class="risk-score">${riskScore}<span style="font-size:16px;">/100</span></div>
            <div style="color:#64748b; font-weight:800; margin-top:4px;">위험도 점수</div>
          </div>
          <span class="risk-label ${level.className}">${escapeHtml(level.label)}</span>
        </div>
        <div class="bar"><div class="bar-fill"></div></div>
      </div>
    </div>
    <div class="summary-box">
      ${escapeHtml(history.cause || history.caution || "진단 사진과 수리 기록을 바탕으로 문제 상황을 보관하기 위한 리포트입니다.")}
    </div>
  </section>

  <section class="section">
    <h2>사용자 및 위치 정보</h2>
    <p>회원 정보와 주소는 리포트 작성 당시 앱에 저장된 값 기준입니다.</p>
    <table class="info-table">
      <tr><th>사용자</th><td>${escapeHtml(user?.username || "-")}</td></tr>
      <tr><th>연락처</th><td>${escapeHtml(user?.phoneNumber || "-")}</td></tr>
      <tr><th>주소</th><td>${escapeHtml(user?.address || "-")}</td></tr>
    </table>
  </section>

  ${imageGrid("수리 전 사진", "진단 당시 사진이 자동 포함되며, 사용자가 추가한 수리 전 사진도 함께 표시됩니다.", beforeImages)}
  ${imageGrid("수리 후 사진", "수리 완료 후 사용자가 첨부한 사진입니다.", afterImages)}

  <section class="section">
    <h2>수리 기록</h2>
    <p>사용자가 입력한 실제 수리 내역입니다.</p>
    <table class="info-table">
      <tr><th>수리 방식</th><td>${escapeHtml(repairMethodLabel(draft.repairMethod))}</td></tr>
      <tr><th>완료일</th><td>${escapeHtml(draft.repairDate || "-")}</td></tr>
      ${isDiy ? `
        <tr><th>사용 자재</th><td>${escapeHtml(draft.diyMaterialsUsed || "-")}</td></tr>
        <tr><th>자재비</th><td>${escapeHtml(money(draft.diyMaterialCost))}</td></tr>
      ` : ""}
      ${isPro ? `
        <tr><th>업체명</th><td>${escapeHtml(draft.contractorName || "-")}</td></tr>
        <tr><th>업체 연락처</th><td>${escapeHtml(draft.contractorContact || "-")}</td></tr>
        <tr><th>재료비</th><td>${escapeHtml(money(draft.materialCost))}</td></tr>
        <tr><th>인건비</th><td>${escapeHtml(money(draft.laborCost))}</td></tr>
        <tr><th>총 비용</th><td>${escapeHtml(money(draft.totalCost))}</td></tr>
      ` : ""}
    </table>
    <div class="memo"><b>작업 요약</b><br/>${escapeHtml(draft.repairSummary || "-")}</div>
    <div class="memo"><b>메모</b><br/>${escapeHtml(draft.notes || draft.diyWorkMemo || "-")}</div>
  </section>

  <div class="footer">
    이 문서는 사용자의 앱 입력값과 AI 진단 결과를 정리한 기록용 리포트이며, 법적 감정서 또는 공식 보증 문서가 아닙니다.
  </div>
</body>
</html>`;
}
