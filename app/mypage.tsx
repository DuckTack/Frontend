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

    const [meData, reportData] = await Promise.all([getMe(), listMyReports()]);

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

  const sortedReports = useMemo(() => [...reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [reports]);

  async function handleSaveProfile() {
    try {
      const updated = await updateMe({
        residenceType: editResidenceType,
        rentType: editRentType,
        phoneNumber: editPhoneNumber,
        address: editAddress,
      });
      setMe(updated);
      setEditOpen(false);
      alert("내 정보가 수정되었습니다.");
    } catch {
      alert("프로필 수정 API를 확인해주세요.");
    }
  }

  async function handleGenerate(report: MyReportItem) {
    try {
      await generateReport(report.diagnosisId);
      alert("PDF 생성 요청이 완료되었습니다.");
      await reload();
    } catch {
      alert("리포트 생성 API를 확인해주세요.");
    }
  }

  async function handleDownload(report: MyReportItem) {
    try {
      await openReportPdf(report.diagnosisId);
    } catch {
      alert("PDF 다운로드 실패");
    }
  }

  if (loading) {
    return <ScreenState loading />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>마이페이지</Text>

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
              <Pressable onPress={() => setEditOpen((v) => !v)} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}>
                <Text>{editOpen ? "수정 닫기" : "정보 수정"}</Text>
              </Pressable>

              <Pressable onPress={async () => { await clearAccessToken(); router.replace("/login"); }} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}>
                <Text>로그아웃</Text>
              </Pressable>
            </View>

            {editOpen && (
              <View style={{ marginTop: 12, gap: 10, paddingTop: 12, borderTopWidth: 1 }}>
                <Text style={{ fontWeight: "700" }}>거주 유형</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["ONE_ROOM", "OFFICETEL", "APT", "VILLA", "HOUSE", "ETC"] as ResidenceType[]).map((t) => (
                    <Pressable key={t} onPress={() => setEditResidenceType(t)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 999, opacity: editResidenceType === t ? 1 : 0.6 }}>
                      <Text>{residenceLabel(t)}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ fontWeight: "700" }}>임대 유형</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["NONE", "MONTHLY", "JEONSE", "SALE"] as RentType[]).map((t) => (
                    <Pressable key={t} onPress={() => setEditRentType(t)} style={{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 999, opacity: editRentType === t ? 1 : 0.6 }}>
                      <Text>{rentLabel(t)}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={{ fontWeight: "700" }}>휴대폰 번호</Text>
                <TextInput value={editPhoneNumber} onChangeText={setEditPhoneNumber} placeholder="예) 01012345678" keyboardType="phone-pad" style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

                <Text style={{ fontWeight: "700" }}>주소</Text>
                <TextInput value={editAddress} onChangeText={setEditAddress} placeholder="예) 서울시 강남구 ..." style={{ borderWidth: 1, borderRadius: 10, padding: 12 }} />

                <Pressable onPress={handleSaveProfile} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}>
                  <Text>저장</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <Text style={{ opacity: 0.7 }}>내 정보를 불러오지 못했습니다.</Text>
        )}
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>리포트 내역</Text>
          <Pressable onPress={reload}><Text style={{ textDecorationLine: "underline", opacity: 0.8 }}>새로고침</Text></Pressable>
        </View>

        {sortedReports.length === 0 ? (
          <Text style={{ opacity: 0.7 }}>리포트가 아직 없습니다.</Text>
        ) : (
          sortedReports.map((r) => {
            const isReady = r.status === "READY";
            return (
              <Pressable key={r.reportId} onPress={() => router.push({ pathname: "/report/[reportId]", params: { reportId: String(r.reportId) } })} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
                <Text style={{ fontWeight: "700" }}>{new Date(r.createdAt).toISOString().slice(0, 10)} · {issueLabel(r.issueType)}</Text>
                <Text>위험도: {r.riskScore}%</Text>
                <Text>추천: {r.recommendation === "DIY" ? "DIY" : "전문업체"}</Text>
                <Text>상태: {r.status}</Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <Pressable onPress={() => handleGenerate(r)} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}>
                    <Text>PDF 생성 요청</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDownload(r)} disabled={!isReady} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", opacity: isReady ? 1 : 0.4 }}>
                    <Text>PDF 다운로드</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
