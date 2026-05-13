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

/**
 * 카카오 지역검색 결과가 실제로 풍부하게 나오는 "복합명사" 키워드 매핑.
 *  - 공백이 붙으면 토큰 수가 늘어나 매칭 확률이 급격히 떨어짐 → 붙여쓰기.
 *  - "업체" 접미사는 카카오에서 일반적인 상호/카테고리명과 겹쳐서 효과가 낮음. 대신 구체 업무명 사용.
 */
function issueTypeSearchKeyword(t: IssueType): string {
  const map: Record<string, string> = {
    LEAK: "누수수리",
    MOLD: "곰팡이제거",
    CRACK: "외벽보수",
    DAMAGE: "리모델링",
    ELECTRIC: "전기공사",
    GAS: "도시가스",
  };
  return map[t] ?? "집수리";
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

function formatRating(avgRating?: number | null) {
  if (avgRating === null || avgRating === undefined || Number.isNaN(avgRating)) return "리뷰 없음";
  return avgRating.toFixed(1);
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

  // --- [업체 조회 로직 - 개편] ---
  // 설계 원칙:
  //  - 백엔드에 등록된 업체 = 제휴 업체(isPartner=true).
  //  - 외부 지도 검색 결과 = 일반 업체(isPartner=false).
  //  - GPS 가 있으면 백엔드 /api/companies/nearby 가 두 소스를 합쳐서
  //    "제휴 우선 → 거리순" 으로 정렬해 반환한다. 프론트는 그 결과만 그대로 보여주면 된다.
  //  - GPS 가 없으면 /api/experts/vendors (제휴 업체 전용) 로 폴백한다.
  //  - 키워드는 이슈 중심으로 전달하고, 백엔드가 반경/보강 검색을 수행한다.
  const loadVendors = useCallback(async (region: string, nextSortKey = sortKey, nextAscending = sortAscending) => {
    try {
      setVendorsLoading(true);

      // GPS 있음 → 외부검색+제휴 통합 엔드포인트 사용 (백엔드가 정렬/보강 검색 수행)
      if (userCoordinates) {
        // 지역명을 강하게 붙이면 좌표/반경 기반 검색에서 오히려 0건이 나는 케이스가 있어
        // 이슈 중심 키워드만 전달하고, 백엔드가 후보 키워드/반경 fallback을 적용한다.
        const keyword = `${region} ${issueTypeSearchKeyword(resolvedIssueType)}`.trim();
        const nearbyVendors = await listNearbyCompanies({
          latitude: userCoordinates.latitude,
          longitude: userCoordinates.longitude,
          region,
          keyword,
        });

        // 클라이언트 정렬 옵션 반영 (가격순/별점순) - 단, "제휴 우선" 은 항상 유지한다.
        const sorted = [...nearbyVendors].sort((a, b) => {
          // 1) 제휴 업체 우선
          const partnerDiff = Number(!!b.isPartner) - Number(!!a.isPartner);
          if (partnerDiff !== 0) return partnerDiff;
          // 2) 사용자가 고른 정렬키
          const direction = nextAscending ? 1 : -1;
          if (nextSortKey === "price") {
            return (a.minPrice - b.minPrice) * direction;
          }
          if (nextSortKey === "rating") {
            return (a.rating - b.rating) * direction;
          }
          // 3) 그 외엔 거리순 (GPS 기반 화면의 기본값)
          const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
          const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
          return da - db;
        });
        setVendors(sorted);
        return;
      }

      // GPS 없음 → 제휴 업체 전용 엔드포인트로 폴백
      const baseVendors = await listExpertVendors({
        region,
        issueType: resolvedIssueType,
        sortKey: nextSortKey,
        direction: nextAscending ? "asc" : "desc",
      });
      setVendors(baseVendors);
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
  const partnerCount = useMemo(
    () => vendorsWithDistance.filter((v) => v.isPartner).length,
    [vendorsWithDistance],
  );
  const externalCount = vendorsWithDistance.length - partnerCount;

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
              <View style={{ flex: 1 }}>
                <Text style={styles.listCount}>추천 업체 {vendorsWithDistance.length}곳</Text>
                {vendorsWithDistance.length > 0 && (
                  <Text style={styles.listSubCount}>
                    제휴 {partnerCount}곳 · 외부검색 {externalCount}곳
                  </Text>
                )}
              </View>
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
                <Text style={styles.emptyText}>
                  {userCoordinates
                    ? "주변에 검색된 업체가 없습니다. 다른 지역/증상으로 다시 시도해 주세요."
                    : "위치 갱신 버튼을 눌러 내 주변 업체를 검색해 주세요."}
                </Text>
              </View>
            ) : (
              vendorsWithDistance.map((vendor) => (
                <View
                  key={vendor.id}
                  style={[styles.vendorCard, vendor.isPartner && styles.vendorCardPartner]}
                >
                  <View style={styles.vendorMain}>
                    <View style={styles.vendorInfo}>
                      <View style={styles.vendorNameRow}>
                        <Text style={styles.vendorName}>{vendor.name}</Text>
                        {vendor.isPartner ? (
                          <View style={styles.partnerBadge}>
                            <FontAwesome name="handshake-o" size={11} color="#fff" />
                            <Text style={styles.partnerBadgeText}>제휴</Text>
                          </View>
                        ) : (
                          <View style={styles.externalBadge}>
                            <Text style={styles.externalBadgeText}>외부</Text>
                          </View>
                        )}
                        <Pressable
                          onPress={() => router.push({
                            pathname: "/expert-reviews/[vendorId]",
                            params: {
                              vendorId: vendor.companyId ?? vendor.kakaoPlaceId ?? vendor.id,
                              vendorName: vendor.name,
                              companyId: vendor.companyId,
                              kakaoPlaceId: vendor.kakaoPlaceId,
                            },
                          })}
                          style={({ pressed }) => [styles.reviewButton, pressed && styles.reviewButtonPressed]}
                          hitSlop={8}
                        >
                          <FontAwesome name="star" size={12} color="#fff" />
                          <Text style={styles.reviewButtonText}>리뷰 보기</Text>
                          <Feather name="chevron-right" size={13} color="#fff" />
                        </Pressable>
                      </View>
                      <View style={styles.ratingRow}>
                        <FontAwesome name="star" size={14} color="#f59e0b" />
                        <Text style={styles.ratingText}>{formatRating(vendor.avgRating)}</Text>
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

                  {vendor.intro ? (
                    <Text style={styles.vendorIntro} numberOfLines={2}>{vendor.intro}</Text>
                  ) : null}
                  {vendor.addressLine ? (
                    <Text style={styles.coverageText}>주소: {vendor.addressLine}</Text>
                  ) : vendor.coverageAreas.length > 0 ? (
                    <Text style={styles.coverageText}>활동 지역: {vendor.coverageAreas.join(", ")}</Text>
                  ) : null}

                  <Pressable
                    onPress={() => router.push({ 
                      pathname: "/expert-booking", 
                      params: { 
                        historyId: historyId ? String(historyId) : undefined, 
                        vendorId: vendor.id,
                        companyId: vendor.companyId,
                        kakaoPlaceId: vendor.kakaoPlaceId,
                        kakaoPlaceName: vendor.name,
                        kakaoPlacePhone: vendor.phone,
                        kakaoPlaceAddress: vendor.addressLine,
                        kakaoPlaceLat: vendor.latitude != null ? String(vendor.latitude) : undefined,
                        kakaoPlaceLng: vendor.longitude != null ? String(vendor.longitude) : undefined,
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
  listSubCount: { fontSize: 12, color: "#94a3b8", marginTop: 2, fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 12 },
  filterText: { fontSize: 13, color: "#94a3b8", fontWeight: "600" },
  filterActive: { color: MAIN_BLUE },
  vendorCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#f1f5f9", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
  vendorCardPartner: { borderColor: MAIN_BLUE, borderWidth: 1.5, backgroundColor: "#f8fbff" },
  vendorMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  vendorInfo: { flex: 1 },
  vendorNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  vendorName: { fontSize: 17, fontWeight: "800", color: "#1e293b" },
  partnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: MAIN_BLUE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partnerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  externalBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  externalBadgeText: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: MAIN_BLUE,
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: MAIN_BLUE,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  reviewButtonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  reviewButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
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