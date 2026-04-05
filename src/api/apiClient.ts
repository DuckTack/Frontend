import axios from "axios";
import { getAccessToken, clearAccessToken } from "../store/tokenStorage";

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const apiClient = axios.create({
    baseURL,
    timeout: 10000,
});

// 요청 인터셉터
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await getAccessToken();

            if (token) {
                config.headers = config.headers ?? {};
                (config.headers as any).Authorization = `Bearer ${token}`;
            }

            // FormData일 경우 Content-Type 제거 (axios가 자동으로 multipart 설정)
            if (config.data instanceof FormData) {
                console.log("📦 FormData 업로드 요청");
                delete (config.headers as any)["Content-Type"];
            }

            // @ts-ignore
            console.log("📡 요청 URL:", config.baseURL + config.url);
        } catch (e) {
            console.log("토큰 가져오기 실패");
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => {
        console.log("✅ 응답 성공:", response.config.url);
        return response;
    },
    async (error) => {
        console.log("❌ 응답 실패:", error?.response?.status);
        console.log(error?.response?.data);

        const status = error?.response?.status;

        if (status === 401) {
            console.log("토큰 만료 → 로그아웃 처리");
            await clearAccessToken();
        }

        return Promise.reject(error);
    }
);

export default apiClient;