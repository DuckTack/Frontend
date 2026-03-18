import { apiClient } from "./apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type BackendResidenceType = "ONE_ROOM" | "OFFICETEL" | "APT" | "VILLA" | "HOUSE" | "ETC";
export type BackendRentType = "NONE" | "MONTHLY" | "JEONSE" | "SALE";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  refreshExpiresAtEpochSeconds?: number;
};

export type SignupRequest = {
  username: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  residenceType: BackendResidenceType;
  rentType?: BackendRentType;
  address?: string;
  emailVerified?: boolean;
};

type LocalUser = {
  username: string;
  password: string;
  email?: string;
  phoneNumber?: string;
};

type PendingEmailVerification = {
  email: string;
  code: string;
  verified: boolean;
  expiresAt: number;
};

const LOCAL_USERS_KEY = "local_users_v1";
const LOCAL_EMAIL_VERIFICATION_KEY = "local_email_verification_v1";

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

async function readEmailVerifications(): Promise<PendingEmailVerification[]> {
  const raw = await AsyncStorage.getItem(LOCAL_EMAIL_VERIFICATION_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingEmailVerification[];
  } catch {
    return [];
  }
}

async function writeEmailVerifications(list: PendingEmailVerification[]) {
  await AsyncStorage.setItem(LOCAL_EMAIL_VERIFICATION_KEY, JSON.stringify(list));
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  try {
    const res = await apiClient.post("/api/auth/login", req);
    const body = res.data;
    const data = body?.data ?? body;
    const token = data?.accessToken;
    if (!token) {
      throw new Error("No accessToken in response");
    }
    return {
      accessToken: token,
      refreshToken: data?.refreshToken,
      refreshExpiresAtEpochSeconds: data?.refreshExpiresAtEpochSeconds,
    };
  } catch {
    const locals = await readLocalUsers();
    const matched = locals.find((u) => u.username === req.username && u.password === req.password);
    if (!matched) {
      throw new Error("LOGIN_FAILED");
    }
    return { accessToken: "LOCAL_DEV_TOKEN" };
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) return false;

  try {
    const res = await apiClient.get("/api/auth/check-username", { params: { username: trimmed } });
    const body = res.data;
    const available = body?.available ?? body?.data?.available;
    if (typeof available === "boolean") return available;
    if (typeof body === "boolean") return body;
  } catch {
    // fallback below
  }

  const locals = await readLocalUsers();
  return !locals.some((u) => u.username === trimmed);
}

export async function checkPhoneAvailable(phoneNumber: string): Promise<boolean> {
  const trimmed = phoneNumber.replace(/[^0-9]/g, "");
  if (!trimmed) return true;

  // 현재 백엔드는 전화번호 중복체크 API가 없음.
  // TODO(Backend): GET /api/auth/check-phone?phoneNumber=... 또는 signup 시 명시적 duplicate code 제공
  const locals = await readLocalUsers();
  return !locals.some((u) => (u.phoneNumber ?? "").replace(/[^0-9]/g, "") === trimmed);
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;

  // 현재 백엔드는 이메일 저장/중복검사 API가 없음.
  // TODO(Backend): GET /api/auth/check-email?email=...
  const locals = await readLocalUsers();
  return !locals.some((u) => (u.email ?? "").toLowerCase() === trimmed);
}

export async function sendEmailVerificationCode(email: string): Promise<{ devCode?: string }> {
  const trimmed = email.trim().toLowerCase();

  // 현재 백엔드는 이메일 인증 API가 없어서 프론트 개발용 fallback 유지
  // TODO(Backend): POST /api/auth/email/send-code { email }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const all = await readEmailVerifications();
  const filtered = all.filter((item) => item.email !== trimmed);
  filtered.unshift({
    email: trimmed,
    code,
    verified: false,
    expiresAt: Date.now() + 1000 * 60 * 10,
  });
  await writeEmailVerifications(filtered);
  return { devCode: code };
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  // 현재 백엔드는 이메일 인증 확인 API가 없어서 프론트 개발용 fallback 유지
  // TODO(Backend): POST /api/auth/email/verify-code { email, code }
  const all = await readEmailVerifications();
  const matched = all.find((item) => item.email === trimmedEmail);
  if (!matched) return false;
  if (matched.expiresAt < Date.now()) return false;
  if (matched.code !== trimmedCode) return false;

  matched.verified = true;
  await writeEmailVerifications([...all]);
  return true;
}

export async function signup(req: SignupRequest): Promise<void> {
  if (!req.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  try {
    // 현재 백엔드 signup은 username/password/phoneNumber만 받음.
    // TODO(Backend): email, emailVerified, residenceType, rentType, address까지 signup DTO 확장 필요
    await apiClient.post("/api/auth/signup", {
      username: req.username,
      password: req.password,
      phoneNumber: req.phoneNumber ?? "010-0000-0000",
    });
    return;
  } catch {
    const locals = await readLocalUsers();
    if (locals.some((u) => u.username === req.username)) {
      throw new Error("USERNAME_TAKEN");
    }
    if (req.phoneNumber) {
      const phoneTaken = locals.some(
        (u) => (u.phoneNumber ?? "").replace(/[^0-9]/g, "") === req.phoneNumber?.replace(/[^0-9]/g, "")
      );
      if (phoneTaken) {
        throw new Error("PHONE_TAKEN");
      }
    }
    if (req.email && locals.some((u) => (u.email ?? "").toLowerCase() === req.email?.toLowerCase())) {
      throw new Error("EMAIL_TAKEN");
    }

    const verifications = await readEmailVerifications();
    const verification = verifications.find((item) => item.email === req.email?.trim().toLowerCase());
    if (!verification?.verified) {
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    await writeLocalUsers([
      {
        username: req.username,
        password: req.password,
        email: req.email,
        phoneNumber: req.phoneNumber,
      },
      ...locals,
    ]);
  }
}
