import { apiClient } from "./apiClient";
import { getAccessToken } from "@/src/store/tokenStorage";

export type ResidenceType = "ONE_ROOM" | "OFFICETEL" | "APT" | "VILLA" | "HOUSE" | "ETC";
export type RentType = "NONE" | "MONTHLY" | "JEONSE" | "SALE";

export type Me = {
  username: string;
  phoneNumber?: string;
  residenceType: ResidenceType;
  rentType: RentType;
  address: string;
};

export type UpdateMeRequest = Pick<Me, "residenceType" | "rentType" | "address"> & {
  phoneNumber?: string;
};

async function isDevMode(): Promise<boolean> {
  const token = await getAccessToken();
  return token === "DEV_TOKEN" || token === "LOCAL_DEV_TOKEN";
}

const mockMe: Me = {
  username: "dev_user",
  phoneNumber: "010-0000-0000",
  residenceType: "ONE_ROOM",
  rentType: "MONTHLY",
  address: "서울시 어딘가 101동 1004호",
};

function normalizeMe(input: any): Me {
  const residenceType: ResidenceType = (["ONE_ROOM", "OFFICETEL", "APT", "VILLA", "HOUSE", "ETC"] as const).includes(input?.residenceType)
    ? input.residenceType
    : "ONE_ROOM";
  const rentType: RentType = (["NONE", "MONTHLY", "JEONSE", "SALE"] as const).includes(input?.rentType)
    ? input.rentType
    : "MONTHLY";

  return {
    username: input?.username ?? mockMe.username,
    phoneNumber: input?.phoneNumber ?? mockMe.phoneNumber,
    residenceType,
    rentType,
    address: input?.address ?? mockMe.address,
  };
}

export async function getMe(): Promise<Me> {
  if (await isDevMode()) return mockMe;

  try {
    const res = await apiClient.get("/api/users/me");
    const body = res.data;
    return normalizeMe(body?.data ?? body);
  } catch {
    return mockMe;
  }
}

export async function updateMe(req: UpdateMeRequest): Promise<Me> {
  if (await isDevMode()) {
    return { ...mockMe, ...req };
  }

  try {
    const res = await apiClient.put("/api/users/me", {
      residenceType: req.residenceType,
      rentType: req.rentType,
      address: req.address,
      phoneNumber: req.phoneNumber,
    });
    const body = res.data;
    return normalizeMe(body?.data ?? body);
  } catch {
    return { ...mockMe, ...req };
  }
}
