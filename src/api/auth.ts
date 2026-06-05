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

export type ResidenceType =
    | "ONE_ROOM"
    | "OFFICETEL"
    | "APT"
    | "VILLA"
    | "HOUSE"
    | "ETC";

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

function normalizePhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function pickBooleanAvailable(body: any): boolean {
  const data = body?.data ?? body;

  if (typeof data === "boolean") return data;

  const positiveKeys = [
    "available",
    "isAvailable",
    "emailAvailable",
    "usernameAvailable",
    "phoneAvailable",
    "phoneNumberAvailable",
  ];

  for (const key of positiveKeys) {
    if (typeof data?.[key] === "boolean") return data[key];
    if (typeof body?.[key] === "boolean") return body[key];
  }

  const negativeKeys = [
    "duplicated",
    "duplicate",
    "exists",
    "alreadyExists",
    "used",
    "taken",
  ];

  for (const key of negativeKeys) {
    if (typeof data?.[key] === "boolean") return !data[key];
    if (typeof body?.[key] === "boolean") return !body[key];
  }

  console.warn(
      "[중복검사] 사용 가능 여부를 해석할 수 없는 응답:",
      JSON.stringify(body, null, 2)
  );

  throw new Error("INVALID_AVAILABLE_RESPONSE");
}

function pickBooleanFlag(body: any, fieldName: string): boolean {
  const data = body?.data ?? body;

  if (typeof data === "boolean") return data;

  const value = data?.[fieldName] ?? body?.[fieldName];

  if (typeof value !== "boolean") {
    console.warn(
        `[${fieldName}] 응답 해석 실패:`,
        JSON.stringify(body, null, 2)
    );
    throw new Error(`INVALID_${fieldName.toUpperCase()}_RESPONSE`);
  }

  return value;
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post("/api/auth/login", {
    username: req.username.trim(),
    password: req.password,
  });

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

  try {
    const res = await apiClient.get("/api/auth/check-username", {
      params: { username: trimmed },
    });

    console.log("[아이디 중복검사] 요청:", trimmed);
    console.log("[아이디 중복검사] 응답:", JSON.stringify(res.data, null, 2));

    return pickBooleanAvailable(res.data);
  } catch (error: any) {
    console.log("[아이디 중복검사] 실패:", {
      username: trimmed,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function checkPhoneAvailable(phoneNumber: string): Promise<boolean> {
  const normalized = normalizePhone(phoneNumber);

  if (!normalized) return false;

  try {
    const res = await apiClient.get("/api/auth/check-phone", {
      params: { phoneNumber: normalized },
    });

    console.log("[휴대폰 중복검사] 요청:", {
      input: phoneNumber,
      normalized,
    });

    console.log("[휴대폰 중복검사] 응답:", JSON.stringify(res.data, null, 2));

    return pickBooleanAvailable(res.data);
  } catch (error: any) {
    console.log("[휴대폰 중복검사] 실패:", {
      input: phoneNumber,
      normalized,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  if (!normalized) return false;

  try {
    const res = await apiClient.get("/api/auth/check-email", {
      params: { email: normalized },
    });

    console.log("[이메일 중복검사] 요청:", normalized);
    console.log("[이메일 중복검사] 응답:", JSON.stringify(res.data, null, 2));

    const available = pickBooleanAvailable(res.data);

    console.log(
        "[이메일 중복검사] 해석 결과:",
        available ? "사용 가능" : "사용 불가"
    );

    return available;
  } catch (error: any) {
    console.log("[이메일 중복검사] 실패:", {
      email: normalized,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function sendEmailVerificationCode(email: string): Promise<void> {
  const normalized = normalizeEmail(email);

  try {
    console.log("[회원가입 이메일 인증] 발송 요청:", normalized);

    await apiClient.post("/api/auth/email/send-code", {
      email: normalized,
    });

    console.log("[회원가입 이메일 인증] 발송 요청 성공:", normalized);
  } catch (error: any) {
    console.log("[회원가입 이메일 인증] 발송 실패:", {
      email: normalized,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function verifyEmailCode(
    email: string,
    code: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();

  try {
    const res = await apiClient.post("/api/auth/email/verify-code", {
      email: normalizedEmail,
      code: normalizedCode,
    });

    console.log("[회원가입 이메일 인증] 인증 응답:", JSON.stringify(res.data, null, 2));

    return pickBooleanFlag(res.data, "verified");
  } catch (error: any) {
    console.log("[회원가입 이메일 인증] 인증 실패:", {
      email: normalizedEmail,
      code: normalizedCode,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function sendPasswordResetCode(email: string): Promise<void> {
  const normalized = normalizeEmail(email);

  try {
    console.log("[비밀번호 재설정] 인증코드 발송 요청:", normalized);

    await apiClient.post("/api/auth/password/send-reset-code", {
      email: normalized,
    });

    console.log("[비밀번호 재설정] 인증코드 발송 요청 성공:", normalized);
  } catch (error: any) {
    console.log("[비밀번호 재설정] 인증코드 발송 실패:", {
      email: normalized,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      url: error?.config?.url,
    });

    throw error;
  }
}

export async function verifyPasswordResetCode(
    email: string,
    code: string
): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();

  try {
    const res = await apiClient.post("/api/auth/password/verify-reset-code", {
      email: normalizedEmail,
      code: normalizedCode,
    });

    console.log("[비밀번호 재설정] 인증코드 확인 응답:", JSON.stringify(res.data, null, 2));

    return pickBooleanFlag(res.data, "verified");
  } catch (error: any) {
    console.log("[비밀번호 재설정] 인증코드 확인 실패:", {
      email: normalizedEmail,
      code: normalizedCode,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function resetPassword(req: {
  username: string;
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  try {
    await apiClient.post("/api/auth/password/reset", {
      username: req.username.trim(),
      email: normalizeEmail(req.email),
      code: req.code.trim(),
      newPassword: req.newPassword,
    });

    console.log("[비밀번호 재설정] 비밀번호 변경 성공:", {
      username: req.username.trim(),
      email: normalizeEmail(req.email),
    });
  } catch (error: any) {
    console.log("[비밀번호 재설정] 비밀번호 변경 실패:", {
      username: req.username.trim(),
      email: normalizeEmail(req.email),
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}

export async function signup(req: SignupRequest): Promise<void> {
  if (!req.emailVerified) {
    throw new Error("EMAIL_NOT_VERIFIED");
  }

  const normalizedPhone = normalizePhone(req.phoneNumber);
  const normalizedEmail = normalizeEmail(req.email);

  try {
    console.log("[회원가입] 요청:", {
      username: req.username.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      residenceType: req.residenceType,
      rentType: req.rentType,
      address: req.address?.trim() || "",
    });

    await apiClient.post("/api/auth/signup", {
      username: req.username.trim(),
      email: normalizedEmail,
      password: req.password,
      phoneNumber: normalizedPhone,
      residenceType: req.residenceType,
      rentType: req.rentType,
      address: req.address?.trim() || "",
      emailVerified: true,

      termsAgreed: true,
      privacyAgreed: true,
      marketingAgreed: false,
    });

    console.log("[회원가입] 성공:", {
      username: req.username.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
    });
  } catch (error: any) {
    console.log("[회원가입] 실패:", {
      username: req.username.trim(),
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw error;
  }
}