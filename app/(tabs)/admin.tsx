import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// [원본 로직 및 경로 유지]
import ScreenState from "../../src/components/ScreenState";
import { listAdminCompanies, listAdminUsers } from "../../src/api/admin";
import { ensureAdminOrRedirect } from "../../src/utils/admin";

const MAIN_BLUE = "#3b82f6";

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);

  const load = useCallback(async () => {
    const allowed = await ensureAdminOrRedirect();
    if (!allowed) return;
    try {
      setLoading(true);
      const [users, companies] = await Promise.all([
        listAdminUsers().catch(() => []),
        listAdminCompanies().catch(() => []),
      ]);
      setUserCount(users.length);
      setCompanyCount(companies.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <ScreenState loading />;

  return (
    <View style={styles.container}>
      {/* 관리자 전용 헤더 (디자인 적용) */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>관리자 센터</Text>
          <Text style={styles.headerSub}>플랫폼 운영 현황 및 관리</Text>
        </View>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 요약 통계 섹션 (원본 데이터 연결) */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: MAIN_BLUE }]}>
            <View style={styles.statsIconBox}>
              <Feather name="users" size={18} color="#fff" />
            </View>
            <Text style={styles.statsLabel}>전체 사용자</Text>
            {/* toLocaleString으로 숫자 가독성 향상 */}
            <Text style={styles.statsNumber}>{userCount.toLocaleString()}</Text>
          </View>
          
          <View style={[styles.statsCard, { backgroundColor: "#1e293b" }]}>
            <View style={[styles.statsIconBox, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <MaterialCommunityIcons name="office-building" size={18} color="#fff" />
            </View>
            <Text style={styles.statsLabel}>등록 업체</Text>
            <Text style={styles.statsNumber}>{companyCount.toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>관리 메뉴</Text>

        {/* 메뉴 리스트 (원본 내비게이션 로직 유지) */}
        <Pressable 
          onPress={() => router.push("/admin/companies")} 
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: "#eff6ff" }]}>
            <MaterialCommunityIcons name="store-cog" size={24} color={MAIN_BLUE} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>업체 관리</Text>
            <Text style={styles.menuDesc}>신규 업체 등록 및 노출/수정 관리</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </Pressable>

        <Pressable 
          onPress={() => router.push("/admin/users")} 
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
        >
          <View style={[styles.menuIconCircle, { backgroundColor: "#f8fafc" }]}>
            <Feather name="user-check" size={22} color="#64748b" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>사용자 조회</Text>
            <Text style={styles.menuDesc}>회원 기본 정보 및 진단 기록 요약</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </Pressable>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>© DduckTack Admin System v1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  headerSub: { fontSize: 13, color: "#94a3b8", marginTop: 2 },
  adminBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminBadgeText: { color: "#ef4444", fontSize: 10, fontWeight: "900" },
  
  scrollContent: { padding: 20 },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    gap: 8,
    // 그림자 스타일 보존
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  statsNumber: { color: "#fff", fontSize: 26, fontWeight: "900" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#475569", marginBottom: 16, marginLeft: 4 },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  menuBtnPressed: { backgroundColor: "#f1f5f9", opacity: 0.9 },
  menuIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  menuDesc: { fontSize: 13, color: "#94a3b8", lineHeight: 18 },

  footerInfo: { marginTop: 24, alignItems: "center" },
  footerText: { fontSize: 12, color: "#cbd5e1", fontWeight: "600" },
});