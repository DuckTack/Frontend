import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Platform, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

import ScreenState from "../../../src/components/ScreenState";
import { getAdminUserDetail, listAdminUserHistories, type AdminUserDetail, type AdminUserHistorySummary } from "../../../src/api/admin";
import { ensureAdminOrRedirect, formatDateTime, issueTypeLabel } from "../../../src/utils/admin";

const MAIN_BLUE = "#3b82f6";
const TEXT_DARK = "#1e293b";
const TEXT_SUB = "#64748b";

export default function AdminUserDetailPage() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const numericUserId = Number(userId);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [histories, setHistories] = useState<AdminUserHistorySummary[]>([]);
  const [historyApiAvailable, setHistoryApiAvailable] = useState(true);

  async function load() {
    const allowed = await ensureAdminOrRedirect();
    if (!allowed) return;
    if (!numericUserId) {
      setErrorMessage("잘못된 사용자 ID입니다.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const detail = await getAdminUserDetail(numericUserId);
      setUser(detail);

      try {
        const historyItems = await listAdminUserHistories(numericUserId);
        setHistories(historyItems);
        setHistoryApiAvailable(true);
      } catch {
        setHistories([]);
        setHistoryApiAvailable(false);
      }
    } catch {
      setErrorMessage("사용자 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [numericUserId]);

  const stats = useMemo(() => {
    const total = histories.length;
    const diyCount = histories.filter((item) => item.recommendation === "DIY").length;
    const proCount = histories.filter((item) => item.recommendation === "PRO").length;
    const reportDoneCount = histories.filter((item) => !!item.report).length;
    return { total, diyCount, proCount, reportDoneCount };
  }, [histories]);

  if (loading || errorMessage) {
    return <ScreenState loading={loading} errorMessage={errorMessage} onRetry={load} title="사용자 상세" />;
  }

  if (!user) {
    return <ScreenState errorMessage="사용자 정보가 없습니다." onRetry={load} title="사용자 상세" />;
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={TEXT_DARK} />
          </Pressable>
          <Text style={styles.headerTitle}>사용자 상세 정보</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 프로필 요약 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user.username || "U")[0]}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>{user.username || `회원 ${user.id}`}</Text>
              <Text style={styles.profileId}>회원번호 #{user.id}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <InfoItem icon="mail" label="이메일" value={user.email} />
            <InfoItem icon="phone" label="연락처" value={user.phoneNumber} />
            <InfoItem icon="map-pin" label="주소" value={user.address} fullWidth />
            <View style={styles.row}>
              <InfoItem icon="home" label="거주 유형" value={user.residenceType} half />
              <InfoItem icon="key" label="임대 유형" value={user.rentType} half />
            </View>
            <InfoItem icon="calendar" label="가입 일시" value={formatDateTime(user.createdAt)} />
          </View>
        </View>

        {/* 활동 통계 대시보드 */}
        <Text style={styles.sectionTitle}>진단 통계</Text>
        <View style={styles.statsGrid}>
          <StatBox label="전체 진단" value={stats.total} color={TEXT_DARK} icon="clipboard-list" />
          <StatBox label="리포트 완료" value={stats.reportDoneCount} color={MAIN_BLUE} icon="file-check-outline" />
        </View>
        <View style={styles.statsGrid}>
          <StatBox label="DIY 안내" value={stats.diyCount} color="#16a34a" icon="tools" isFontAwesome />
          <StatBox label="전문가 안내" value={stats.proCount} color="#ea580c" icon="user-tie" isFontAwesome />
        </View>

        {/* 진단 기록 리스트 */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>진단 기록</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{histories.length}</Text>
            </View>
          </View>

          {!historyApiAvailable ? (
            <View style={styles.apiWaitBox}>
              <Feather name="clock" size={20} color={TEXT_SUB} />
              <Text style={styles.apiWaitText}>관리자용 진단기록 API 연결 대기 중</Text>
            </View>
          ) : histories.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>진단 기록이 없습니다.</Text>
            </View>
          ) : (
            histories.map((history) => (
              <View key={String(history.historyId)} style={styles.historyCard}>
                <View style={styles.historyIconBox}>
                   <MaterialCommunityIcons name="shield-search" size={20} color={MAIN_BLUE} />
                </View>
                <View style={styles.historyContent}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyType}>{issueTypeLabel(history.issueType)}</Text>
                    <Text style={styles.historyDate}>{formatDateTime(history.createdAt)}</Text>
                  </View>
                  <View style={styles.historyTags}>
                    <View style={[styles.miniBadge, history.recommendation === "PRO" ? styles.bgOrange : styles.bgGreen]}>
                      <Text style={styles.miniBadgeText}>
                        {history.recommendation === "PRO" ? "전문가" : "DIY"}
                      </Text>
                    </View>
                    {history.report && (
                      <View style={[styles.miniBadge, styles.bgBlue]}>
                        <Text style={styles.miniBadgeText}>리포트완료</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// 내부 컴포넌트: 정보 항목
function InfoItem({ icon, label, value, fullWidth, half }: any) {
  return (
    <View style={[styles.infoItem, fullWidth && { width: "100%" }, half && { flex: 1 }]}>
      <View style={styles.infoLabelRow}>
        <Feather name={icon} size={13} color={TEXT_SUB} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value || "-"}</Text>
    </View>
  );
}

// 내부 컴포넌트: 통계 박스
function StatBox({ label, value, color, icon, isFontAwesome }: any) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIconCircle, { backgroundColor: color + "10" }]}>
        {isFontAwesome ? (
          <FontAwesome5 name={icon} size={14} color={color} />
        ) : (
          <MaterialCommunityIcons name={icon} size={18} color={color} />
        )}
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
      </View>
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
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: TEXT_DARK },
  scrollContent: { padding: 20 },

  // 프로필 카드
  profileCard: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: "#f1f5f9" },
  avatarSection: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: MAIN_BLUE, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  profileName: { fontSize: 20, fontWeight: "900", color: TEXT_DARK },
  profileId: { fontSize: 13, color: TEXT_SUB, marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginBottom: 20 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  infoItem: { width: "45%", gap: 4 },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 12, fontWeight: "700", color: TEXT_SUB },
  infoValue: { fontSize: 14, fontWeight: "700", color: TEXT_DARK },
  row: { flexDirection: "row", width: "100%", gap: 16 },

  // 통계 대시보드
  sectionTitle: { fontSize: 16, fontWeight: "800", color: TEXT_DARK, marginBottom: 12 },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: "#fff", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#f1f5f9" },
  statIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statLabel: { fontSize: 12, fontWeight: "700", color: TEXT_SUB },
  statValue: { fontSize: 20, fontWeight: "900" },

  // 진단 기록
  historySection: { marginTop: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  badge: { backgroundColor: TEXT_DARK, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  historyCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, flexDirection: "row", gap: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f1f5f9" },
  historyIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  historyContent: { flex: 1, gap: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyType: { fontSize: 15, fontWeight: "800", color: TEXT_DARK },
  historyDate: { fontSize: 11, color: TEXT_SUB },
  historyTags: { flexDirection: "row", gap: 6 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: "800" },
  bgOrange: { backgroundColor: "#fff7ed" }, // 전문가
  bgGreen: { backgroundColor: "#f0fdf4" }, // DIY
  bgBlue: { backgroundColor: "#eff6ff" }, // 리포트
  miniBadgeTextOrange: { color: "#ea580c" },
  
  apiWaitBox: { padding: 30, alignItems: "center", gap: 10, backgroundColor: "#f1f5f9", borderRadius: 20, borderStyle: "dashed", borderWidth: 1, borderColor: "#cbd5e1" },
  apiWaitText: { fontSize: 13, color: TEXT_SUB, fontWeight: "600", textAlign: "center", lineHeight: 18 },
  emptyBox: { padding: 40, alignItems: "center" },
  emptyText: { color: TEXT_SUB, fontSize: 14 },
});