/**
 * 서버 없이 디자인을 확인하기 위한 더미 데이터 모음.
 * apiClient의 모킹 어댑터(mockAdapter.ts)가 이 데이터를 사용해
 * 진단결과 / 히스토리 / 마이페이지 / 리포트 / 전문가 / 예약 화면을 채웁니다.
 *
 * 실제 서버 응답 형태(↔ src/api/*.ts의 normalize 함수들)에 최대한 맞춰뒀습니다.
 */

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString();

// ── 사용자 정보 (/api/users/me) ──
export const mockMe = {
  username: "민찬",
  email: "rlaalscks13@gmail.com",
  phoneNumber: "01012345678",
  residenceType: "APT",
  rentType: "JEONSE",
  address: "서울특별시 강남구 테헤란로 123",
};

// ── 진단 이력 목록 (/api/histories) ──
export const mockHistories = [
  {
    id: "1001",
    historyId: "1001",
    diagnosisId: "9001",
    status: "COMPLETED",
    riskScore: 78,
    issueType: "LEAK",
    areaRatio: 0.18,
    createdAt: daysAgo(2),
    recommendation: "PRO",
    imageUris: [],
    cause: "윗집 배관 노후로 인한 누수 가능성이 높습니다.",
    naturalOrHuman: "자연 발생",
    caution: "곰팡이로 번지기 전에 빠른 조치가 필요합니다.",
    companyId: "501",
    expertVendorId: "501",
    expertVendorName: "튼튼수리 강남점",
    reservationId: "7001",
    reservationStatus: "ACCEPTED",
    repairCompletedDate: null,
    reviewWritten: false,
    report: { storageKey: "reports/1001.pdf", contentType: "application/pdf", sizeBytes: 245678 },
  },
  {
    id: "1000",
    historyId: "1000",
    diagnosisId: "9000",
    status: "COMPLETED",
    riskScore: 42,
    issueType: "MOLD",
    areaRatio: 0.07,
    createdAt: daysAgo(9),
    recommendation: "DIY",
    imageUris: [],
    cause: "환기 부족으로 인한 결로성 곰팡이로 추정됩니다.",
    naturalOrHuman: "환경적 요인",
    caution: "제습과 환기를 병행하면 직접 해결 가능한 수준입니다.",
    reviewWritten: true,
    report: null,
  },
  {
    id: "999",
    historyId: "999",
    diagnosisId: "8999",
    status: "COMPLETED",
    riskScore: 91,
    issueType: "CRACK",
    areaRatio: 0.31,
    createdAt: daysAgo(21),
    recommendation: "PRO",
    imageUris: [],
    cause: "구조체 균열로 추정되어 정밀 점검이 필요합니다.",
    naturalOrHuman: "구조적 요인",
    caution: "방치 시 누수·붕괴 위험으로 이어질 수 있습니다.",
    expertVendorName: "안심건설 본사",
    repairCompletedDate: daysAgo(5),
    repairTotalCost: 480000,
    repairSummary: "외벽 균열 보수 및 방수 처리 완료",
    reviewWritten: true,
    report: { storageKey: "reports/999.pdf", contentType: "application/pdf", sizeBytes: 198213 },
  },
  {
    id: "998",
    historyId: "998",
    diagnosisId: "8998",
    status: "ANALYZING",
    riskScore: 0,
    issueType: "ETC",
    createdAt: daysAgo(0),
    recommendation: "DIY",
    imageUris: [],
    reviewWritten: false,
    report: null,
  },
];

// ── 진단 결과 상세 (/api/diagnosis/:id) ──
export const mockDiagnosis = {
  diagnosisId: 9001,
  imageUrl: null,
  createdAt: daysAgo(2),
  issueType: "LEAK",
  mainDefect: "천장 누수 흔적",
  riskScore: 0.78,
  riskScore100: 78,
  riskLevel: "HIGH",
  detectionCount: 3,
  guideFallback: false,
  guide: {
    guide: {
      title: "천장 누수 응급 가이드",
      summary: "윗집 배관 노후로 인한 누수로 추정되며, 확산 전 빠른 조치가 필요합니다.",
      difficulty: "medium",
      estimated_time_min: 30,
      next_action: "CALL_PRO",
      steps: [
        { order: 1, title: "물 공급 차단", description: "가능하다면 해당 구역의 급수를 먼저 차단하세요.", warning: "전기 기기 근처라면 감전에 주의하세요." },
        { order: 2, title: "주변 정리", description: "젖은 가구·전자제품을 안전한 곳으로 옮깁니다." },
        { order: 3, title: "임시 방수 처리", description: "방수 테이프나 비닐로 확산을 최대한 늦춰주세요." },
        { order: 4, title: "전문가 점검 예약", description: "구조적 문제일 가능성이 높아 전문가 방문이 필요합니다.", warning: "방치하면 곰팡이·구조 손상으로 이어질 수 있어요." },
      ],
      warnings: ["전기 시설 주변에서는 절대 물기에 닿지 마세요.", "임시 조치는 근본적인 해결책이 아닙니다."],
    },
    products: null,
  },
};

