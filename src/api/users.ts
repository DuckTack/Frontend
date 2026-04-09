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
  phoneNumber?: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address: string;
};

export type UpdateMeRequest = Pick<
    Me,
    "residenceType" | "rentType" | "address"
> & {
  phoneNumber?: string;
};

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
  if (await isDevMode()) return mockMe;

  const res = await apiClient.get("/api/users/me");
  const body = res.data;
  const data = body?.data ?? body;

  return {
    username: data.username,
    phoneNumber: data.phoneNumber ?? "",
    residenceType: data.residenceType,
    rentType: data.rentType,
    address: data.address ?? "",
  };
}

export async function updateMe(req: UpdateMeRequest): Promise<Me> {
  if (await isDevMode()) {
    return { ...mockMe, ...req };
  }

  const res = await apiClient.put("/api/users/me", req);
  const body = res.data;
  const data = body?.data ?? body;

  return {
    username: data.username,
    phoneNumber: data.phoneNumber ?? "",
    residenceType: data.residenceType,
    rentType: data.rentType,
    address: data.address ?? "",
  };
}