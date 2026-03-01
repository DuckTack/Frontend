/**
 * Axios 공통 클라이언트
 *
 * - baseURL: EXPO_PUBLIC_API_BASE_URL 환경변수 사용
 * - 모든 요청에 Authorization: Bearer <token> 자동 주입
 *
 * Backend 연동 시 체크:
 * - 실제 서버 주소를 EXPO_PUBLIC_API_BASE_URL로 주입했는지
 * - 토큰 포맷이 Bearer가 맞는지(백엔드 요구사항 확인)
 */
import axios from "axios";
import { getAccessToken, clearAccessToken } from "@/src/store/tokenStorage";

// Expo 환경변수는 앱에서 읽을 수 있으려면 EXPO_PUBLIC_ prefix가 필요합니다.
const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

// 모든 요청에 Authorization 헤더 자동 주입
apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    // axios 헤더 타입이 케이스별로 달라서 any 캐스팅 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// (선택) 토큰 만료/401 대응: 토큰 비우기
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      await clearAccessToken();
    }
    return Promise.reject(error);
  }
);
