import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import ScreenState from "../../src/components/ScreenState";
import { getMe, Me } from "../../src/api/users";
import { getHistoryDetail, HistoryDetail } from "../../src/api/histories";
import {
  generateReport,
  getPdfUrl,
  saveReportDraft,
  type ReportStatus,
  uploadReportImages,
} from "../../src/api/reports";
import {
  EMPTY_DRAFT,
  loadReportDraft,
  saveLocalReportDraft,
  type ReportDraft,
} from "../../src/store/reportDraftStorage";

const MAIN_BLUE = "#3b82f6";

type ImageField = "beforeImageUris" | "afterImageUris";

function fmtIssue(t: HistoryDetail["issueType"]) {
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

function fmtRec(t: HistoryDetail["recommendation"]) {
  return t === "DIY" ? "DIY 권장" : "전문업체 권장";
}

function reportStatusFromHistory(history: HistoryDetail): ReportStatus {
  if (history.status === "FAILED") return "FAILED";
  if (history.report) return "READY";
  return "GENERATING";
}

function createEmptyDraft(): ReportDraft {
  return { ...EMPTY_DRAFT };
}

export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);
  const [draft, setDraft] = useState<ReportDraft>(createEmptyDraft());

  const reportBase = useMemo(() => {
    if (!history) return null;
    return {
      reportId: String(reportId ?? history.id),
      historyId: String(history.id),
      diagnosisId: String(history.diagnosisId ?? ""),
      createdAt: history.createdAt,
      issueType: history.issueType,
      riskScore: history.riskScore,
      recommendation: history.recommendation,
      status: reportStatusFromHistory(history),
    };
  }, [history, reportId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (!reportId) return;

      const [meData, historyData, draftData] = await Promise.all([
        getMe().catch(() => null),
        getHistoryDetail(String(reportId)).catch(() => null),
        loadReportDraft(String(reportId)).catch(() => null),
      ]);

      setMe(meData);
      setHistory(historyData);
      setDraft(draftData ?? createEmptyDraft());
    } catch (e) {
      console.error("데이터 로딩 실패:", e);
      Alert.alert("오류", "데이터를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickImages(targetField: ImageField) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "사진 첨부를 위해 사진 접근 권한이 필요합니다.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (result.canceled) return;

    const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
    if (uris.length === 0) return;

    setDraft((prev) => ({
      ...prev,
      [targetField]: [...prev[targetField], ...uris],
    }));
  }

  function removeImage(targetField: ImageField, index: number) {
    setDraft((prev) => ({
      ...prev,
      [targetField]: prev[targetField].filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function handleSaveDraft() {
    if (!reportId) return;

    try {
      setSavingDraft(true);
      await saveLocalReportDraft(String(reportId), draft);

      if (!reportBase?.diagnosisId) {
        Alert.alert("임시 저장 완료", "진단 ID가 준비되면 서버 저장을 진행할 수 있습니다.");
        return;
      }

      const [beforeUploads, afterUploads] = await Promise.all([
        uploadReportImages(draft.beforeImageUris),
        uploadReportImages(draft.afterImageUris),
      ]);

      await saveReportDraft(String(reportBase.diagnosisId), {
        repairMethod: draft.repairMethod,
        repairDate: draft.repairDate,
        contractorName: draft.contractorName,
        contractorContact: draft.contractorContact,
        repairSummary: draft.repairSummary,
        actualCostKrw: Number(draft.totalCost || draft.materialCost || draft.diyMaterialCost || 0),
        notes: draft.notes,
        materialCost: draft.materialCost,
        laborCost: draft.laborCost,
        totalCost: draft.totalCost,
        diyMaterialsUsed: draft.diyMaterialsUsed,
        diyMaterialCost: draft.diyMaterialCost,
        diyWorkMemo: draft.diyWorkMemo,
        beforeImageKeys: beforeUploads.map((file) => file.fileKey).filter(Boolean),
        afterImageKeys: afterUploads.map((file) => file.fileKey).filter(Boolean),
      });
      Alert.alert("저장 완료", "서버와 로컬 임시 저장이 완료되었습니다.");
    } catch (e) {
      console.error("report draft save failed", e);
      Alert.alert("저장 실패", "서버 저장 중 문제가 발생했지만, 로컬 임시 저장은 유지됩니다.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleGenerate() {
    if (!reportBase?.diagnosisId) return;
    try {
      await generateReport(reportBase.diagnosisId);
      Alert.alert("생성 요청 완료", "리포트 생성이 시작되었습니다.");
      await load();
    } catch {
      Alert.alert("생성 실패", "리포트 생성 요청에 실패했습니다.");
    }
  }

  async function handleOpenPdf() {
    if (!reportBase?.diagnosisId) return;
    try {
      const url = await getPdfUrl(reportBase.diagnosisId);
      if (url) await Linking.openURL(url);
    } catch {
      Alert.alert("열기 실패", "PDF 주소를 가져올 수 없습니다.");
    }
  }

  if (loading) return <ScreenState loading />;
  if (!history) return <ScreenState title="리포트 없음" errorMessage="해당 리포트를 찾을 수 없습니다." />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1e293b" />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>리포트 상세</Text>
            <Text style={styles.headerSubtitle}>진단 결과 및 수리 내역을 확인하세요</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={20} color={MAIN_BLUE} />
            <Text style={styles.cardTitle}>기본 정보</Text>
          </View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>리포트 ID</Text><Text style={styles.infoValue}>{reportBase?.reportId || "-"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>작성일시</Text><Text style={styles.infoValue}>{reportBase?.createdAt ? new Date(reportBase.createdAt).toISOString().slice(0, 10) : "-"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>사용자</Text><Text style={styles.infoValue}>{me?.username || "-"}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>연락처</Text><Text style={styles.infoValue}>{me?.phoneNumber || "-"}</Text></View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>주소</Text><Text style={styles.infoValue}>{me?.address || "-"}</Text></View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>자동 반영 정보</Text>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: '#eff6ff' }]}><Text style={[styles.badgeText, { color: MAIN_BLUE }]}>{fmtIssue(history.issueType)}</Text></View>
            <View style={[styles.badge, { backgroundColor: '#fff7ed' }]}><Text style={[styles.badgeText, { color: '#f97316' }]}>위험도 {history.riskScore}</Text></View>
            <View style={[styles.badge, { backgroundColor: '#f0fdf4' }]}><Text style={[styles.badgeText, { color: '#16a34a' }]}>{fmtRec(history.recommendation)}</Text></View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="create-outline" size={20} color="#6366f1" />
            <Text style={styles.cardTitle}>수리 후 직접 입력</Text>
          </View>

          <View style={styles.tabContainer}>
            <Pressable onPress={() => setDraft((prev) => ({ ...prev, repairMethod: "DIY" }))} style={[styles.tab, draft.repairMethod === "DIY" && styles.tabActive]}>
              <Text style={[styles.tabText, draft.repairMethod === "DIY" && styles.tabTextActive]}>직접 수리</Text>
            </Pressable>
            <Pressable onPress={() => setDraft((prev) => ({ ...prev, repairMethod: "PRO" }))} style={[styles.tab, draft.repairMethod === "PRO" && styles.tabActive]}>
              <Text style={[styles.tabText, draft.repairMethod === "PRO" && styles.tabTextActive]}>전문업체 수리</Text>
            </Pressable>
          </View>

          <TextInput
            value={draft.repairDate}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, repairDate: text }))}
            placeholder="수리 완료일 (예: 2026-04-06)"
            style={styles.input}
            placeholderTextColor="#94a3b8"
          />

          {draft.repairMethod === "DIY" ? (
            <View style={{ gap: 10 }}>
              <TextInput value={draft.diyMaterialsUsed} onChangeText={(text) => setDraft((p) => ({ ...p, diyMaterialsUsed: text }))} placeholder="사용한 자재" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.diyMaterialCost || draft.materialCost} onChangeText={(text) => setDraft((p) => ({ ...p, diyMaterialCost: text, materialCost: text }))} placeholder="자재비" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.diyWorkMemo} multiline onChangeText={(text) => setDraft((p) => ({ ...p, diyWorkMemo: text }))} placeholder="직접 수리 메모" style={styles.textArea} placeholderTextColor="#94a3b8" />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput value={draft.contractorName} onChangeText={(text) => setDraft((p) => ({ ...p, contractorName: text }))} placeholder="업체명" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.contractorContact} onChangeText={(text) => setDraft((p) => ({ ...p, contractorContact: text }))} placeholder="업체 연락처" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.materialCost} onChangeText={(t) => setDraft(p => ({ ...p, materialCost: t }))} placeholder="재료비" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.laborCost} onChangeText={(t) => setDraft(p => ({ ...p, laborCost: t }))} placeholder="인건비" style={styles.input} placeholderTextColor="#94a3b8" />
              <TextInput value={draft.totalCost} onChangeText={(t) => setDraft(p => ({ ...p, totalCost: t }))} placeholder="총 비용" style={[styles.input, { color: MAIN_BLUE, fontWeight: '700' }]} placeholderTextColor="#94a3b8" />
            </View>
          )}

          <TextInput value={draft.repairSummary} multiline onChangeText={(text) => setDraft((p) => ({ ...p, repairSummary: text }))} placeholder="실제 작업 요약" style={[styles.textArea, { marginTop: 10 }]} placeholderTextColor="#94a3b8" />
          <TextInput value={draft.notes} multiline onChangeText={(text) => setDraft((p) => ({ ...p, notes: text }))} placeholder="추가 메모" style={[styles.textArea, { marginTop: 10 }]} placeholderTextColor="#94a3b8" />

          <View style={[styles.imageSection, { marginTop: 14 }]}> 
            <View style={styles.imageSectionHeader}>
              <Text style={styles.imageSectionTitle}>수리 전 사진</Text>
              <Pressable style={styles.imageAddButton} onPress={() => pickImages("beforeImageUris")}>
                <Ionicons name="images-outline" size={16} color={MAIN_BLUE} />
                <Text style={styles.imageAddButtonText}>이미지 첨부</Text>
              </Pressable>
            </View>
            {draft.beforeImageUris.length === 0 ? (
              <View style={styles.emptyImageBox}><Text style={styles.emptyImageText}>첨부한 사진이 없습니다.</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
                {draft.beforeImageUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imagePreviewCard}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <Pressable style={styles.imageRemoveButton} onPress={() => removeImage("beforeImageUris", index)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.imageSection}>
            <View style={styles.imageSectionHeader}>
              <Text style={styles.imageSectionTitle}>수리 후 사진</Text>
              <Pressable style={styles.imageAddButton} onPress={() => pickImages("afterImageUris")}>
                <Ionicons name="images-outline" size={16} color={MAIN_BLUE} />
                <Text style={styles.imageAddButtonText}>이미지 첨부</Text>
              </Pressable>
            </View>
            {draft.afterImageUris.length === 0 ? (
              <View style={styles.emptyImageBox}><Text style={styles.emptyImageText}>첨부한 사진이 없습니다.</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContent}>
                {draft.afterImageUris.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imagePreviewCard}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <Pressable style={styles.imageRemoveButton} onPress={() => removeImage("afterImageUris", index)}>
                      <Ionicons name="close-circle" size={22} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <Pressable onPress={handleSaveDraft} disabled={savingDraft} style={[styles.saveButton, savingDraft && { opacity: 0.6 }]}> 
            {savingDraft ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>후입력 정보 임시 저장</Text>}
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable onPress={handleGenerate} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>PDF 생성 요청</Text>
          </Pressable>
          <Pressable onPress={handleOpenPdf} disabled={reportBase?.status !== "READY"} style={[styles.primaryButton, reportBase?.status !== "READY" && { backgroundColor: '#cbd5e1' }]}> 
            <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.primaryButtonText}>PDF 열기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#1e293b" },
  headerSubtitle: { fontSize: 14, color: "#64748b", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#334155" },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },
  infoValue: { fontSize: 14, color: "#1e293b", fontWeight: "700", flex: 1, textAlign: "right" },
  badgeContainer: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  tabContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, height: 46, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: MAIN_BLUE },
  tabText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  tabTextActive: { color: "#fff" },
  input: { height: 52, backgroundColor: "#f8fafc", borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, color: "#1e293b", marginBottom: 10 },
  textArea: { minHeight: 100, backgroundColor: "#f8fafc", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", fontSize: 14, textAlignVertical: 'top', color: "#1e293b" },
  imageSection: { marginTop: 14, gap: 10 },
  imageSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  imageSectionTitle: { fontSize: 14, fontWeight: "800", color: "#334155" },
  imageAddButton: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#dbeafe", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  imageAddButtonText: { fontSize: 13, fontWeight: "700", color: MAIN_BLUE },
  imageScrollContent: { gap: 10, paddingRight: 4 },
  imagePreviewCard: { width: 120, height: 120, borderRadius: 16, overflow: "hidden", backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", position: "relative" },
  imagePreview: { width: "100%", height: "100%" },
  imageRemoveButton: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 999 },
  emptyImageBox: { minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "dashed", backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  emptyImageText: { fontSize: 13, color: "#94a3b8" },
  saveButton: { marginTop: 16, height: 54, borderRadius: 16, backgroundColor: "#334155", alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  secondaryButton: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: "#64748b", fontWeight: "700", fontSize: 15 },
  primaryButton: { flex: 1.2, height: 56, borderRadius: 16, backgroundColor: MAIN_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
