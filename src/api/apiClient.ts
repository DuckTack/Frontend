import axios from "axios";
import { getAccessToken, clearAccessToken } from "../store/tokenStorage";
<<<<<<< HEAD
import { router } from "expo-router";
=======
>>>>>>> 1c8c8976d4278c94c4dac651247331cc944e0c37

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

<<<<<<< HEAD
            if (config.data instanceof FormData) {
                delete (config.headers as any)["Content-Type"];
            }

            const fullUrl = `${config.baseURL ?? ""}${config.url ?? ""}`;
            console.log("📡 요청 URL:", fullUrl);

=======
            // FormData일 경우 Content-Type 제거 (axios가 자동으로 multipart 설정)
            if (config.data instanceof FormData) {
                console.log("📦 FormData 업로드 요청");
                delete (config.headers as any)["Content-Type"];
            }

            // @ts-ignore
            console.log("📡 요청 URL:", config.baseURL + config.url);
>>>>>>> 1c8c8976d4278c94c4dac651247331cc944e0c37
        } catch (e) {
            console.log("토큰 가져오기 실패");
        }

        return config;
    },
<<<<<<< HEAD
    (error) => Promise.reject(error)
=======
    (error) => {
        return Promise.reject(error);
    }
>>>>>>> 1c8c8976d4278c94c4dac651247331cc944e0c37
);

// 응답 인터셉터
apiClient.interceptors.response.use(
    (response) => {
        console.log("✅ 응답 성공:", response.config.url);
        return response;
    },
    async (error) => {
<<<<<<< HEAD
        const status = error?.response?.status;

        console.log("❌ 응답 실패:", status);
        console.log(error?.response?.data);

        if (status === 401) {
            console.log("토큰 만료 → 로그아웃 처리");

            await clearAccessToken();

            // 🔥 추가: 자동 로그인 페이지 이동
            router.replace("/login");
=======
        console.log("❌ 응답 실패:", error?.response?.status);
        console.log(error?.response?.data);

        const status = error?.response?.status;

        if (status === 401) {
            console.log("토큰 만료 → 로그아웃 처리");
            await clearAccessToken();
>>>>>>> 1c8c8976d4278c94c4dac651247331cc944e0c37
        }

        return Promise.reject(error);
    }
);

export default apiClient;