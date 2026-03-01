/**
 * 인증(Auth)
 *
 * Backend1 연동 포인트
 * - POST /api/auth/login
 *   - req: { username, password }
 *   - res: { accessToken } 또는 { success, data: { accessToken } }
 * - POST /api/auth/signup
 * - (선택) GET /api/auth/check-username?username=...
 *   - res: { available: boolean } 형태 추천
 */
import { apiClient } from "./apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
};

// 백엔드 응답 형태가 흔들릴 때를 대비해 accessToken을 정규화합니다.
export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post("/api/auth/login", req);
  const body = res.data;

  const token = body?.accessToken ?? body?.data?.accessToken;
  if (!token) {
    throw new Error("No accessToken in response");
  }
  return { accessToken: token };
}

export type SignupRequest = {
  username: string;
  password: string;
  phoneNumber?: string;
  residenceType: "ONE_ROOM" | "APARTMENT" | "VILLA" | "OFFICETEL" | "OTHER";
  rentType?: "MONTHLY" | "JEONSE" | "SALE";
  address?: string;
  isRenter?: boolean;
};

const LOCAL_USERS_KEY = "local_users_v1";

type LocalUser = { username: string; password: string; phoneNumber?: string };

async function readLocalUsers(): Promise<LocalUser[]> {
  const raw = await AsyncStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalUser[];
  } catch {
    return [];
  }
}

async function writeLocalUsers(list: LocalUser[]) {
  await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
}

/* 아이디 중복 검사
 - 백엔드 명세가 확정되면 endpoint만 교체
 - 현재는 서버 실패 시 로컬 가입 목록을 기준으로 fallback */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) return false;

  try {
    // (예시) 백엔드에서 GET /api/auth/username-available?username=...
    const res = await apiClient.get("/api/auth/username-available", { params: { username: trimmed } });
    const body = res.data;
    const available = body?.available ?? body?.data?.available;
    if (typeof available === "boolean") return available;
    // 명세 미확정이면 응답이 bool로 올 수도 있음
    if (typeof body === "boolean") return body;
  } catch {
    // ignore
  }

  // fallback: 로컬 사용자 목록에서 중복 체크
  const locals = await readLocalUsers();
  return !locals.some((u) => u.username === trimmed);
}

export async function signup(req: SignupRequest): Promise<void> {
  try {
    await apiClient.post("/api/auth/signup", req);
    return;
  } catch {
    // 백엔드 미연동/개발 중이면 로컬에 임시 저장해서 흐름을 막지 않음
    const locals = await readLocalUsers();
    if (locals.some((u) => u.username === req.username)) {
      throw new Error("USERNAME_TAKEN");
    }
    await writeLocalUsers([{ username: req.username, password: req.password, phoneNumber: req.phoneNumber }, ...locals]);
  }
}
