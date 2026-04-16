import { apiClient } from "./apiClient";
import { getAccessToken } from "../store/tokenStorage";

export type ResidenceType =
    | "ONE_ROOM"
    | "OFFICETEL"
    | "APT"
    | "VILLA"
    | "HOUSE"
    | "ETC";

export type RentType = "NONE" | "MONTHLY" | "JEONSE" | "SALE";

export type Me = {
  username: string;
  email?: string;
  phoneNumber?: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address: string;
};

export type UpdateMeRequest = {
  username?: string;
  email?: string;
  phoneNumber?: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address: string;
};

async function isDevMode(): Promise<boolean> {
  const token = await getAccessToken();
  return token === "DEV_TOKEN";
}

const mockMe: Me = {
  username: "dev_user",
  email: "dev@example.com",
  phoneNumber: "010-0000-0000",
  residenceType: "ONE_ROOM",
  rentType: "MONTHLY",
  address: "서울시 어딘가 101동 1004호",
};

function normalizeMe(data: any): Me {
  return {
    username: data?.username ?? data?.loginId ?? "",
    email: data?.email ? String(data.email) : "",
    phoneNumber: data?.phoneNumber ? String(data.phoneNumber) : "",
    residenceType: data?.residenceType,
    rentType: data?.rentType,
    address: data?.address ?? "",
  };
}

export async function getMe(): Promise<Me> {
  if (await isDevMode()) return mockMe;

  const res = await apiClient.get("/api/users/me");
  const body = res.data;
  const data = body?.data ?? body;
  return normalizeMe(data);
}

export async function updateMe(req: UpdateMeRequest): Promise<Me> {
  if (await isDevMode()) {
    return { ...mockMe, ...req };
  }

  const res = await apiClient.put("/api/users/me", req);
  const body = res.data;
  const data = body?.data ?? body;
  return normalizeMe(data);
}
