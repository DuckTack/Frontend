import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

// [상대 경로 및 API 유지]
import { getMe, updateMe, Me, ResidenceType, RentType } from "../src/api/users";
import { listMyReports, MyReportItem } from "../src/api/reports";
import { clearAccessToken } from "../src/store/tokenStorage";
import ScreenState from "../src/components/ScreenState";

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

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [reports, setReports] = useState<MyReportItem[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editResidenceType, setEditResidenceType] = useState<ResidenceType>("ONE_ROOM");
  const [editRentType, setEditRentType] = useState<RentType>("NONE");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const reload = async () => {
    try {
      const [meData, reportData] = await Promise.all([getMe(), listMyReports()]);
      setMe(meData);
      setReports(reportData);
      
      setEditResidenceType(meData.residenceType);
      setEditRentType(meData.rentType);
      setEditPhoneNumber(meData.phoneNumber ?? "");
      setEditAddress(meData.address ?? "");
    } catch (e) {
      Alert.alert("불러오기 실패", "서버 상태를 확인해주세요.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    reload();
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await updateMe({
        residenceType: editResidenceType,
        rentType: editRentType,
        phoneNumber: editPhoneNumber,
        address: editAddress,
      });
      setMe(updated);
      setEditOpen(false);
      Alert.alert("성공", "내 정보가 수정되었습니다.");
    } catch {
      Alert.alert("오류", "프로필 수정에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "확인",
        onPress: async () => {
          await clearAccessToken();
          router.replace("/login");
        }
      },
    ]);
  };

  if (loading) return <ScreenState loading />;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>마이페이지</Text>
          <Text style={styles.headerSub}>프로필 관리 및 활동 내역을 확인하세요</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MAIN_BLUE} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 섹션 */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{me?.username || "사용자"}</Text>
            <Text style={styles.userEmail}>{me?.phoneNumber || "번호 없음"}</Text>
            <Pressable onPress={() => setEditOpen(!editOpen)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>{editOpen ? "수정 취소" : "프로필 편집"}</Text>
            </Pressable>
          </View>
        </View>

        {/* 프로필 수정 폼 */}
        {editOpen && (
          <View style={styles.editCard}>
            <Text style={styles.editLabel}>거주 유형</Text>
            <View style={styles.chipGrid}>
              {(["ONE_ROOM", "OFFICETEL", "APT", "VILLA", "HOUSE"] as ResidenceType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setEditResidenceType(t)}
                  style={[styles.chip, editResidenceType === t && styles.chipActive]}
                >
                  <Text style={[styles.chipText, editResidenceType === t && styles.chipTextActive]}>
                    {residenceLabel(t)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.editLabel, { marginTop: 16 }]}>임대 유형</Text>
            <View style={styles.chipGrid}>
              {(["NONE", "MONTHLY", "JEONSE", "SALE"] as RentType[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setEditRentType(t)}
                  style={[styles.chip, editRentType === t && styles.chipActive]}
                >
                  <Text style={[styles.chipText, editRentType === t && styles.chipTextActive]}>
                    {rentLabel(t)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.addressInput}
              value={editPhoneNumber}
              onChangeText={setEditPhoneNumber}
              placeholder="휴대폰 번호 (예: 01012345678)"
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.addressInput}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="주소 상세 (예: 서울시 강남구...)"
            />

            <Pressable style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </Pressable>
          </View>
        )}

        {/* 히스토리 바로가기 (활동 요약 대신 더 강조됨) */}
        <Pressable style={styles.historyQuickBtn} onPress={() => router.push("/history")}>
          <View style={styles.historyIconBox}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={MAIN_BLUE} />
          </View>
          <View style={{ flex: 1 }}>
             <Text style={styles.historyQuickText}>나의 상세 리포트 내역 보기</Text>
             <Text style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>총 {reports.length}건의 진단 기록이 있습니다</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </Pressable>

        {/* 메뉴 리스트 */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuGroupLabel}>설정 및 지원</Text>
          <div style={styles.menuList}>
            <Pressable style={styles.menuItem}>
              <Feather name="bell" size={18} color={MAIN_BLUE} />
              <Text style={styles.menuItemText}>알림 설정</Text>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </Pressable>
            <Pressable style={styles.menuItem}>
              <Feather name="shield" size={18} color={MAIN_BLUE} />
              <Text style={styles.menuItemText}>개인정보 처리방침</Text>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </Pressable>
            <Pressable style={[styles.menuItem, { borderBottomWidth: 0 }]}>
              <Feather name="info" size={18} color={MAIN_BLUE} />
              <Text style={styles.menuItemText}>앱 버전 정보</Text>
              <Text style={styles.versionText}>v1.0.0</Text>
            </Pressable>
          </div>
        </View>

        {/* 로그아웃 버튼 */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        <Text style={styles.footerInfo}>© 2026 DduckTack. All rights reserved.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, backgroundColor: "#fff" },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 28, backgroundColor: "#eff6ff", alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  avatarEmoji: { fontSize: 32 },
  userName: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  userEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  editBtn: { marginTop: 6 },
  editBtnText: { color: MAIN_BLUE, fontWeight: '700', fontSize: 13 },
  editCard: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  editLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: MAIN_BLUE, borderColor: MAIN_BLUE },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  addressInput: { height: 50, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  saveBtn: { backgroundColor: MAIN_BLUE, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '800' },
  historyQuickBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f7ff', padding: 18, borderRadius: 24, marginTop: 8 },
  historyIconBox: { width: 44, height: 44, backgroundColor: '#fff', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  historyQuickText: { fontWeight: '800', color: '#1e293b', fontSize: 15 },
  menuContainer: { marginTop: 32 },
  menuGroupLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 12, marginLeft: 4 },
  menuList: { backgroundColor: '#f8fafc', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuItemText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', color: '#334155' },
  versionText: { fontSize: 12, color: '#94a3b8' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, marginTop: 24, backgroundColor: '#fef2f2', borderRadius: 20, gap: 8 },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  footerInfo: { textAlign: 'center', color: '#cbd5e1', fontSize: 11, marginTop: 24, marginBottom: 20 },
});