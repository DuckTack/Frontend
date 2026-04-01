import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "accessToken";
const IS_ADMIN_KEY = "isAdmin";

export async function saveAccessToken(token: string) {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function saveIsAdmin(isAdmin: boolean) {
  await AsyncStorage.setItem(IS_ADMIN_KEY, isAdmin ? "true" : "false");
}

export async function getIsAdmin() {
  const value = await AsyncStorage.getItem(IS_ADMIN_KEY);
  return value === "true";
}

export async function clearAccessToken() {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(IS_ADMIN_KEY);
}

export async function saveDevToken() {
  await saveAccessToken("DEV_TOKEN");
  await saveIsAdmin(true);
}
