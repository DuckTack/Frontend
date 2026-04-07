import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert, StyleSheet, Platform } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";

// [원본 상대 경로 및 API 유지]
import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getExpertInfo, ExpertInfo } from "../src/api/guides";
import { listExpertVendors, type ExpertVendor, type ExpertVendorSort, VENDOR_REGIONS } from "../src/api/experts";

const MAIN_BLUE = "#3b82f6";

function issueTypeLabel(t: IssueType) {
  const labels: Record<string, string> = { 
    CRACK: "균열", LEAK: "누수", MOLD: "곰팡이", DAMAGE: "파손", ELECTRIC: "전기", GAS: "가스" 
  };
  return labels[t] || "기타";
}

function formatPrice(price: number) {
  return `${price.toLocaleString()}원~`;
}

export default function Expert() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();
  
  // --- 원본 상태 관리 로직 유지 ---
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [info, setInfo] = useState<ExpertInfo | null>(null);
  const [vendors, setVendors] = useState<ExpertVendor[]>([]);
  const [resolvedIssueType, setResolvedIssueType] = useState<IssueType>("MOLD");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ExpertVendorSort>("price");
  const [sortAscending, setSortAscending] = useState(true);

  // --- 원본 데이터 로딩 로직 유지 ---
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let t: IssueType = (issueType as IssueType) || "MOLD";
        if (historyId) {
          const h = await getHistoryDetail(String(historyId));
          t = h.issueType;
        }
        const i = await getExpertInfo(t);
        setResolvedIssueType(t);
        setInfo(i);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [historyId, issueType]);

  // --- 원본 업체 조회 및 정렬 로직 유지 ---
  async function loadVendors(region: string, nextSortKey = sortKey, nextAscending = sortAscending) {
    try {
      setVendorsLoading(true);
      const data = await listExpertVendors({
        region,
        issueType: resolvedIssueType,
        sortKey: nextSortKey,
        direction: nextAscending ? "asc" : "desc",
      });
      setVendors(data);
    } catch {
      setVendors([]);
      Alert.alert("업체 조회 실패", "전문업체 정보를 불러오지 못했습니다.");
    } finally {
      setVendorsLoading(false);
    }
  }

  const handleSortPress = (nextKey: ExpertVendorSort) => {
    const nextAscending = sortKey === nextKey ? !sortAscending : true;
    setSortKey(nextKey);
    setSortAscending(nextAscending);
    if (selectedRegion) {
      loadVendors(selectedRegion, nextKey, nextAscending);
    }
  };

  if (loading || !info) return <ScreenState loading />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <Text style={styles.headerTitle}>전문가 매칭</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 상단 섹션: 견적 정보 카드 */}
        <View style={styles.infoCard}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>전문가 수리 권장</Text>
          </View>
          <Text style={styles.mainTitle}>{issueTypeLabel(resolvedIssueType)} 수리 견적 안내</Text>

          <View style={styles.estimateBox}>
            <Text style={styles.estimateLabel}>예상 비용 범위</Text>
            <Text style={styles.estimateValue}>{info.estimateRange}</Text>
          </View>

          {info.notes && info.notes.length > 0 && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionSmallTitle}>안내 사항</Text>
              {info.notes.map((n, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Feather name="check" size={14} color={MAIN_BLUE} />
                  <Text style={styles.bulletText}>{n}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 지역 선택 섹션 */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={18} color={MAIN_BLUE} />
            <Text style={styles.sectionTitle}>지역 선택</Text>
          </View>
          <View style={styles.regionGrid}>
            {VENDOR_REGIONS.map((region) => (
              <Pressable
                key={region}
                onPress={() => {
                  setSelectedRegion(region);
                  setSortKey("price");
                  setSortAscending(true);
                  loadVendors(region, "price", true);
                }}
                style={[styles.regionChip, selectedRegion === region && styles.regionChipActive]}
              >
                <Text style={[styles.regionText, selectedRegion === region && styles.regionTextActive]}>{region}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 업체 리스트 섹션 */}
        {selectedRegion ? (
          <View style={styles.vendorSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listCount}>추천 업체 {vendors.length}곳</Text>
              <View style={styles.filterRow}>
                <Pressable onPress={() => handleSortPress("price")}>
                  <Text style={[styles.filterText, sortKey === "price" && styles.filterActive]}>
                    가격순{sortKey === "price" && (sortAscending ? "↑" : "↓")}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleSortPress("rating")}>
                  <Text style={[styles.filterText, sortKey === "rating" && styles.filterActive]}>
                    별점순{sortKey === "rating" && (sortAscending ? "↑" : "↓")}
                  </Text>
                </Pressable>
              </View>
            </View>

            {vendorsLoading ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>업체를 불러오는 중...</Text>
              </View>
            ) : vendors.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="info" size={24} color="#94a3b8" />
                <Text style={styles.emptyText}>해당 지역에 등록된 업체가 없습니다.</Text>
              </View>
            ) : (
              vendors.map((vendor) => (
                <View key={vendor.id} style={styles.vendorCard}>
                  <View style={styles.vendorMain}>
                    <View style={styles.vendorInfo}>
                      <Text style={styles.vendorName}>{vendor.name}</Text>
                      <View style={styles.ratingRow}>
                        <FontAwesome name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>{vendor.rating.toFixed(1)}</Text>
                        <Text style={styles.reviewCount}>({vendor.reviewCount})</Text>
                      </View>
                    </View>
                    <Text style={styles.vendorPrice}>{formatPrice(vendor.minPrice)}</Text>
                  </View>

                  <Text style={styles.vendorIntro} numberOfLines={2}>{vendor.intro}</Text>
                  <Text style={styles.coverageText}>활동 지역: {vendor.coverageAreas.join(", ")}</Text>

                  <Pressable
                    onPress={() => router.push({ 
                      pathname: "/expert-booking", 
                      params: { 
                        historyId: historyId ? String(historyId) : undefined, 
                        vendorId: vendor.id, 
                        vendorName: vendor.name, 
                        vendorPhone: vendor.phone, 
                        vendorIntro: vendor.intro, 
                        vendorMinPrice: String(vendor.minPrice), 
                        issueType: resolvedIssueType 
                      } 
                    })}
                    style={styles.bookBtn}
                  >
                    <Text style={styles.bookBtnText}>예약 페이지로 이동</Text>
                    <Feather name="chevron-right" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.guideBox}>
            <MaterialCommunityIcons name="gesture-tap" size={32} color={MAIN_BLUE} />
            <Text style={styles.guideText}>지역을 선택하시면{"\n"}가까운 전문 업체를 추천해 드립니다.</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  scrollContent: { padding: 20 },

  // 상단 카드
  infoCard: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e2e8f0" },
  infoBadge: { backgroundColor: "#eff6ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start", marginBottom: 12 },
  infoBadgeText: { color: MAIN_BLUE, fontSize: 12, fontWeight: "700" },
  mainTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", marginBottom: 16 },
  estimateBox: { backgroundColor: "#f1f5f9", padding: 16, borderRadius: 16, marginBottom: 16 },
  estimateLabel: { fontSize: 13, color: "#64748b", marginBottom: 4 },
  estimateValue: { fontSize: 20, fontWeight: "800", color: MAIN_BLUE },
  notesSection: { gap: 8 },
  sectionSmallTitle: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 4 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { fontSize: 14, color: "#64748b", flex: 1 },

  // 지역 선택
  sectionContainer: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  regionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  regionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  regionChipActive: { backgroundColor: MAIN_BLUE, borderColor: MAIN_BLUE },
  regionText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  regionTextActive: { color: "#fff" },

  // 업체 리스트
  vendorSection: { gap: 16 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  listCount: { fontSize: 15, fontWeight: "700", color: "#475569" },
  filterRow: { flexDirection: "row", gap: 12 },
  filterText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  filterActive: { color: MAIN_BLUE },
  vendorCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#f1f5f9", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  vendorMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 17, fontWeight: "800", color: "#1e293b", marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  reviewCount: { fontSize: 12, color: "#94a3b8" },
  vendorPrice: { fontSize: 16, fontWeight: "800", color: MAIN_BLUE },
  vendorIntro: { fontSize: 14, color: "#64748b", lineHeight: 20, marginBottom: 8 },
  coverageText: { fontSize: 12, color: "#94a3b8", marginBottom: 16 },
  bookBtn: { backgroundColor: "#1e293b", height: 48, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  bookBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // 안내/비었을 때
  guideBox: { padding: 40, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: "#fff", borderRadius: 24, borderStyle: "dashed", borderWidth: 1, borderColor: "#cbd5e1" },
  guideText: { textAlign: "center", fontSize: 15, color: "#64748b", lineHeight: 22 },
  emptyBox: { padding: 40, alignItems: "center", gap: 8 },
  emptyText: { color: "#94a3b8", fontSize: 14 },
});