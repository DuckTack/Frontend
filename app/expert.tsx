import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert, StyleSheet, Platform } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";

// [원본 로직 및 컴포넌트 유지]
import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getExpertInfo, ExpertInfo } from "../src/api/guides";
import { listExpertVendors, listNearbyCompanies, type ExpertVendor, type ExpertVendorSort, VENDOR_REGIONS } from "../src/api/experts";
import { requestCurrentCoordinates, type Coordinates } from "../src/utils/location";

const MAIN_BLUE = "#3b82f6";

function issueTypeLabel(t: IssueType) {
  const labels: Record<string, string> = { 
    CRACK: "균열", LEAK: "누수", MOLD: "곰팡이", DAMAGE: "파손", ELECTRIC: "전기", GAS: "가스" 
  };
  return labels[t] || "기타";
}

function formatPrice(price: number, maxPrice?: number) {
  if (maxPrice && maxPrice > price) {
    return `${price.toLocaleString()}원~${maxPrice.toLocaleString()}원`;
  }
  return `${price.toLocaleString()}원~`;
}

function formatDistanceKm(distanceKm?: number | null) {
  if (distanceKm == null || Number.isNaN(distanceKm)) return "거리 정보 없음";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
  return `${distanceKm.toFixed(1)}km`;
}

function mergeVendorsWithNearby(baseVendors: ExpertVendor[], nearbyVendors: ExpertVendor[]) {
  if (nearbyVendors.length === 0) return baseVendors;

  const baseById = new Map(baseVendors.map((vendor) => [String(vendor.id), vendor]));
  const baseByName = new Map(baseVendors.map((vendor) => [vendor.name, vendor]));
  const nearbyIds = new Set<string>();

  const merged = baseVendors.map((vendor) => {
    const nearby = nearbyVendors.find((item) => String(item.id) === String(vendor.id) || item.name === vendor.name);
    if (!nearby) return vendor;
    nearbyIds.add(String(nearby.id));
    return {
      ...vendor,
      distanceKm: nearby.distanceKm,
      minPrice: nearby.minPrice || vendor.minPrice,
      maxPrice: nearby.maxPrice ?? vendor.maxPrice,
      addressLine: nearby.addressLine ?? vendor.addressLine,
      phone: nearby.phone ?? vendor.phone,
      serviceRegionLabel: nearby.serviceRegionLabel ?? vendor.serviceRegionLabel,
    };
  });

  nearbyVendors.forEach((vendor) => {
    const byId = baseById.get(String(vendor.id));
    const byName = baseByName.get(vendor.name);
    if (byId || byName || nearbyIds.has(String(vendor.id))) return;
    merged.push(vendor);
  });

  return merged;
}

