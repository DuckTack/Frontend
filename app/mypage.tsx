import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import ScreenState from "../src/components/ScreenState";
import { clearAccessToken } from "../src/store/tokenStorage";
import { openReportPdf, generateReport, listMyReports, MyReportItem } from "../src/api/reports";
import { getMe, updateMe, Me, ResidenceType, RentType } from "../src/api/users";

function residenceLabel(t: ResidenceType) {
  switch (t) {
    case "ONE_ROOM": return "원룸";
    case "OFFICETEL": return "오피스텔";
    case "APT": return "아파트";
    case "VILLA": return "빌라";
    case "HOUSE": return "주택";
    default: return "기타";
  }
}

function rentLabel(t: RentType) {
  switch (t) {
    case "NONE": return "미정";
    case "MONTHLY": return "월세";
    case "JEONSE": return "전세";
    default: return "매매";
  }
}

function issueLabel(t: MyReportItem["issueType"]) {
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

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [reports, setReports] = useState<MyReportItem[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editResidenceType, setEditResidenceType] = useState<ResidenceType>("ONE_ROOM");
  const [editRentType, setEditRentType] = useState<RentType>("NONE");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");

  async function reload() {
    try {
      setLoading(true);

      const [meData, reportData] = await Promise.all([
        getMe(),
        listMyReports()
      ]);

      setMe(meData);
      setReports(reportData);

      setEditResidenceType(meData.residenceType);
      setEditRentType(meData.rentType);
      setEditPhoneNumber(meData.phoneNumber ?? "");
      setEditAddress(meData.address ?? "");

    } catch (e) {
      console.log("마이페이지 불러오기 실패:", e);
      setMe(null);
      setReports([]);
      Alert.alert("불러오기 실패", "서버 상태를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const sortedReports = useMemo(
      () => [...reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      [reports]
  );

  async function handleSaveProfile() {
    try {
      const updated = await updateMe({
        residenceType: editResidenceType,
        rentType: editRentType,
        phoneNumber: editPhoneNumber,
        address: editAddress,
      });

      setMe(updated);

      // 🔥 수정 후 PDF 다시 생성
      for (const r of reports) {
        await generateReport(r.diagnosisId);
      }

      setEditOpen(false);
      alert("수정 + PDF 갱신 완료");

    } catch (e: any) {
      console.log("프로필 수정 실패:", e);

      if (e?.response?.status === 401) {
        alert("로그인이 만료되었습니다.");
        await clearAccessToken();
        router.replace("/login");
        return;
      }

      alert("수정 실패");
    }
  }

  async function handleGenerate(report: MyReportItem) {
    try {
      await generateReport(report.diagnosisId);
      alert("PDF 생성 완료");
      await reload();
    } catch (e) {
      console.log(e);
      alert("PDF 생성 실패");
    }
  }

  async function handleDownload(report: MyReportItem) {
    try {
      await openReportPdf(report.diagnosisId);
    } catch (e) {
      console.log(e);
      alert("PDF 다운로드 실패");
    }
  }

  if (loading) return <ScreenState loading />;

  return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>마이페이지</Text>

        {/* 내 정보 */}
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>내 정보</Text>

          {me ? (
              <>
                <Text>아이디: {me.username}</Text>
                <Text>휴대폰 번호: {me.phoneNumber || "-"}</Text>
                <Text>거주 유형: {residenceLabel(me.residenceType)}</Text>
                <Text>임대 유형: {rentLabel(me.rentType)}</Text>
                <Text>주소: {me.address || "-"}</Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Pressable onPress={() => setEditOpen(v => !v)}
                             style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}>
                    <Text>{editOpen ? "수정 닫기" : "정보 수정"}</Text>
                  </Pressable>

                  <Pressable onPress={async () => {
                    await clearAccessToken();
                    router.replace("/login");
                  }}
                             style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}>
                    <Text>로그아웃</Text>
                  </Pressable>
                </View>

                {editOpen && (
                    <View style={{ marginTop: 12, gap: 10, paddingTop: 12, borderTopWidth: 1 }}>
                      <Text>거주 유형</Text>
                      <TextInput value={editResidenceType} onChangeText={(v)=>setEditResidenceType(v as any)} />

                      <Text>임대 유형</Text>
                      <TextInput value={editRentType} onChangeText={(v)=>setEditRentType(v as any)} />

                      <Text>휴대폰 번호</Text>
                      <TextInput value={editPhoneNumber} onChangeText={setEditPhoneNumber} />

                      <Text>주소</Text>
                      <TextInput value={editAddress} onChangeText={setEditAddress} />

                      <Pressable onPress={handleSaveProfile}>
                        <Text>저장</Text>
                      </Pressable>
                    </View>
                )}
              </>
          ) : (
              <Text>내 정보 없음</Text>
          )}
        </View>

        {/* 리포트 */}
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}>
          <Text style={{ fontWeight: "800" }}>리포트 내역</Text>

          {sortedReports.map((r) => (
              <Pressable
                  key={r.reportId}
                  onPress={() =>
                      router.push({
                        pathname: "/report/[reportId]",
                        params: { reportId: String(r.diagnosisId) } // 🔥 핵심 수정
                      })
                  }
                  style={{ borderWidth: 1, marginTop: 10, padding: 10 }}
              >
                <Text>{issueLabel(r.issueType)}</Text>

                <Pressable onPress={() => handleGenerate(r)}>
                  <Text>PDF 생성</Text>
                </Pressable>

                <Pressable onPress={() => handleDownload(r)}>
                  <Text>PDF 다운로드</Text>
                </Pressable>
              </Pressable>
          ))}
        </View>
      </ScrollView>
  );
}