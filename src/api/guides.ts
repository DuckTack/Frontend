import type { IssueType } from "./histories";

export type DiyMaterial = {
  id: string;
  name: string;
  approxCost?: string;
  reason?: string;
  note?: string;
  buyUrl?: string;
};

export type DiyGuide = {
  title: string;
  steps: string[];
  cautions?: string[];
  materials?: DiyMaterial[];
};

export type ExpertInfo = {
  estimateRange: string;
  vendors: string[];
  notes?: string[];
  whyPro?: string[];
};

function coupangSearchUrl(keyword: string) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
}

export async function getDiyGuide(issueType: IssueType): Promise<DiyGuide> {
  if (issueType === "MOLD") {
    return {
      title: "곰팡이 DIY",
      steps: [
        "환기 + 주변 물기 제거",
        "곰팡이 제거제 도포 후 충분히 반응",
        "닦아내고 완전 건조",
        "재발 방지(제습/환기 루틴)",
      ],
      cautions: ["호흡기 민감하면 마스크/장갑 착용", "재발하면 근본 원인(결로/누수) 점검"],
      materials: [
        {
          id: "mold-remover",
          name: "곰팡이 제거제",
          approxCost: "약 5천~2만원",
          reason: "벽지·욕실 실리콘·창틀처럼 곰팡이가 퍼진 표면을 빠르게 정리할 때 가장 먼저 필요한 핵심 자재입니다.",
          note: "염소계/비염소계 확인",
          buyUrl: coupangSearchUrl("곰팡이 제거제"),
        },
        {
          id: "mask-gloves",
          name: "마스크 / 장갑",
          approxCost: "약 2천~1만원",
          reason: "곰팡이 포자와 세정 성분으로부터 호흡기와 피부를 보호하기 위해 함께 준비하는 것이 좋습니다.",
          buyUrl: coupangSearchUrl("마스크 장갑"),
        },
        {
          id: "cloth-scrubber",
          name: "걸레 / 수세미",
          approxCost: "약 1천~5천원",
          reason: "약제를 도포한 뒤 닦아내고 마무리 청소할 때 필요합니다.",
          buyUrl: coupangSearchUrl("걸레 수세미"),
        },
        {
          id: "dehumidifier",
          name: "제습제 / 제습기",
          approxCost: "상황에 따라",
          reason: "곰팡이 재발을 막으려면 제거 후에도 습도 관리가 중요해 보조 자재로 추천합니다.",
          buyUrl: coupangSearchUrl("제습제"),
        },
      ],
    };
  }

  if (issueType === "LEAK") {
    return {
      title: "누수 DIY(응급)",
      steps: ["물 공급 차단(가능한 경우)", "주변 물기 제거 및 전기기기 분리", "누수 지점 임시 테이핑", "전문업체 점검 예약"],
      cautions: ["전기 감전 위험 주의", "임시 조치는 장기 해결이 아님"],
      materials: [
        {
          id: "waterproof-tape",
          name: "방수 테이프 / 실리콘",
          approxCost: "약 3천~2만원",
          reason: "응급 상황에서 물이 번지는 속도를 늦추고 추가 피해를 막는 데 도움이 됩니다.",
          note: "응급 처치용",
          buyUrl: coupangSearchUrl("방수 테이프"),
        },
        {
          id: "bucket-cloth",
          name: "대야 / 걸레",
          approxCost: "약 1천~1만원",
          reason: "떨어지는 물을 임시로 받고 주변 바닥 손상을 줄이는 기본 준비물입니다.",
          buyUrl: coupangSearchUrl("대야 걸레"),
        },
        {
          id: "insulated-gloves",
          name: "절연 장갑",
          approxCost: "약 5천~2만원",
          reason: "전기설비 주변 누수라면 안전 확보를 위해 준비하는 것이 좋습니다.",
          note: "선택 준비물",
          buyUrl: coupangSearchUrl("절연 장갑"),
        },
      ],
    };
  }

  return {
    title: "DIY 가이드",
    steps: ["문제 부위를 촬영해 기록", "주변 정리 및 안전장비 착용", "가벼운 오염 제거", "필요 시 전문가 상담"],
    materials: [
      {
        id: "basic-cleaning-kit",
        name: "기본 청소 도구",
        approxCost: "약 5천~2만원",
        reason: "간단한 오염 제거와 주변 정리를 시작할 때 가장 범용적으로 사용할 수 있습니다.",
        buyUrl: coupangSearchUrl("청소 도구 세트"),
      },
      {
        id: "protective-gloves",
        name: "보호 장갑",
        approxCost: "약 2천~8천원",
        reason: "청소 약품이나 날카로운 파손 부위를 다룰 때 손을 보호합니다.",
        buyUrl: coupangSearchUrl("보호 장갑"),
      },
    ],
  };
}

