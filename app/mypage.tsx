import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View, StyleSheet, SafeAreaView, Platform } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";

// [원본 API 및 스토리지 로직 유지]
import ScreenState from "../src/components/ScreenState";
import { clearAccessToken } from "../src/store/tokenStorage";
import { openReportPdf, generateReport, listMyReports, MyReportItem } from "../src/api/reports";
import { getMe, updateMe, Me, ResidenceType, RentType } from "../src/api/users";

const MAIN_BLUE = "#3b82f6";

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
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editResidenceType, setEditResidenceType] = useState<ResidenceType>("ONE_ROOM");
  const [editRentType, setEditRentType] = useState<RentType>("NONE");

  async function reload() {
    try {
      setLoading(true);
      const [meData, reportData] = await Promise.all([getMe(), listMyReports()]);
      setMe(meData);
      setReports(reportData);
      setEditUsername(meData.username ?? "");
      setEditEmail(meData.email ?? "");
      setEditPhoneNumber(meData.phoneNumber ?? "");
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

  useEffect(() => { reload(); }, []);

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [reports]
  );

  async function handleGenerate(report: MyReportItem) {
    try {
      await generateReport(report.diagnosisId);
      Alert.alert("PDF 생성 요청 완료", "잠시 후 새로고침 해주세요.");
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

  async function handleSaveProfile() {
    try {
      const updated = await updateMe({
        username: editUsername.trim(),
        email: editEmail.trim(),
        phoneNumber: editPhoneNumber.trim(),
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

  if (loading) return <ScreenState loading />;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <Text style={styles.headerSub}>내 정보와 리포트 내역을 확인하세요</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* [통합 프로필 카드] 상단 정보 + 수정 버튼 + 수정 폼 */}
        <View style={styles.mainProfileCard}>
          {/* 상단 섹션: 아바타와 기본 정보 */}
          <View style={styles.profileInfoRow}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 32 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{me?.username || "사용자"}</Text>
              <Text style={styles.userPhone}>{me?.phoneNumber || "번호 없음"}</Text>
              {!!me?.email && <Text style={styles.userEmail}>{me.email}</Text>}
              <Text style={styles.userAddress} numberOfLines={1}>
                {me?.address || "등록된 주소지가 없습니다."}
              </Text>
            </View>
            <Pressable 
              onPress={() => setEditOpen(!editOpen)} 
              style={[styles.editToggleBtn, editOpen && styles.editToggleBtnActive]}
            >
              <Ionicons 
                name={editOpen ? "close" : "settings-outline"} 
                size={16} 
                color={editOpen ? "#fff" : MAIN_BLUE} 
              />
              <Text style={[styles.editToggleText, editOpen && { color: "#fff" }]}>
                {editOpen ? "닫기" : "수정"}
              </Text>
            </Pressable>
          </View>

          {/* 수정 폼 섹션 (editOpen이 true일 때만 슬라이드처럼 표시) */}
          {editOpen && (
            <View style={styles.editFormContainer}>
              <View style={styles.divider} />
              
              <Text style={styles.editLabel}>아이디</Text>
              <TextInput
                style={styles.addressInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="아이디를 입력해주세요"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <Text style={[styles.editLabel, { marginTop: 20 }]}>이메일</Text>
              <TextInput
                style={styles.addressInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="이메일을 입력해주세요"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.editLabel, { marginTop: 20 }]}>전화번호</Text>
              <TextInput
                style={styles.addressInput}
                value={editPhoneNumber}
                onChangeText={setEditPhoneNumber}
                placeholder="전화번호를 입력해주세요"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <Text style={[styles.editLabel, { marginTop: 20 }]}>거주 유형</Text>
              <View style={styles.chipGrid}>
                {(["ONE_ROOM", "OFFICETEL", "APT", "VILLA", "HOUSE"] as ResidenceType[]).map((t) => (
                  <Pressable key={t} onPress={() => setEditResidenceType(t)} style={[styles.chip, editResidenceType === t && styles.chipActive]}>
                    <Text style={[styles.chipText, editResidenceType === t && styles.chipTextActive]}>{residenceLabel(t)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.editLabel, { marginTop: 20 }]}>임대 유형</Text>
              <View style={styles.chipGrid}>
                {(["NONE", "MONTHLY", "JEONSE", "SALE"] as RentType[]).map((t) => (
                  <Pressable key={t} onPress={() => setEditRentType(t)} style={[styles.chip, editRentType === t && styles.chipActive]}>
                    <Text style={[styles.chipText, editRentType === t && styles.chipTextActive]}>{rentLabel(t)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.editLabel, { marginTop: 20 }]}>상세 주소</Text>
              <TextInput 
                style={styles.addressInput} 
                value={editAddress} 
                onChangeText={setEditAddress} 
                placeholder="상세 주소를 입력해주세요" 
                placeholderTextColor="#94a3b8"
              />

              <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>개인정보 변경 내용 저장</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 3. 리포트 내역 */}
        <View style={styles.reportSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>리포트 내역 ({reports.length})</Text>
            <Pressable onPress={reload}><Text style={styles.reloadText}>새로고침</Text></Pressable>
          </View>

          {sortedReports.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>리포트가 아직 없습니다.</Text></View>
          ) : (
            sortedReports.map((r) => {
              const isReady = r.status === "READY";
              return (
                <View key={r.reportId} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportDate}>
                      {new Date(r.createdAt).toISOString().slice(0, 10)} · {issueLabel(r.issueType)}
                    </Text>
                  </View>
                  <View style={styles.reportInfoRow}>
                    <Text style={styles.infoText}>위험도: {r.riskScore}%</Text>
                    <Text style={styles.infoText}>추천: {r.recommendation === "DIY" ? "DIY" : "전문업체"}</Text>
                    <Text style={[styles.statusText, isReady && {color: MAIN_BLUE}]}>
                      {isReady ? "발급완료" : r.status === "GENERATING" ? "생성중" : "미발급"}
                    </Text>
                  </View>
                  <View style={styles.reportActions}>
                    <Pressable onPress={() => handleGenerate(r)} style={styles.genBtn}>
                      <Text style={styles.genBtnText}>PDF 생성</Text>
                    </Pressable>
                    <Pressable 
                      onPress={() => handleDownload(r)} 
                      disabled={!isReady} 
                      style={[styles.downBtn, !isReady && {backgroundColor: '#e2e8f0'}]}
                    >
                      <Text style={[styles.downBtnText, !isReady && {color: '#94a3b8'}]}>다운로드</Text>
                    </Pressable>
                  </View>
                  <Pressable 
                    onPress={() => router.push({ pathname: "/report/[reportId]", params: { reportId: String(r.reportId) } })} 
                    style={styles.detailBtn}
                  >
                    <Text style={styles.detailBtnText}>상세 보기</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* 4. 앱 정보 */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuGroupLabel}>시스템</Text>
          <View style={styles.menuList}>
            <View style={styles.menuItem}>
              <Feather name="info" size={18} color={MAIN_BLUE} />
              <Text style={styles.menuItemText}>앱 버전 정보</Text>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
        </View>

        {/* 5. 로그아웃 */}
        <Pressable 
          style={styles.logoutBtn} 
          onPress={async () => {
            await clearAccessToken();
            router.replace("/login");
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        <Text style={styles.footerInfo}>© 2026 DduckTack. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  /* --- 통합 프로필 카드 스타일 --- */
  mainProfileCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 }
    })
  },
  profileInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 22, backgroundColor: "#eff6ff", alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  userName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  userPhone: { fontSize: 13, color: '#64748b', marginTop: 1 },
  userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  userAddress: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  
  editToggleBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    gap: 4 
  },
  editToggleBtnActive: { backgroundColor: '#334155' },
  editToggleText: { fontSize: 12, fontWeight: '700', color: MAIN_BLUE },

  editFormContainer: { marginTop: 20 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },
  editLabel: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: MAIN_BLUE, borderColor: MAIN_BLUE },
  chipText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  addressInput: { height: 52, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4, color: '#1e293b' },
  saveBtn: { backgroundColor: MAIN_BLUE, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  /* --------------------------- */

  reportSection: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  reloadText: { color: MAIN_BLUE, fontSize: 13, fontWeight: '600' },
  reportCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  reportHeader: { marginBottom: 12 },
  reportDate: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  reportInfoRow: { flexDirection: 'row', gap: 14, marginBottom: 18 },
  infoText: { fontSize: 13, color: '#64748b' },
  statusText: { fontSize: 13, fontWeight: '800', color: '#cbd5e1' },
  reportActions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  genBtn: { flex: 1, backgroundColor: '#1e293b', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  genBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  downBtn: { flex: 1, backgroundColor: MAIN_BLUE, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  downBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  detailBtn: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  detailBtnText: { fontWeight: '700', color: '#64748b', fontSize: 14 },

  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 24 },
  emptyText: { color: '#94a3b8', fontSize: 14 },

  menuContainer: { marginTop: 12 },
  menuGroupLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 12, marginLeft: 4 },
  menuList: { backgroundColor: '#f8fafc', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  menuItemText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#334155' },
  versionText: { fontSize: 12, color: '#94a3b8' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, marginTop: 24, backgroundColor: '#fef2f2', borderRadius: 24, gap: 8 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  footerInfo: { textAlign: 'center', color: '#cbd5e1', fontSize: 11, marginTop: 24, marginBottom: 20 },
});