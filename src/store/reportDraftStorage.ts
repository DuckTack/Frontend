import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReportDraft = {
  repairMethod: "DIY" | "PRO" | "";
  repairDate: string;
  repairSummary: string;
  notes: string;
  beforeImageUris: string[];
  afterImageUris: string[];
  diyMaterialsUsed: string;
  diyMaterialCost: string;
  diyWorkMemo: string;
  contractorName: string;
  contractorContact: string;
  materialCost: string;
  laborCost: string;
  totalCost: string;
};

const EMPTY_DRAFT: ReportDraft = {
  repairMethod: "",
  repairDate: "",
  repairSummary: "",
  notes: "",
  beforeImageUris: [],
  afterImageUris: [],
  diyMaterialsUsed: "",
  diyMaterialCost: "",
  diyWorkMemo: "",
  contractorName: "",
  contractorContact: "",
  materialCost: "",
  laborCost: "",
  totalCost: "",
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

export async function saveReportDraft(reportId: string, draft: {
    repairMethod: "DIY" | "PRO" | "";
    repairDate: string;
    contractorName: string;
    contractorContact: string;
    repairSummary: string;
    actualCostKrw: number;
    notes: string;
    materialCost: string;
    laborCost: string;
    totalCost: string;
    diyMaterialsUsed: string;
    diyMaterialCost: string;
    diyWorkMemo: string
}) {
  await AsyncStorage.setItem(keyOf(reportId), JSON.stringify(draft));
}
