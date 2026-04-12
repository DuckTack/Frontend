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

export type ResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

function pickBooleanAvailable(body: any): boolean {
  const available = body?.data?.available ?? body?.available;
  if (typeof available !== "boolean") {
    throw new Error("INVALID_AVAILABLE_RESPONSE");
  }
  return available;
}

function pickBooleanFlag(body: any, fieldName: string): boolean {
  const value = body?.data?.[fieldName] ?? body?.[fieldName];
  if (typeof value !== "boolean") {
    throw new Error(`INVALID_${fieldName.toUpperCase()}_RESPONSE`);
  }
  return value;
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
  return pickBooleanFlag(res.data, "verified");
}

// TODO(backend): 아래 비밀번호 재설정 API 경로는 프론트에서 먼저 제안한 계약입니다.
// 실제 백엔드 경로/응답 필드명이 다르면 이 파일만 맞추면 화면은 그대로 동작합니다.
export async function sendPasswordResetCode(email: string): Promise<void> {
  await apiClient.post("/api/auth/password/send-reset-code", {
    email: email.trim().toLowerCase(),
  });
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<boolean> {
  const res = await apiClient.post("/api/auth/password/verify-reset-code", {
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });
  return pickBooleanFlag(res.data, "verified");
}

export async function resetPassword(req: {
  username: string;
  email: string;
  code: string;
  newPassword: string
}): Promise<void> {
  await apiClient.post("/api/auth/password/reset", {
    username: req.username.trim(),   // 🔥 추가
    email: req.email.trim().toLowerCase(),
    code: req.code.trim(),
    newPassword: req.newPassword.trim(), // 🔥 trim도 추가
  });
}

export async function signup(req: SignupRequest): Promise<void> {
  if (!req.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  await apiClient.post("/api/auth/signup", {
    username: req.username.trim(),
    email: req.email.trim().toLowerCase(),
    password: req.password.trim(),
    phoneNumber: req.phoneNumber.replace(/[^0-9]/g, ""),
    residenceType: req.residenceType,
    rentType: req.rentType,
    address: req.address?.trim() || "",
    emailVerified: true,
    termsAgreed: true,        // 🔥 추가
    privacyAgreed: true,      // 🔥 추가
    marketingAgreed: false,   // 🔥 선택값
  });
}
