// 토큰을 저장/불러오는 도구
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "accessToken";

export async function saveAccessToken(token: string) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
    return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function clearAccessToken() {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

// 개발용 슈퍼 계정 함수
export async function saveDevToken() {
  await saveAccessToken("DEV_TOKEN");
}