import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { getMe, Me } from "@/src/api/users";
import { getHistoryDetail, HistoryDetail } from "@/src/api/histories";
import { getMyReportById, getReportDraft, upsertReportDraft, markReportSubmitted, ReportDraft, MyReportItem } from "@/src/api/reports";

function fmtIssue(t: HistoryDetail["issueType"]) {
  switch (t) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    default:
      return "기타";
  }
}

function fmtRec(t: HistoryDetail["recommendation"]) {
  switch (t) {
    case "DIY":
      return "DIY 권장";
    case "PRO":
      return "전문업체 권장";
    default:
      return t;
  }
}

// 자동으로 입력되는 것: 프로필, 진단결과
// 사용자가 추가로 입력해야하는 것: 조치/비용/전후사진/비고 등
export default function ReportDetail() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const [loading, setLoading] = useState(true);
  const [base, setBase] = useState<MyReportItem | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [history, setHistory] = useState<HistoryDetail | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);

  const [actionType, setActionType] = useState<"DIY" | "PRO">("DIY");
  const [cleanedAt, setCleanedAt] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [workTimeMinutes, setWorkTimeMinutes] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [notes, setNotes] = useState("");
  const [beforePhotoUri, setBeforePhotoUri] = useState<string | null>(null);
  const [afterPhotoUri, setAfterPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!reportId) return;

        const baseItem = await getMyReportById(String(reportId));
        if (!baseItem) {
          Alert.alert("리포트 없음", "해당 리포트를 찾지 못했어요.");
          router.back();
          return;
        }
        setBase(baseItem);

        const [meData, historyData, draftData] = await Promise.all([
          getMe(),
          getHistoryDetail(baseItem.historyId),
          getReportDraft(baseItem.reportId),
        ]);

        setMe(meData);
        setHistory(historyData);

        // draft가 없으면 기본값(자동 추천 기반)으로 초기화해 저장까지 해둠
        const diagnosisImageUris = historyData.imageUris ?? baseItem.diagnosisImageUris ?? [];

        if (!draftData) {
          const init: Partial<ReportDraft> = {
            historyId: baseItem.historyId,
            actionType: baseItem.recommendation === "PRO" ? "PRO" : "DIY",
            beforePhotoUri: null,
            afterPhotoUri: null,
            diagnosisImageUris,
          };
          const created = await upsertReportDraft(baseItem.reportId, init);
          setDraft(created);
          setActionType(created.actionType ?? "DIY");
          setBeforePhotoUri(created.beforePhotoUri ?? null);
          setAfterPhotoUri(created.afterPhotoUri ?? null);
        } else {
          setDraft(draftData);
          setActionType(draftData.actionType ?? (baseItem.recommendation === "PRO" ? "PRO" : "DIY"));
          setCleanedAt(draftData.cleanedAt ?? "");
          setWorkSummary(draftData.workSummary ?? "");
          setWorkTimeMinutes(draftData.workTimeMinutes ? String(draftData.workTimeMinutes) : "");
          setMaterialsCost(draftData.materialsCost ? String(draftData.materialsCost) : "");
          setLaborCost(draftData.laborCost ? String(draftData.laborCost) : "");
          setNotes(draftData.notes ?? "");
          setBeforePhotoUri(draftData.beforePhotoUri ?? null);
          setAfterPhotoUri(draftData.afterPhotoUri ?? null);
          // 진단 원본 사진은 자동 채움(없으면 history에서 가져온 값으로 보완)
          if (!draftData.diagnosisImageUris || draftData.diagnosisImageUris.length === 0) {
            await upsertReportDraft(baseItem.reportId, { diagnosisImageUris });
          }
        }
      } catch {
        Alert.alert("불러오기 실패", "서버/로그인 상태를 확인해주세요.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reportId]);

  const isCompleteEnough = useMemo(() => {
    // MVP 기준: 최소 보완 조건
    // - 작업 요약 필수
    // - 비용(자재비/인건비 중 하나) 필수
    const hasAnyCost = Number(materialsCost) > 0 || Number(laborCost) > 0;
    const hasSummary = workSummary.trim().length > 0;
    return hasAnyCost && hasSummary;
  }, [materialsCost, laborCost, workSummary]);

  async function pickPhoto(kind: "before" | "after") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 접근 권한을 허용해주세요.");
      return;
    }

    // NOTE: 일부 expo-image-picker 버전에서는 MediaType enum이 없어 MediaTypeOptions를 사용해야 타입 에러가 나지 않음
    // 이후에 어떤 조치를 해야할듯?
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;

    if (kind === "before") setBeforePhotoUri(uri);
    else setAfterPhotoUri(uri);
  }

  async function saveDraft(silent?: boolean) {
    if (!base) return;
    try {
      const next = await upsertReportDraft(base.reportId, {
        historyId: base.historyId,
        actionType,
        cleanedAt: cleanedAt.trim() || undefined,
        workSummary: workSummary.trim() || undefined,
        workTimeMinutes: workTimeMinutes ? Number(workTimeMinutes) : undefined,
        materialsCost: materialsCost ? Number(materialsCost) : undefined,
        laborCost: laborCost ? Number(laborCost) : undefined,
        notes: notes.trim() || undefined,
        beforePhotoUri,
        afterPhotoUri,
        diagnosisImageUris: history?.imageUris ?? base.diagnosisImageUris ?? [],
      });
      setDraft(next);
      if (!silent) Alert.alert("저장 완료", "리포트 보완 내용이 저장되었습니다.");
    } catch {
      if (!silent) Alert.alert("저장 실패", "다시 시도해주세요.");
    }
  }

  async function markReady() {
    if (!base) return;
    if (!isCompleteEnough) {
      Alert.alert("아직 부족해요", "작업 요약 + 비용(자재비/인건비 중 하나)을 입력하면 리포트를 '제출용'으로 표시할 수 있어요.");
      return;
    }
    await saveDraft(true);
    await markReportSubmitted(base.reportId);
    Alert.alert("완료", "리포트가 제출용(READY) 상태가 되었어요. 이제 마이페이지에서 PDF 버튼이 활성화됩니다.");
    router.back();
  }

  if (loading) {
    return <ScreenState loading />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>리포트 보완</Text>

      {/* 자동 채움: 기본/주거 */}
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>기본 정보(자동)</Text>
        <Text>리포트 ID: {base?.reportId}</Text>
        <Text>작성일시: {base?.createdAt}</Text>
        <Text>사용자: {me?.username ?? "-"}</Text>
        <Text>주소: {me?.address ?? "-"}</Text>
      </View>

      {/* 자동 채움: 문제 상세 */}
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>문제 상세(자동)</Text>
        {history ? (
          <>
            <Text>문제 유형: {fmtIssue(history.issueType)}</Text>
            <Text>위험도: {history.riskScore}</Text>
            <Text>권장: {fmtRec(history.recommendation)}</Text>
            <Text>원인 추정: {history.cause ?? "-"}</Text>
            <Text>자연/과실 참고: {history.naturalOrHuman ?? "-"}</Text>
            <Text>주의사항: {history.caution ?? "-"}</Text>
          </>
        ) : (
          <Text style={{ opacity: 0.7 }}>진단 정보를 불러오지 못했어요.</Text>
        )}
      </View>

      {/* 사용자 보완: 조치/비용 */}
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>조치/비용(보완)</Text>

        <Text style={{ fontWeight: "700" }}>조치 방식</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["DIY", "PRO"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setActionType(t)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderRadius: 999,
                opacity: actionType === t ? 1 : 0.6,
              }}
            >
              <Text>{t === "DIY" ? "DIY" : "전문업체"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ fontWeight: "700" }}>청소/수리 날짜(선택)</Text>
        <TextInput value={cleanedAt} onChangeText={setCleanedAt} placeholder="YYYY-MM-DD" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

        <Text style={{ fontWeight: "700" }}>작업 내용 요약(필수)</Text>
        <TextInput value={workSummary} onChangeText={setWorkSummary} placeholder="예) 곰팡이 제거제 사용 후 재도장" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

        <Text style={{ fontWeight: "700" }}>작업 소요 시간(분, 선택)</Text>
        <TextInput value={workTimeMinutes} onChangeText={setWorkTimeMinutes} keyboardType="numeric" placeholder="예) 90" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

        <Text style={{ fontWeight: "700" }}>자재비 합계(필수 중 하나)</Text>
        <TextInput value={materialsCost} onChangeText={setMaterialsCost} keyboardType="numeric" placeholder="예) 35000" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

        <Text style={{ fontWeight: "700" }}>인건비(전문업체, 선택)</Text>
        <TextInput value={laborCost} onChangeText={setLaborCost} keyboardType="numeric" placeholder="예) 120000" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

        <Text style={{ fontWeight: "700" }}>비고/특이사항(선택)</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="예) 재발 방지 위해 제습기 사용 시작" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />
      </View>

      {/* 사용자 보완: 증빙(전/후 사진) */}
      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>증빙 자료(보완)</Text>

        {/* 자동: 진단에 사용한 원본 사진(참고) */}
        {history?.imageUris && history.imageUris.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "700" }}>진단에 사용한 사진(자동)</Text>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {history.imageUris.slice(0, 6).map((uri, idx) => (
                <Image key={`${uri}_${idx}`} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 10, borderWidth: 1 }} />
              ))}
            </View>
            {history.imageUris.length > 6 && <Text style={{ opacity: 0.7 }}>+ {history.imageUris.length - 6}장 더 있음</Text>}
          </View>
        ) : (
          <View style={{ gap: 8, opacity: 0.7 }}>
            <Text style={{ fontWeight: "700" }}>진단에 사용한 사진(자동)</Text>
            <Text>진단 사진이 없어요.</Text>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>수리/청소 전 사진(선택)</Text>
          {beforePhotoUri ? (
            <Image source={{ uri: beforePhotoUri }} style={{ width: "100%", height: 180, borderRadius: 12, borderWidth: 1 }} />
          ) : (
            <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, opacity: 0.7 }}>
              <Text>사진 없음</Text>
            </View>
          )}
          <Pressable onPress={() => pickPhoto("before")} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
            <Text>{beforePhotoUri ? "사진 바꾸기" : "사진 추가"}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>수리/청소 후 사진(선택)</Text>
          {afterPhotoUri ? (
            <Image source={{ uri: afterPhotoUri }} style={{ width: "100%", height: 180, borderRadius: 12, borderWidth: 1 }} />
          ) : (
            <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, opacity: 0.7 }}>
              <Text>사진 없음</Text>
            </View>
          )}
          <Pressable onPress={() => pickPhoto("after")} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
            <Text>{afterPhotoUri ? "사진 바꾸기" : "사진 추가"}</Text>
          </Pressable>
        </View>
      </View>

      {/* 저장/제출 */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => saveDraft()} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
          <Text>임시 저장</Text>
        </Pressable>
        <Pressable
          onPress={markReady}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderWidth: 1,
            borderRadius: 12,
            alignItems: "center",
            opacity: isCompleteEnough ? 1 : 0.5,
          }}
        >
          <Text>제출용 표시</Text>
        </Pressable>
      </View>

      <View style={{ padding: 12, borderWidth: 1, borderRadius: 12, opacity: 0.7 }}>
        <Text style={{ fontWeight: "700" }}>자동 생성 문구</Text>
        <Text>본 리포트는 사진 기반 AI 분석 결과를 참고하여 생성됨</Text>
      </View>

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text>뒤로</Text>
      </Pressable>

      {/* 디버그용 */}
      {draft ? <Text style={{ opacity: 0.4 }}>draft saved</Text> : null}
    </ScrollView>
  );
}
