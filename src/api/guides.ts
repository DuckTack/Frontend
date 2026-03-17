import type { IssueType } from "./histories";

export type DiyGuide = {
  title: string;
  steps: string[];
  cautions?: string[];
  materials?: { name: string; approxCost?: string; note?: string; buyUrl?: string }[];
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
        { name: "곰팡이 제거제", approxCost: "약 5천~2만원", note: "염소계/비염소계 확인", buyUrl: coupangSearchUrl("곰팡이 제거제") },
        { name: "마스크/장갑", approxCost: "약 2천~1만원", buyUrl: coupangSearchUrl("마스크 장갑") },
        { name: "걸레/수세미", approxCost: "약 1천~5천원", buyUrl: coupangSearchUrl("걸레 수세미") },
        { name: "제습제/제습기(선택)", approxCost: "상황에 따라", buyUrl: coupangSearchUrl("제습제") },
      ],
    };
  }

  if (issueType === "LEAK") {
    return {
      title: "누수 DIY(응급)",
      steps: ["물 공급 차단(가능한 경우)", "주변 물기 제거 및 전기기기 분리", "누수 지점 임시 테이핑", "전문업체 점검 예약"],
      cautions: ["전기 감전 위험 주의", "임시 조치는 장기 해결이 아님"],
      materials: [
        { name: "방수 테이프/실리콘", approxCost: "약 3천~2만원", note: "응급 처치용", buyUrl: coupangSearchUrl("방수 테이프") },
        { name: "대야/걸레", approxCost: "약 1천~1만원", buyUrl: coupangSearchUrl("대야 걸레") },
        { name: "절연 장갑(선택)", approxCost: "약 5천~2만원", buyUrl: coupangSearchUrl("절연 장갑") },
      ],
    };
  }

  return {
    title: "DIY 가이드",
    steps: ["문제 부위를 촬영해 기록", "주변 정리 및 안전장비 착용", "가벼운 오염 제거", "필요 시 전문가 상담"],
    materials: [
      { name: "기본 청소 도구", approxCost: "약 5천~2만원", buyUrl: coupangSearchUrl("청소 도구 세트") },
      { name: "보호 장갑", approxCost: "약 2천~8천원", buyUrl: coupangSearchUrl("보호 장갑") },
    ],
  };
}

export async function getExpertInfo(issueType: IssueType): Promise<ExpertInfo> {
  if (issueType === "MOLD") {
    return {
      estimateRange: "약 8만 ~ 25만원(상황에 따라 변동)",
      vendors: ["근처 방수/곰팡이 전문 A", "클리닝 업체 B", "설비 기사 C"],
      notes: ["면적/재발 여부에 따라 비용 변동", "재도장 포함 여부 확인"],
      whyPro: [
        "결로/누수 등 근본 원인이 있으면 DIY로 재발 가능성이 큼",
        "곰팡이가 깊게 침투했으면 벽지/도장/단열 보수가 필요할 수 있음",
        "호흡기 질환/알레르기 있으면 전문 처리 권장",
      ],
    };
  }
  if (issueType === "LEAK") {
    return {
      estimateRange: "약 10만 ~ 40만원(누수 위치/원인에 따라 변동)",
      vendors: ["설비 기사 A", "누수탐지 업체 B", "배관 수리 C"],
      notes: ["탐지비/수리비 분리 청구 여부 확인"],
      whyPro: [
        "누수는 원인/경로를 찾지 못하면 재발하기 쉬움",
        "전기/곰팡이/마감재 손상으로 2차 피해가 커질 수 있음",
        "임대인/세입자 책임 판단에 증빙이 유리",
      ],
    };
  }
  return {
    estimateRange: "상황에 따라 변동",
    vendors: ["가까운 수리 업체 A", "생활 수리 B"],
  };
}