// ── 예약 현황 (/api/reservations/my/latest) ──
export const mockLatestReservation = {
  reservationId: 7001,
  companyId: 501,
  companyName: "튼튼수리 강남점",
  status: "ACCEPTED",
  visitDate: "2026-06-12",
  visitTime: "14:30",
  issueSummary: "거실 천장 누수 의심 — 정밀 점검 요청",
  displayTitle: "전문가 수락 완료",
  displaySubtitle: "방문 일정이 확정되었습니다. 알림을 확인해 주세요.",
  stepIndex: 2,
};

// ── 전문가 업체 목록 (/api/experts/vendors, /api/companies/nearby) ──
export const mockVendors = [
  {
    id: "501",
    companyId: "501",
    name: "튼튼수리 강남점",
    region: "서울",
    minPrice: 50000,
    maxPrice: 300000,
    avgRating: 4.8,
    rating: 4.8,
    reviewCount: 132,
    intro: "누수·곰팡이·균열 전문, 평균 응답 30분 이내",
    coverageAreas: ["강남구", "서초구", "송파구"],
    phone: "0212345678",
    addressLine: "서울 강남구 테헤란로 123",
    serviceRegionLabel: "강남 일대",
    distanceKm: 1.2,
    isPartner: true,
  },
  {
    id: "502",
    companyId: "502",
    name: "안심건설 본사",
    region: "서울",
    minPrice: 80000,
    maxPrice: 800000,
    avgRating: 4.6,
    rating: 4.6,
    reviewCount: 89,
    intro: "구조 균열·방수 공사 전문 시공팀",
    coverageAreas: ["서울 전역"],
    phone: "0298765432",
    addressLine: "서울 서초구 서초대로 50",
    serviceRegionLabel: "서울 전역",
    distanceKm: 3.6,
    isPartner: true,
  },
  {
    id: "kakao-1",
    kakaoPlaceId: "kakao-1",
    placeUrl: "https://place.map.kakao.com/",
    name: "우리동네 인테리어",
    region: "서울",
    minPrice: 30000,
    avgRating: null,
    rating: 0,
    reviewCount: 0,
    intro: "카카오 지도 검색 결과 업체",
    coverageAreas: ["관악구"],
    distanceKm: 2.1,
    isPartner: false,
  },
];

// ── 리뷰 (/api/reviews) ──
export const mockReviews = {
  avgRating: 4.8,
  reviewCount: 3,
  reviews: [
    { id: 1, historyId: 999, companyId: 501, companyName: "튼튼수리 강남점", authorUsername: "이**", rating: 5, content: "방문도 빠르고 설명도 꼼꼼하게 해주셨어요. 결과도 만족스럽습니다.", createdAt: daysAgo(4) },
    { id: 2, historyId: 980, companyId: 501, companyName: "튼튼수리 강남점", authorUsername: "박**", rating: 5, content: "누수 원인을 정확히 짚어주셔서 빠르게 해결했습니다.", createdAt: daysAgo(15) },
    { id: 3, historyId: 960, companyId: 501, companyName: "튼튼수리 강남점", authorUsername: "최**", rating: 4, content: "친절하지만 비용이 다소 있는 편이었어요.", createdAt: daysAgo(30) },
  ],
};

// ── DIY 추천 상품 (/api/products) ──
export const mockProducts = [
  { id: "p1", name: "곰팡이 제거제", category: "MOLD", price: 12900, imageUrl: null, buyUrl: "https://www.coupang.com/np/search?q=곰팡이+제거제" },
  { id: "p2", name: "방수 테이프", category: "LEAK", price: 8900, imageUrl: null, buyUrl: "https://www.coupang.com/np/search?q=방수+테이프" },
  { id: "p3", name: "제습기", category: "MOLD", price: 89000, imageUrl: null, buyUrl: "https://www.coupang.com/np/search?q=제습기" },
];
