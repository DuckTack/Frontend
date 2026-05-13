import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "accessToken";
const DUST_INTRO_SEEN_PREFIX = "dustIntroSeen:";

export async function saveAccessToken(token: string) {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

function introKeyForUser(username: string) {
  const normalized = username.trim().toLowerCase() || "anonymous";
  return `${DUST_INTRO_SEEN_PREFIX}${normalized}`;
}

export async function shouldShowDustIntro(username: string) {
  return (await AsyncStorage.getItem(introKeyForUser(username))) !== "true";
}

export async function markDustIntroSeen(username: string) {
  await AsyncStorage.setItem(introKeyForUser(username), "true");
}

export async function clearAccessToken() {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}