type RiskBand = "LOW" | "MEDIUM" | "HIGH";
type EstimateIssueType = "CRACK" | "LEAK" | "MOLD" | "PEEL" | "CORROSION" | "BULGE";

type PriceRange = [number, number];

const PRICE_TABLE: Record<EstimateIssueType, Record<RiskBand, PriceRange>> = {
  MOLD: {
    LOW: [50_000, 120_000],
    MEDIUM: [120_000, 250_000],
    HIGH: [250_000, 450_000],
  },
  LEAK: {
    LOW: [120_000, 250_000],
    MEDIUM: [250_000, 500_000],
    HIGH: [500_000, 900_000],
  },
  CRACK: {
    LOW: [70_000, 180_000],
    MEDIUM: [180_000, 400_000],
    HIGH: [400_000, 750_000],
  },
  PEEL: {
    LOW: [50_000, 120_000],
    MEDIUM: [120_000, 250_000],
    HIGH: [250_000, 450_000],
  },
  CORROSION: {
    LOW: [80_000, 180_000],
    MEDIUM: [180_000, 400_000],
    HIGH: [400_000, 700_000],
  },
  BULGE: {
    LOW: [70_000, 180_000],
    MEDIUM: [180_000, 350_000],
    HIGH: [350_000, 650_000],
  },
};

const ISSUE_LABELS: Record<EstimateIssueType, string> = {
  CRACK: "균열",
  LEAK: "누수",
  MOLD: "곰팡이",
  PEEL: "박리",
  CORROSION: "부식",
  BULGE: "들뜸",
};

const VENDOR_HINTS: Record<EstimateIssueType, string[]> = {
  CRACK: ["균열 보수 업체", "외벽/내벽 보수 업체", "미장·보강 시공 업체"],
  LEAK: ["누수 탐지 업체", "배관 수리 업체", "방수 시공 업체"],
  MOLD: ["곰팡이 제거 업체", "방습/단열 보수 업체", "클리닝 전문 업체"],
  PEEL: ["도장 보수 업체", "벽지/마감재 보수 업체", "페인트 시공 업체"],
  CORROSION: ["금속 부식 보수 업체", "창틀/샷시 보수 업체", "방청 도장 업체"],
  BULGE: ["타일 보수 업체", "마감재 재시공 업체", "바닥/벽면 보수 업체"],
};

const WHY_PRO: Record<EstimateIssueType, string[]> = {
  CRACK: [
    "균열은 표면 문제인지 구조적 문제인지 사진만으로 단정하기 어렵습니다.",
    "균열 폭이 커지거나 반복 발생하면 보강 시공이 필요할 수 있습니다.",
    "누수·침하 등 2차 원인이 함께 있으면 전문가 확인이 안전합니다.",
  ],
  LEAK: [
    "누수는 원인 위치와 실제 물길을 찾지 못하면 재발하기 쉽습니다.",
    "전기 설비, 곰팡이, 마감재 손상으로 2차 피해가 커질 수 있습니다.",
    "임대인/세입자 책임 판단에는 현장 확인 기록이 유리합니다.",
  ],
  MOLD: [
    "곰팡이는 결로·누수·환기 문제 등 근본 원인이 남아 있으면 재발할 수 있습니다.",
    "벽지나 도장 내부까지 침투한 경우 단순 세척으로 해결되지 않을 수 있습니다.",
    "호흡기 질환이나 알레르기가 있으면 전문 처리를 권장합니다.",
  ],
  PEEL: [
    "박리는 표면 도장 문제뿐 아니라 습기·누수·접착 불량이 원인일 수 있습니다.",
    "넓은 범위로 진행되면 부분 보수보다 재도장이나 재시공이 필요할 수 있습니다.",
    "기존 마감재 제거와 바탕면 정리가 품질에 큰 영향을 줍니다.",
  ],
  CORROSION: [
    "부식은 표면 녹 제거만으로 끝나지 않고 방청 처리와 재도장이 필요할 수 있습니다.",
    "창틀·배관·금속 부재의 부식은 누수나 안전 문제로 이어질 수 있습니다.",
    "부식 범위가 넓거나 깊으면 교체 여부를 전문가가 판단해야 합니다.",
  ],
  BULGE: [
    "들뜸은 접착 불량, 습기, 바탕면 문제 등 원인이 다양합니다.",
    "타일이나 마감재가 탈락할 위험이 있으면 즉시 보수가 필요합니다.",
    "재시공 범위 판단이 필요해 전문가 확인이 안전합니다.",
  ],
};

