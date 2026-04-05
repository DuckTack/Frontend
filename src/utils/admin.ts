import { router } from "expo-router";
import type { IssueType } from "../api/histories";
import { getIsAdmin } from "../store/tokenStorage";

export async function ensureAdminOrRedirect() {
  const allowed = await getIsAdmin();
  if (!allowed) {
    router.replace("/(tabs)");
    return false;
  }
  return true;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function issueTypeLabel(t?: IssueType | string) {
  switch (t) {
    case "CRACK": return "균열";
    case "LEAK": return "누수";
    case "MOLD": return "곰팡이";
    case "DAMAGE": return "파손";
    case "ELECTRIC": return "전기";
    case "GAS": return "가스";
    default: return "기타";
  }
}
