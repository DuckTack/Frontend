import { apiClient } from "./apiClient";

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  refreshExpiresAtEpochSeconds?: number;
};

export type ResidenceType = "ONE_ROOM" | "OFFICETEL" | "APT" | "VILLA" | "HOUSE" | "ETC";
export type RentType = "NONE" | "MONTHLY" | "JEONSE" | "SALE";

export type SignupRequest = {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address?: string;
  emailVerified?: boolean;
};

function pickBooleanAvailable(body: any): boolean {
  const available = body?.data?.available ?? body?.available;
  if (typeof available !== "boolean") {
    throw new Error("INVALID_AVAILABLE_RESPONSE");
  }
  return available;
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post("/api/auth/login", req);
  const body = res.data;
  const data = body?.data ?? body;
  const token = data?.accessToken;

  if (!token) {
    throw new Error("NO_ACCESS_TOKEN");
  }

  return {
    accessToken: token,
    refreshToken: data?.refreshToken,
    refreshExpiresAtEpochSeconds: data?.refreshExpiresAtEpochSeconds,
  };
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const trimmed = username.trim();
  if (!trimmed) return false;

  const res = await apiClient.get("/api/auth/check-username", {
    params: { username: trimmed },
  });
  return pickBooleanAvailable(res.data);
}

export async function checkPhoneAvailable(phoneNumber: string): Promise<boolean> {
  const trimmed = phoneNumber.replace(/[^0-9]/g, "");
  if (!trimmed) return false;

  const res = await apiClient.get("/api/auth/check-phone", {
    params: { phoneNumber: trimmed },
  });
  return pickBooleanAvailable(res.data);
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;

  const res = await apiClient.get("/api/auth/check-email", {
    params: { email: trimmed },
  });
  return pickBooleanAvailable(res.data);
}

export async function sendEmailVerificationCode(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  await apiClient.post("/api/auth/email/send-code", { email: trimmed });
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const res = await apiClient.post("/api/auth/email/verify-code", {
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });
  const body = res.data;
  const verified = body?.data?.verified ?? body?.verified;
  if (typeof verified !== "boolean") {
    throw new Error("INVALID_VERIFY_RESPONSE");
  }
  return verified;
}

export async function signup(req: SignupRequest): Promise<void> {
  if (!req.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  await apiClient.post("/api/auth/signup", {
    username: req.username.trim(),
    email: req.email.trim().toLowerCase(),
    password: req.password,
    phoneNumber: req.phoneNumber.replace(/[^0-9]/g, ""),
    residenceType: req.residenceType,
    rentType: req.rentType,
    address: req.address?.trim() || "",
    emailVerified: true,
  });
}
