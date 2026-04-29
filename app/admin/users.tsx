import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// [원본 로직 및 경로 유지]
import ScreenState from "../../src/components/ScreenState";
import { listAdminUsers, type AdminUserListItem } from "../../src/api/admin";
import { ensureAdminOrRedirect } from "../../src/utils/admin";

const MAIN_BLUE = "#3b82f6";
const TEXT_DARK = "#1e293b";
const TEXT_SUB = "#64748b";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [keyword, setKeyword] = useState("");

  // --- 원본 데이터 로딩 로직 유지 ---
  useEffect(() => {
    async function load() {
      const allowed = await ensureAdminOrRedirect();
      if (!allowed) return;
      try {
        setLoading(true);
        const list = await listAdminUsers();
        setUsers(list);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // --- 원본 검색 필터링 로직 유지 ---
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return users;
    return users.filter((item) => {
      return [
        item.username,
        item.email,
        item.phoneNumber,
        item.address,
        item.residenceType,
        item.rentType,
        item.role,
        String(item.id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [users, keyword]);

  if (loading) return <ScreenState loading />;

  return (
    <View style={styles.container}>
      {/* 관리자 공통 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={TEXT_DARK} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>사용자 조회</Text>
            <Text style={styles.headerSub}>총 {users.length.toLocaleString()}명의 가입자</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={TEXT_SUB} style={{ marginRight: 10 }} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="이름, 이메일, 전화번호 등으로 검색"
            style={styles.searchInput}
            placeholderTextColor="#cbd5e1"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="account-search-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>조회된 사용자가 없습니다.</Text>
          </View>
        ) : (
          filtered.map((user) => (
            <Pressable 
              key={user.id} 
              onPress={() => router.push({ pathname: "/admin/users/[userId]", params: { userId: String(user.id) } })} 
              style={({ pressed }) => [styles.userCard, pressed && styles.cardPressed]}
            >
              <View style={styles.cardMain}>
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>{(user.username || "U")[0]}</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{user.username || `회원 ${user.id}`}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{user.role || "USER"}</Text>
                    </View>
                  </View>
                  <Text style={styles.userSubInfo} numberOfLines={1}>ID: {user.id}  •  {user.email || "이메일 없음"}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#cbd5e1" />
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardDetail}>
                <View style={styles.detailItem}>
                  <Feather name="phone" size={12} color={TEXT_SUB} />
                  <Text style={styles.detailText}>{user.phoneNumber || "연락처 없음"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Feather name="map-pin" size={12} color={TEXT_SUB} />
                  <Text style={styles.detailText} numberOfLines={1}>{user.address || "주소 정보 없음"}</Text>
                </View>
              </View>
            </Pressable>
          ))
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
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
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
  
  // 검색 영역
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_DARK, fontWeight: "600" },

  scrollContent: { padding: 20 },

  // 사용자 카드
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },
  cardPressed: { backgroundColor: "#f8fafc", opacity: 0.9 },
  cardMain: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: MAIN_BLUE },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  userName: { fontSize: 16, fontWeight: "800", color: TEXT_DARK },
  roleBadge: { backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: "800", color: "#64748b" },
  userSubInfo: { fontSize: 12, color: TEXT_SUB },

  cardDivider: { height: 1, backgroundColor: "#f1f5f9", marginBottom: 12 },
  
  cardDetail: { gap: 6 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 12, color: "#475569", fontWeight: "500" },

  // 빈 상태
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