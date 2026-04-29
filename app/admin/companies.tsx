import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons, Entypo } from "@expo/vector-icons";

// [원본 컴포넌트 및 API 경로 유지]
import ScreenState from "../../src/components/ScreenState";
import { listAdminCompanies, getAdminCompanyDetail, setAdminCompanyActive, type AdminCompanyListItem } from "../../src/api/admin";
import { ensureAdminOrRedirect } from "../../src/utils/admin";

const MAIN_BLUE = "#3b82f6";
const TEXT_DARK = "#1e293b";
const TEXT_SUB = "#94a3b8";

export default function AdminCompaniesPage() {
  // --- 원본 로직 유지 ---
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminCompanyListItem[]>([]);
  const [activeMap, setActiveMap] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    const allowed = await ensureAdminOrRedirect();
    if (!allowed) return;
    try {
      setLoading(true);
      const list = await listAdminCompanies();
      setItems(list);
      const details = await Promise.all(
        list.map(async (item) => {
          try {
            const detail = await getAdminCompanyDetail(item.id);
            return [item.id, detail.active] as const;
          } catch {
            return [item.id, true] as const;
          }
        })
      );
      setActiveMap(Object.fromEntries(details));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleToggle(id: number, active: boolean) {
    try {
      await setAdminCompanyActive(id, active);
      Alert.alert("처리 완료", active ? "업체가 다시 노출되도록 변경되었습니다." : "업체가 숨김 처리되었습니다.");
      await load();
    } catch {
      Alert.alert("처리 실패", "업체 활성/비활성 API를 확인해주세요.");
    }
  }

  if (loading) return <ScreenState loading />;

  return (
    <View style={styles.container}>
      {/* 관리자 홈과 통일된 헤더 디자인 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={TEXT_DARK} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>업체 관리</Text>
            <Text style={styles.headerSub}>총 {items.length}개의 전문업체</Text>
          </View>
        </View>
        
        <Pressable 
          onPress={() => router.push("/admin/company-form")} 
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>등록</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="office-building-remove" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>등록된 업체가 없습니다.</Text>
          </View>
        ) : (
          items.map((item) => {
            const isActive = activeMap[item.id] ?? true;
            return (
              <View key={item.id} style={styles.companyCard}>
                {/* 상단: 업체명 및 상태 배지 */}
                <View style={styles.cardHeader}>
                  <Text style={styles.companyName} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.statusBadge, isActive ? styles.statusBadgeActive : styles.statusBadgeHidden]}>
                    <Entypo name="dot-single" size={16} color={isActive ? "#16a34a" : "#64748b"} />
                    <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextHidden]}>
                      {isActive ? "노출 중" : "숨김"}
                    </Text>
                  </View>
                </View>

                {/* 중단: 주소 정보 */}
                <View style={styles.addressRow}>
                  <Feather name="map-pin" size={12} color={TEXT_SUB} style={{ marginTop: 2 }} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.address || "주소 정보 없음"}
                  </Text>
                </View>
                
                {/* 하단: 액션 버튼 세션 */}
                <View style={styles.actionRow}>
                  <Pressable 
                    onPress={() => router.push({ pathname: "/admin/company-form", params: { companyId: String(item.id) } })} 
                    style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
                  >
                    <Feather name="edit-2" size={14} color="#64748b" />
                    <Text style={styles.editBtnText}>수정</Text>
                  </Pressable>
                  
                  <Pressable 
                    onPress={() => handleToggle(item.id, !isActive)} 
                    style={({ pressed }) => [styles.toggleBtn, pressed && styles.btnPressed]}
                  >
                    <Feather name={isActive ? "eye-off" : "eye"} size={14} color="#fff" />
                    <Text style={styles.toggleBtnText}>
                      {isActive ? "숨김" : "다시 노출"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: TEXT_DARK },
  headerSub: { fontSize: 12, color: TEXT_SUB, marginTop: 1 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: MAIN_BLUE,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnPressed: { opacity: 0.8 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  scrollContent: { padding: 20 },
  companyCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  companyName: { fontSize: 16, fontWeight: "800", color: TEXT_DARK, flex: 1, marginRight: 10 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingRight: 10, paddingVertical: 2, borderRadius: 8 },
  statusBadgeActive: { backgroundColor: "#dcfce7" },
  statusBadgeHidden: { backgroundColor: "#f1f5f9" },
  statusText: { fontSize: 11, fontWeight: "800" },
  statusTextActive: { color: "#16a34a" },
  statusTextHidden: { color: "#64748b" },
  addressRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  addressText: { flex: 1, fontSize: 13, color: "#64748b", lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10 },
  btnPressed: { opacity: 0.8 },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  editBtnText: { color: "#475569", fontSize: 14, fontWeight: "800" },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1e293b",
    paddingVertical: 12,
    borderRadius: 14,
  },
  toggleBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    gap: 12,
  },
  emptyText: { color: "#94a3b8", fontSize: 14, fontWeight: "700" },
});