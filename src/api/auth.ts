import { apiClient } from "./apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
};

export type SignupRequest = {
  username: string;
  password: string;
  email?: string;
  phoneNumber?: string;
  residenceType: "ONE_ROOM" | "APARTMENT" | "VILLA" | "OFFICETEL" | "OTHER";
  rentType?: "MONTHLY" | "JEONSE" | "SALE";
  address?: string;
  isRenter?: boolean;
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
    const token = body?.accessToken ?? body?.data?.accessToken;
    if (!token) {
      throw new Error("No accessToken in response");
    }
    return { accessToken: token };
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
    const res = await apiClient.get("/api/auth/username-available", { params: { username: trimmed } });
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

  try {
    const res = await apiClient.get("/api/auth/phone-available", { params: { phoneNumber: trimmed } });
    const body = res.data;
    const available = body?.available ?? body?.data?.available;
    if (typeof available === "boolean") return available;
    if (typeof body === "boolean") return body;
  } catch {
    // fallback below
  }

  const locals = await readLocalUsers();
  return !locals.some((u) => (u.phoneNumber ?? "").replace(/[^0-9]/g, "") === trimmed);
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;

  try {
    const res = await apiClient.get("/api/auth/email-available", { params: { email: trimmed } });
    const body = res.data;
    const available = body?.available ?? body?.data?.available;
    if (typeof available === "boolean") return available;
    if (typeof body === "boolean") return body;
  } catch {
    // fallback below
  }

  const locals = await readLocalUsers();
  return !locals.some((u) => (u.email ?? "").toLowerCase() === trimmed);
}

export async function sendEmailVerificationCode(email: string): Promise<{ devCode?: string }> {
  const trimmed = email.trim().toLowerCase();

  try {
    await apiClient.post("/api/auth/email/send-code", { email: trimmed });
    return {};
  } catch {
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
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  try {
    const res = await apiClient.post("/api/auth/email/verify-code", { email: trimmedEmail, code: trimmedCode });
    const body = res.data;
    const verified = body?.verified ?? body?.data?.verified;
    if (typeof verified === "boolean") return verified;
  } catch {
    // fallback below
  }

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
    await apiClient.post("/api/auth/signup", req);
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
