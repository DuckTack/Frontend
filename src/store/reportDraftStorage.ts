import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReportDraft = {
  repairMethod: "DIY" | "PRO" | "";
  repairDate: string;
  contractorName: string;
  contractorContact: string;
  repairSummary: string;
  materialCost: string;
  laborCost: string;
  totalCost: string;
  notes: string;
};

const EMPTY_DRAFT: ReportDraft = {
  repairMethod: "",
  repairDate: "",
  contractorName: "",
  contractorContact: "",
  repairSummary: "",
  materialCost: "",
  laborCost: "",
  totalCost: "",
  notes: "",
};

function keyOf(reportId: string) {
  return `reportDraft:${reportId}`;
}

export async function loadReportDraft(reportId: string): Promise<ReportDraft> {
  const raw = await AsyncStorage.getItem(keyOf(reportId));
  if (!raw) return EMPTY_DRAFT;
  try {
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export async function saveReportDraft(reportId: string, draft: ReportDraft) {
  await AsyncStorage.setItem(keyOf(reportId), JSON.stringify(draft));
}