export default function Expert() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();
  
  // --- [원본 상태 관리 로직] ---
  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [info, setInfo] = useState<ExpertInfo | null>(null);
  const [vendors, setVendors] = useState<ExpertVendor[]>([]);
  const [resolvedIssueType, setResolvedIssueType] = useState<IssueType>("MOLD");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ExpertVendorSort>("price");
  const [sortAscending, setSortAscending] = useState(true);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  // --- [원본 데이터 로딩 로직] ---
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

  // --- [원본 위치 획득 로직] ---
  async function handleGetCurrentLocation() {
    try {
      setRequestingLocation(true);
      const coords = await requestCurrentCoordinates();
      setUserCoordinates(coords);
      if (selectedRegion) {
        await loadVendors(selectedRegion, sortKey, sortAscending);
      }
      Alert.alert("위치 확인 완료", "가까운 업체 순 거리 정보가 업데이트되었습니다.");
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (message === "LOCATION_SERVICE_DISABLED") {
        Alert.alert("위치 서비스 꺼짐", "휴대폰 위치 서비스를 켠 뒤 다시 시도해주세요.");
      } else if (message === "LOCATION_PERMISSION_DENIED") {
        Alert.alert("위치 권한 거부", "권한이 필요합니다.");
      } else {
        Alert.alert("위치 확인 실패", "현재 위치를 가져오지 못했습니다.");
      }
    } finally {
      setRequestingLocation(false);
    }
  }

  // --- [원본 업체 조회 및 정렬 로직] ---
  const loadVendors = useCallback(async (region: string, nextSortKey = sortKey, nextAscending = sortAscending) => {
    try {
      setVendorsLoading(true);
      const baseVendors = await listExpertVendors({
        region,
        issueType: resolvedIssueType,
        sortKey: nextSortKey,
        direction: nextAscending ? "asc" : "desc",
      });

      if (!userCoordinates) {
        setVendors(baseVendors);
        return;
      }

      const nearbyVendors = await listNearbyCompanies({
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        region,
      });

      setVendors(mergeVendorsWithNearby(baseVendors, nearbyVendors));
    } catch {
      setVendors([]);
      Alert.alert("조회 실패", "전문업체 API 정보를 확인해주세요.");
    } finally {
      setVendorsLoading(false);
    }
  }, [resolvedIssueType, sortKey, sortAscending, userCoordinates]);

  useFocusEffect(
    useCallback(() => {
      if (selectedRegion) {
        loadVendors(selectedRegion, sortKey, sortAscending);
      }
    }, [selectedRegion, sortKey, sortAscending, loadVendors])
  );

  const handleSortPress = (nextKey: ExpertVendorSort) => {
    const nextAscending = sortKey === nextKey ? !sortAscending : true;
    setSortKey(nextKey);
    setSortAscending(nextAscending);
    if (selectedRegion) {
      loadVendors(selectedRegion, nextKey, nextAscending);
    }
  };

  const vendorsWithDistance = useMemo(() => vendors, [vendors]);

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

        {/* 위치 확인 섹션 (디자인 적용) */}
        <View style={styles.locationBox}>
           <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle}>내 위치 기준 거리 보기</Text>
              <Text style={styles.locationDesc}>
                {userCoordinates ? "현재 위치 확인 완료" : "업체와의 거리를 표시합니다."}
              </Text>
           </View>
           <Pressable 
              onPress={handleGetCurrentLocation} 
              disabled={requestingLocation}
              style={[styles.locationBtn, userCoordinates && styles.locationBtnActive]}
           >
              <MaterialCommunityIcons 
                name={requestingLocation ? "loading" : "target"} 
                size={18} 
                color={userCoordinates ? "#fff" : MAIN_BLUE} 
              />
              <Text style={[styles.locationBtnText, userCoordinates && { color: "#fff" }]}>
                {requestingLocation ? "확인중" : "위치 갱신"}
              </Text>
           </Pressable>
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
              <Text style={styles.listCount}>추천 업체 {vendorsWithDistance.length}곳</Text>
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
            ) : vendorsWithDistance.length === 0 ? (
              <View style={styles.emptyBox}>
                <Feather name="info" size={24} color="#94a3b8" />
                <Text style={styles.emptyText}>해당 지역에 등록된 업체가 없습니다.</Text>
              </View>
            ) : (
              vendorsWithDistance.map((vendor) => (
                <View key={vendor.id} style={styles.vendorCard}>
                  <View style={styles.vendorMain}>
                    <View style={styles.vendorInfo}>
                      <Text style={styles.vendorName}>{vendor.name}</Text>
                      <View style={styles.ratingRow}>
                        <FontAwesome name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>{vendor.rating.toFixed(1)}</Text>
                        <Text style={styles.reviewCount}>({vendor.reviewCount})</Text>
                        {vendor.distanceKm != null && (
                          <Text style={styles.distanceBadge}>
                             {formatDistanceKm(vendor.distanceKm)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.vendorPrice}>{formatPrice(vendor.minPrice, vendor.maxPrice)}</Text>
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

  // 상단 카드 및 정보
  infoCard: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
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

  // 위치 확인 섹션
  locationBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#fff", 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  locationTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  locationDesc: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  locationBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    backgroundColor: "#eff6ff", 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12 
  },
  locationBtnActive: { backgroundColor: MAIN_BLUE },
  locationBtnText: { fontSize: 13, fontWeight: "700", color: MAIN_BLUE },

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
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  reviewCount: { fontSize: 12, color: "#94a3b8" },
  distanceBadge: { fontSize: 12, color: MAIN_BLUE, fontWeight: "700", backgroundColor: "#eff6ff", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
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