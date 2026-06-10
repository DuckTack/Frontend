/**
 * 서버 없이 디자인을 미리보기 위한 모킹 어댑터.
 *
 * 사용법: .env(.env.local)에 아래 한 줄을 추가하면 활성화됩니다.
 *   EXPO_PUBLIC_USE_MOCK=true
 *
 * 활성화되면 apiClient의 모든 요청이 실제 네트워크로 나가지 않고,
 * 아래 라우트 테이블에 정의된 더미 데이터를 즉시 돌려줍니다.
 * (지연 시간을 살짝 흉내내서 로딩 상태도 확인할 수 있게 했습니다.)
 *
 * 새로운 화면을 확인하다가 "이 API도 더미로 보고 싶다" 싶으면
 * 아래 routes 배열에 패턴과 응답을 한 줄 추가하면 됩니다.
 */
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  mockMe,
  mockHistories,
  mockDiagnosis,
  mockLatestReservation,
  mockVendors,
  mockReviews,
  mockProducts,
} from "./mockData";

type Matcher = {
  method: "get" | "post" | "put" | "patch" | "delete";
  pattern: RegExp;
  respond: (config: AxiosRequestConfig, match: RegExpMatchArray) => any;
};

function ok(data: any) {
  return { data, status: 200, statusText: "OK" };
}

const routes: Matcher[] = [
  // 로그인
  { method: "post", pattern: /\/api\/auth\/login$/, respond: () => ok({ data: { accessToken: "mock-access-token", refreshToken: "mock-refresh-token", refreshExpiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 } }) },

  // 회원가입 — 아이디/이메일/휴대폰 중복검사 (항상 "사용 가능"으로 응답)
  { method: "get", pattern: /\/api\/auth\/check-username$/, respond: () => ok({ data: { available: true } }) },
  { method: "get", pattern: /\/api\/auth\/check-email$/, respond: () => ok({ data: { available: true } }) },
  { method: "get", pattern: /\/api\/auth\/check-phone$/, respond: () => ok({ data: { available: true } }) },

  // 회원가입 — 이메일 인증 코드 발송/확인 (코드는 아무거나 입력해도 통과)
  { method: "post", pattern: /\/api\/auth\/email\/send-code$/, respond: () => ok({ data: { sent: true } }) },
  { method: "post", pattern: /\/api\/auth\/email\/verify-code$/, respond: () => ok({ data: { verified: true } }) },

  // 비밀번호 재설정
  { method: "post", pattern: /\/api\/auth\/password\/send-reset-code$/, respond: () => ok({ data: { sent: true } }) },
  { method: "post", pattern: /\/api\/auth\/password\/verify-reset-code$/, respond: () => ok({ data: { verified: true } }) },
  { method: "post", pattern: /\/api\/auth\/password\/reset$/, respond: () => ok({ data: {} }) },

  // 회원가입 제출
  { method: "post", pattern: /\/api\/auth\/signup$/, respond: () => ok({ data: { ...mockMe } }) },

  // 사용자 정보 (마이페이지)
  { method: "get", pattern: /\/api\/users\/me$/, respond: () => ok({ data: mockMe }) },
  { method: "put", pattern: /\/api\/users\/me$/, respond: (config) => ok({ data: { ...mockMe, ...JSON.parse(config.data || "{}") } }) },

  // 진단 이력 목록 / 상세 (히스토리, 리포트 목록)
  { method: "get", pattern: /\/api\/histories\/(\w+)$/, respond: (_c, m) => ok({ data: mockHistories.find((h) => String(h.id) === m[1]) ?? mockHistories[0] }) },
  { method: "get", pattern: /\/api\/histories$/, respond: () => ok({ data: mockHistories }) },

  // 진단 결과 상세
  { method: "get", pattern: /\/api\/diagnosis\/(\w+)$/, respond: () => ok({ data: mockDiagnosis }) },

  // 홈 — 최근 예약 현황
  { method: "get", pattern: /\/api\/reservations\/my\/latest$/, respond: () => ok({ data: mockLatestReservation }) },
  { method: "post", pattern: /\/api\/reservations$/, respond: () => ok({ data: { ...mockLatestReservation, status: "PENDING", stepIndex: 1 } }) },

  // 전문가 / 업체 검색
  { method: "get", pattern: /\/api\/experts\/vendors$/, respond: () => ok({ data: mockVendors }) },
  { method: "get", pattern: /\/api\/companies\/nearby$/, respond: () => ok({ data: mockVendors }) },

  // 리뷰
  { method: "get", pattern: /\/api\/reviews$/, respond: () => ok({ data: mockReviews }) },
  { method: "post", pattern: /\/api\/reviews$/, respond: (config) => ok({ data: { id: 999, rating: 5, content: "", createdAt: new Date().toISOString(), ...JSON.parse(config.data || "{}") } }) },
  { method: "delete", pattern: /\/api\/reviews\/(\w+)\/my$/, respond: () => ok({ data: {} }) },

  // DIY 추천 상품
  { method: "get", pattern: /\/api\/products$/, respond: () => ok({ data: mockProducts }) },
];

function buildUrl(config: AxiosRequestConfig): string {
  const base = (config.baseURL ?? "").replace(/\/$/, "");
  const path = config.url ?? "";
  return path.startsWith("http") ? path : `${base}${path}`;
}

/**
 * axios의 adapter로 꽂아 넣는 함수.
 * 매칭되는 라우트가 있으면 더미 응답을, 없으면 404 형태의 에러를 돌려줍니다.
 * (화면의 try/catch + 빈 상태 처리 로직을 그대로 활용하기 위함)
 */
export async function mockAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  const method = (config.method ?? "get").toLowerCase() as Matcher["method"];
  const url = buildUrl(config);

  console.log(`🧪 [MOCK] ${method.toUpperCase()} ${url}`);

  // 네트워크처럼 약간의 지연을 줘서 로딩 UI도 확인 가능하게 함
  await new Promise((resolve) => setTimeout(resolve, 350));

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = url.match(route.pattern);
    if (match) {
      const data = route.respond(config, match);
      return { ...data, headers: {}, config: config as any } as AxiosResponse;
    }
  }

  console.log(`🧪 [MOCK] 매칭되는 라우트가 없음 → 404 반환: ${url}`);

  const error: any = new Error(`[MOCK] No route for ${method.toUpperCase()} ${url}`);
  error.response = { status: 404, data: { message: "Mock: route not found", url }, headers: {}, config };
  error.config = config;
  error.isAxiosError = true;
  throw error;
}

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "true";
