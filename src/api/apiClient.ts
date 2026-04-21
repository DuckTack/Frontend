import axios from "axios";
import { getAccessToken, clearAccessToken } from "../store/tokenStorage";
import { router } from "expo-router";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const apiClient = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
    timeout: 10000,
});
console.log("🔥 API baseURL:", process.env.EXPO_PUBLIC_API_BASE_URL);


// 요청 인터셉터
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await getAccessToken();

            if (token) {
                config.headers = config.headers ?? {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            }

            // FormData일 경우 Content-Type 제거
            if (config.data instanceof FormData) {
                delete (config.headers as any)["Content-Type"];
            }

            const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
            console.log("📡 요청 URL:", fullUrl);

        } catch (e) {
            console.log("토큰 가져오기 실패");
        }
        // @ts-ignore
        console.log("🔥 요청 URL:", config.baseURL + config.url);

        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => {
        console.log("✅ 응답 성공:", response.config.url);
        return response;
    },
    async (error) => {
        const status = error?.response?.status;

        console.log("❌ 응답 실패:", status);
        console.log(error?.response?.data);

        if (status === 401) {
            console.log("토큰 만료 → 로그아웃 처리");

            await clearAccessToken();

            // 🔥 로그인 페이지로 이동 (중요 기능)
            router.replace("/login");
        }

        return Promise.reject(error);
    }
);

export default apiClient;