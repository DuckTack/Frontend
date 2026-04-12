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
    const [editPhoneNumber, setEditPhoneNumber] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editResidenceType, setEditResidenceType] = useState<ResidenceType>("ONE_ROOM");
    const [editRentType, setEditRentType] = useState<RentType>("NONE");
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
            setEditAddress(meData.address ?? "");

        } catch (e) {
            console.log("마이페이지 불러오기 실패:", e);
            setMe(null);
            setReports([]);
            Alert.alert("불러오기 실패");
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

    async function handleGenerate(report: MyReportItem) {
        try {
            await generateReport(report.diagnosisId);
            Alert.alert("PDF 생성 완료");
            await reload();
        } catch {
            Alert.alert("PDF 생성 실패");
        }
    }

    async function handleDownload(report: MyReportItem) {
        try {
            await openReportPdf(report.diagnosisId);
        } catch {
            Alert.alert("다운로드 실패");
        }
    }

    if (loading) return <ScreenState loading />;

    async function handleSaveProfile() {
        try {
            const updated = await updateMe({
                residenceType: editResidenceType,
                rentType: editRentType,
                address: editAddress,
            });
            setMe(updated);
            setEditOpen(false);
            Alert.alert("수정 완료");
        } catch {
            Alert.alert("수정 실패");
        }
    }

    return (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
            <Text style={{ fontSize: 22, fontWeight: "800" }}>마이페이지</Text>

            {/* 사용자 정보 */}
            <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}>
                <Text>아이디: {me?.username}</Text>
                <Text>전화번호: {me?.phoneNumber}</Text>
                {editOpen && (
                    <View style={{ marginTop: 10, gap: 8 }}>
                        <Text>거주 유형</Text>
                        <Text>{residenceLabel(editResidenceType)}</Text>

                        <Text>임대 유형</Text>
                        <Text>{rentLabel(editRentType)}</Text>

                        <Text>주소</Text>
                        <TextInput
                            value={editAddress}
                            onChangeText={setEditAddress}
                            style={{ borderWidth: 1, padding: 10 }}
                        />

                        <Pressable onPress={handleSaveProfile} style={{ padding: 10, borderWidth: 1 }}>
                            <Text>저장</Text>
                        </Pressable>
                    </View>
                )}

                <Pressable onPress={() => setEditOpen(v => !v)}>
                    <Text>{editOpen ? "닫기" : "정보 수정"}</Text>
                </Pressable>

                <Pressable onPress={async () => {
                    await clearAccessToken();
                    router.replace("/login");
                }}>
                    <Text>로그아웃</Text>
                </Pressable>
            </View>

            {/* 🔥 개선된 리포트 UI */}
            <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 16, fontWeight: "800" }}>리포트 내역</Text>
                    <Pressable onPress={reload}>
                        <Text style={{ textDecorationLine: "underline", opacity: 0.8 }}>새로고침</Text>
                    </Pressable>
                </View>

                {sortedReports.length === 0 ? (
                    <Text style={{ opacity: 0.7 }}>리포트가 아직 없습니다.</Text>
                ) : (
                    sortedReports.map((r) => {
                        const isReady = r.status === "READY";

                        return (
                            <View
                                key={r.reportId}
                                style={{
                                    borderWidth: 1,
                                    borderRadius: 14,
                                    padding: 14,
                                    gap: 6,
                                    backgroundColor: "#fff"
                                }}
                            >
                                <Text style={{ fontWeight: "700" }}>
                                    {new Date(r.createdAt).toISOString().slice(0, 10)} · {issueLabel(r.issueType)}
                                </Text>
                                <Text>위험도: {r.riskScore}%</Text>
                                <Text>추천: {r.recommendation === "DIY" ? "DIY" : "전문업체"}</Text>
                                <Text>상태: {r.status}</Text>

                                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                                    <Pressable
                                        onPress={() => handleGenerate(r)}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 14,
                                            backgroundColor: "#000",
                                            borderRadius: 10,
                                            alignItems: "center"
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontWeight: "700" }}>PDF 생성</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => handleDownload(r)}
                                        disabled={!isReady}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 14,
                                            backgroundColor: isReady ? "#007AFF" : "#ccc",
                                            borderRadius: 10,
                                            alignItems: "center"
                                        }}
                                    >
                                        <Text style={{ color: "#fff", fontWeight: "700" }}>다운로드</Text>
                                    </Pressable>
                                </View>

                                <Pressable
                                    onPress={() =>
                                        router.push({
                                            pathname: "/report/[reportId]",
                                            params: { reportId: String(r.reportId) }
                                        })
                                    }
                                    style={{
                                        marginTop: 6,
                                        paddingVertical: 12,
                                        borderWidth: 1,
                                        borderRadius: 10,
                                        alignItems: "center"
                                    }}
                                >
                                    <Text style={{ fontWeight: "700" }}>상세 보기</Text>
                                </Pressable>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}