function normalizeEstimateIssueType(issueType: IssueType): EstimateIssueType | null {
  const value = String(issueType ?? "").trim().toUpperCase();
  if (value === "PAINT_PEEL") return "PEEL";
  if (["CRACK", "LEAK", "MOLD", "PEEL", "CORROSION", "BULGE"].includes(value)) {
    return value as EstimateIssueType;
  }
  return null;
}

function getRiskBand(riskScore?: number | null): RiskBand {
  const score = Number(riskScore ?? 0);
  if (Number.isFinite(score) && score >= 70) return "HIGH";
  if (Number.isFinite(score) && score >= 40) return "MEDIUM";
  return "LOW";
}

function normalizeAreaRatio(areaRatio?: number | null): number | null {
  if (areaRatio === null || areaRatio === undefined) return null;
  const value = Number(areaRatio);
  if (!Number.isFinite(value) || value < 0) return null;
  return value > 1 ? value / 100 : value;
}

function getAreaFactor(areaRatio?: number | null): number {
  const ratio = normalizeAreaRatio(areaRatio);
  if (ratio === null) return 1.0;
  if (ratio >= 0.30) return 1.20;
  if (ratio >= 0.15) return 1.10;
  if (ratio >= 0.05) return 1.00;
  return 0.90;
}

function areaBandLabel(areaRatio?: number | null): string {
  const ratio = normalizeAreaRatio(areaRatio);
  if (ratio === null) return "면적 정보 없음";
  if (ratio >= 0.30) return "매우 큼";
  if (ratio >= 0.15) return "큼";
  if (ratio >= 0.05) return "보통";
  return "작음";
}

function roundToManwon(value: number): number {
  return Math.max(10_000, Math.round(value / 10_000) * 10_000);
}

function formatManwon(value: number): string {
  return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만원`;
}

function estimateRepairPrice(issueType: EstimateIssueType, riskScore?: number | null, areaRatio?: number | null) {
  const riskBand = getRiskBand(riskScore);
  const [baseMin, baseMax] = PRICE_TABLE[issueType][riskBand];
  const areaFactor = getAreaFactor(areaRatio);

  const minPrice = roundToManwon(baseMin * areaFactor);
  const maxPrice = roundToManwon(baseMax * areaFactor);

  return {
    issueLabel: ISSUE_LABELS[issueType],
    riskBand,
    areaFactor,
    areaLabel: areaBandLabel(areaRatio),
    minPrice,
    maxPrice,
    label: `약 ${formatManwon(minPrice)} ~ ${formatManwon(maxPrice)}`,
  };
}

function riskBandLabel(riskBand: RiskBand): string {
  if (riskBand === "HIGH") return "높음";
  if (riskBand === "MEDIUM") return "보통";
  return "낮음";
}

export async function getExpertInfo(
    issueType: IssueType,
    riskScore?: number | null,
    areaRatio?: number | null,
): Promise<ExpertInfo> {
  const normalizedIssueType = normalizeEstimateIssueType(issueType);

  if (!normalizedIssueType) {
    return {
      estimateRange: "상황에 따라 변동",
      vendors: ["가까운 수리 업체", "생활 수리 업체"],
      notes: [
        "현재 유형은 기준 가격표가 없어 참고용 비용 범위를 산정하지 않습니다.",
        "실제 견적은 현장 상태와 업체 확인에 따라 달라질 수 있습니다.",
      ],
    };
  }

  const estimate = estimateRepairPrice(normalizedIssueType, riskScore, areaRatio);
  const ratio = normalizeAreaRatio(areaRatio);
  const areaText = ratio === null ? "면적 정보 없음" : `${Math.round(ratio * 100)}% 내외`;

  return {
    estimateRange: estimate.label,
    vendors: VENDOR_HINTS[normalizedIssueType],
    notes: [
      `하자 유형: ${estimate.issueLabel}`,
      `위험도 구간: ${riskBandLabel(estimate.riskBand)}${riskScore !== null && riskScore !== undefined ? `(${Math.round(Number(riskScore))}점)` : ""}`,
      `SAM 손상 면적 비율: ${areaText} · 면적 보정: ${estimate.areaLabel}(${estimate.areaFactor.toFixed(1)}배)`,
      "AI가 감지한 하자 유형, 손상 면적, 위험도 점수를 기반으로 산정한 참고용 예상 비용입니다.",
      "실제 견적은 현장 상태와 업체 확인에 따라 달라질 수 있습니다.",
    ],
    whyPro: WHY_PRO[normalizedIssueType],
  };
}
