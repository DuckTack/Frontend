import { apiClient } from "./apiClient";
import { getAccessToken } from "@/src/store/tokenStorage";

export type ResidenceType = "ONE_ROOM" | "APARTMENT" | "VILLA" | "OFFICETEL" | "OTHER";
export type RentType = "MONTHLY" | "JEONSE" | "SALE";

export type Me = {
  username: string;
  phoneNumber?: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address: string; // 동·호수 단위 포함
};

export type UpdateMeRequest = Pick<Me, "residenceType" | "rentType" | "address">;

async function isDevMode(): Promise<boolean> {
  const token = await getAccessToken();
  return token === "DEV_TOKEN";
}

const mockMe: Me = {
  username: "dev_user",
  phoneNumber: "010-0000-0000",
  residenceType: "ONE_ROOM",
  rentType: "MONTHLY",
  address: "서울시 어딘가 101동 1004호",
};

export async function getMe(): Promise<Me> {
  // DEV 모드면 서버 호출 없이도 화면이 항상 동작
  if (await isDevMode()) return mockMe;

  try {
    const res = await apiClient.get("/api/users/me");
    const body = res.data;
    return (body?.data ?? body) as Me;
  } catch {
    // 백엔드가 아직 없거나 스펙이 흔들릴 때: 앱이 죽지 않도록 fallback
    return mockMe;
  }
}

export async function updateMe(req: UpdateMeRequest): Promise<Me> {
  if (await isDevMode()) {
    return { ...mockMe, ...req };
  }

  try {
    const res = await apiClient.put("/api/users/me", req);
    const body = res.data;
    return (body?.data ?? body) as Me;
  } catch {
    return { ...mockMe, ...req };
  }
}
