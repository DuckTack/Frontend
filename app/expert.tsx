import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert, StyleSheet, Linking } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons, FontAwesome } from "@expo/vector-icons";

import ScreenState from "../src/components/ScreenState";
import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getExpertInfo, ExpertInfo } from "../src/api/guides";
import {
  listExpertVendors,
  listNearbyCompanies,
  REGION_COORDS,
  type ExpertVendor,
  type ExpertVendorSort,
  type VendorRegion,
  VENDOR_REGIONS,
} from "../src/api/experts";
import { requestCurrentCoordinates, type Coordinates } from "../src/utils/location";

const MAIN_BLUE = "#4F46E5";

function issueTypeLabel(t?: string | null) {
  const value = String(t ?? "").trim().toUpperCase();
  const labels: Record<string, string> = {
    CRACK: "균열",
    LEAK: "누수",
    MOLD: "곰팡이",
    PEEL: "박리",
    PAINT_PEEL: "박리",
    CORROSION: "부식",
    BULGE: "들뜸",
  };
  return labels[value] || "기타";
}

function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const text = Array.isArray(value) ? value[0] : value;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function issueTypeSearchKeyword(t: IssueType): string {
  const value = String(t ?? "").trim().toUpperCase();
  const map: Record<string, string> = {
    LEAK: "누수수리",
    MOLD: "곰팡이제거",
    CRACK: "균열보수",
    PEEL: "페인트박리보수",
    PAINT_PEEL: "페인트박리보수",
    CORROSION: "부식보수",
    BULGE: "타일들뜸보수",
  };
  return map[value] ?? "집수리";
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

function cleanPhoneNumber(phone?: string | null) {
  if (!phone) return "";
  return String(phone).replace(/[^0-9+]/g, "");
}

async function callVendor(phone?: string | null) {
  const cleanPhone = cleanPhoneNumber(phone);

  if (!cleanPhone) {
    Alert.alert("전화번호 없음", "이 업체는 전화번호가 제공되지 않았습니다.");
    return;
  }

  try {
    await Linking.openURL(`tel:${cleanPhone}`);
  } catch {
    Alert.alert("전화 연결 실패", "이 기기에서 전화 연결을 열 수 없습니다.");
  }
}

async function openPlaceUrl(placeUrl?: string | null) {
  if (!placeUrl) {
    Alert.alert("장소 정보 없음", "카카오 장소 페이지가 제공되지 않았습니다.");
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(placeUrl);

    if (!canOpen) {
      Alert.alert("연결 실패", "카카오 장소 페이지를 열 수 없습니다.");
      return;
    }

    await Linking.openURL(placeUrl);
  } catch {
    Alert.alert("연결 실패", "카카오 장소 페이지를 열 수 없습니다.");
  }
}

function isPartnerVendor(vendor: ExpertVendor) {
  return vendor.isPartner === true && !!vendor.companyId;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function withDistanceFromUser(vendors: ExpertVendor[], coords: Coordinates): ExpertVendor[] {
  return vendors.map((vendor) => {
    if (vendor.latitude == null || vendor.longitude == null) {
      return vendor;
    }

    return {
      ...vendor,
      distanceKm: calculateDistanceKm(
          coords.latitude,
          coords.longitude,
          vendor.latitude,
          vendor.longitude,
      ),
    };
  });
}

function getFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function comparePartnerFirst(a: ExpertVendor, b: ExpertVendor) {
  return Number(isPartnerVendor(b)) - Number(isPartnerVendor(a));
}

function sortPartnerFirstByDistance(vendors: ExpertVendor[], ascending = true) {
  return [...vendors].sort((a, b) => {
    const partnerDiff = comparePartnerFirst(a, b);
    if (partnerDiff !== 0) return partnerDiff;

    const da = getFiniteNumber(a.distanceKm);
    const db = getFiniteNumber(b.distanceKm);

    if (da === null && db !== null) return 1;
    if (da !== null && db === null) return -1;

    if (da !== null && db !== null && da !== db) {
      return ascending ? da - db : db - da;
    }

    const ra = getFiniteNumber(a.avgRating) ?? 0;
    const rb = getFiniteNumber(b.avgRating) ?? 0;
    if (rb !== ra) return rb - ra;

    const ca = getFiniteNumber(a.reviewCount) ?? 0;
    const cb = getFiniteNumber(b.reviewCount) ?? 0;
    if (cb !== ca) return cb - ca;

    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });
}

function sortPartnerFirstByRating(vendors: ExpertVendor[], ascending = false) {
  return [...vendors].sort((a, b) => {
    const partnerDiff = comparePartnerFirst(a, b);
    if (partnerDiff !== 0) return partnerDiff;

    const ra = getFiniteNumber(a.avgRating) ?? 0;
    const rb = getFiniteNumber(b.avgRating) ?? 0;

    if (ra !== rb) {
      return ascending ? ra - rb : rb - ra;
    }

    const ca = getFiniteNumber(a.reviewCount) ?? 0;
    const cb = getFiniteNumber(b.reviewCount) ?? 0;
    if (cb !== ca) return cb - ca;

    const da = getFiniteNumber(a.distanceKm) ?? Number.POSITIVE_INFINITY;
    const db = getFiniteNumber(b.distanceKm) ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;

    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });
}

function sortPartnerFirstByName(vendors: ExpertVendor[]) {
  return [...vendors].sort((a, b) => {
    const partnerDiff = Number(isPartnerVendor(b)) - Number(isPartnerVendor(a));
    if (partnerDiff !== 0) return partnerDiff;

    return String(a.name || "").localeCompare(String(b.name || ""), "ko");
  });
}

export default function Expert() {
  const { historyId, issueType, riskScore, areaRatio } = useLocalSearchParams<{
    historyId?: string;
    issueType?: string;
    riskScore?: string;
    areaRatio?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [info, setInfo] = useState<ExpertInfo | null>(null);
  const [vendors, setVendors] = useState<ExpertVendor[]>([]);
  const [resolvedIssueType, setResolvedIssueType] = useState<IssueType>("MOLD");
  const [resolvedRiskScore, setResolvedRiskScore] = useState<number | undefined>(undefined);
  const [resolvedAreaRatio, setResolvedAreaRatio] = useState<number | undefined>(undefined);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<ExpertVendorSort>("distance");
  const [sortAscending, setSortAscending] = useState(true);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationSortEnabled, setLocationSortEnabled] = useState(false);

  const userCoordinatesRef = useRef<Coordinates | null>(null);
  const autoLocationDoneRef = useRef(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        let t: IssueType = (issueType as IssueType) || "MOLD";
        let score = toNumberOrUndefined(riskScore);
        let area = toNumberOrUndefined(areaRatio);

        if (historyId) {
          try {
            const h = await getHistoryDetail(String(historyId));
            t = (h.issueType || t) as IssueType;
            score = h.riskScore ?? score;
            area = h.areaRatio ?? area;
          } catch {
            // 기본값 유지
          }
        }

        const i = await getExpertInfo(t, score, area);
        setResolvedIssueType(t);
        setResolvedRiskScore(score);
        setResolvedAreaRatio(area);
        setInfo(i);
      } catch {
        const i = await getExpertInfo("MOLD", undefined, undefined);
        setResolvedIssueType("MOLD");
        setResolvedRiskScore(undefined);
        setResolvedAreaRatio(undefined);
        setInfo(i);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [historyId, issueType, riskScore, areaRatio]);

  useEffect(() => {
    userCoordinatesRef.current = userCoordinates;
  }, [userCoordinates]);

  async function findNearestRegionFromVendors(coords: Coordinates): Promise<VendorRegion> {
    const issueKeyword = issueTypeSearchKeyword(resolvedIssueType);

    const results = await Promise.allSettled(
        VENDOR_REGIONS.map(async (region): Promise<{ region: VendorRegion; nearestDistance: number }> => {
          const typedRegion = region as VendorRegion;
          const regionCoords = REGION_COORDS[typedRegion];

          const regionVendors = await listNearbyCompanies({
            latitude: regionCoords.latitude,
            longitude: regionCoords.longitude,
            region,
            keyword: `${region} ${issueKeyword}`.trim(),
          });

          const withDistance = withDistanceFromUser(regionVendors, coords).filter(
              (vendor) => vendor.distanceKm != null && Number.isFinite(vendor.distanceKm),
          );

          const nearestDistance =
              withDistance.length > 0
                  ? Math.min(...withDistance.map((vendor) => vendor.distanceKm ?? Number.POSITIVE_INFINITY))
                  : Number.POSITIVE_INFINITY;

          return { region: typedRegion, nearestDistance };
        }),
    );

    type RegionCandidate = { region: VendorRegion; nearestDistance: number };

    const candidates = results
        .filter((result): result is PromiseFulfilledResult<RegionCandidate> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((item) => Number.isFinite(item.nearestDistance))
        .sort((a, b) => a.nearestDistance - b.nearestDistance);

    if (candidates.length > 0) {
      return candidates[0].region;
    }

    return (Object.entries(REGION_COORDS) as [VendorRegion, Coordinates][])
        .map(([region, center]) => ({
          region,
          distance: calculateDistanceKm(coords.latitude, coords.longitude, center.latitude, center.longitude),
        }))
        .sort((a, b) => a.distance - b.distance)[0]?.region ?? "서울";
  }

  async function handleGetCurrentLocation() {
    try {
      setRequestingLocation(true);
      const coords = await requestCurrentCoordinates();

      userCoordinatesRef.current = coords;
      setUserCoordinates(coords);
      setLocationSortEnabled(true);

      const nextRegion = selectedRegion ?? (await findNearestRegionFromVendors(coords));
      setSelectedRegion(nextRegion);
      setSortKey("distance");
      setSortAscending(true);

      await loadVendors(nextRegion, "distance", true, coords, true);
      Alert.alert("위치 확인 완료", "현재 위치 기준으로 가까운 업체를 정렬했습니다.");
    } catch (error: any) {
      const message = String(error?.message ?? "");

      if (message === "LOCATION_SERVICE_DISABLED") {
        Alert.alert("위치 서비스 꺼짐", "휴대폰 위치 서비스를 켠 뒤 다시 시도해주세요.");
      } else if (message === "LOCATION_PERMISSION_DENIED") {
        Alert.alert("위치 권한 거부", "위치 권한을 허용해야 가까운 업체순으로 볼 수 있습니다.");
      } else {
        Alert.alert("위치 확인 실패", "현재 위치를 가져오지 못했습니다.");
      }
    } finally {
      setRequestingLocation(false);
    }
  }

  const loadVendors = useCallback(
      async (
          region: string,
          nextSortKey = sortKey,
          nextAscending = sortAscending,
          coords = userCoordinatesRef.current,
          useDistanceSort = locationSortEnabled,
      ) => {
        try {
          setVendorsLoading(true);

          const regionCoords = REGION_COORDS[region as VendorRegion];
          const keyword = `${region} ${issueTypeSearchKeyword(resolvedIssueType)}`.trim();

          if (regionCoords) {
            try {
              const regionVendors = await listNearbyCompanies({
                latitude: regionCoords.latitude,
                longitude: regionCoords.longitude,
                region,
                keyword,
              });

              if (regionVendors.length > 0) {
                const enrichedVendors = coords ? withDistanceFromUser(regionVendors, coords) : regionVendors;

                if (nextSortKey === "rating") {
                  setVendors(sortPartnerFirstByRating(enrichedVendors, nextAscending));
                } else if (nextSortKey === "distance") {
                  setVendors(sortPartnerFirstByDistance(enrichedVendors, nextAscending));
                } else {
                  setVendors(sortPartnerFirstByName(enrichedVendors));
                }

                return;
              }
            } catch (err) {
              console.log("지역 중심 업체 조회 실패. 제휴업체 API로 fallback:", err);
            }
          }

          const baseVendors = await listExpertVendors({
            region,
            issueType: resolvedIssueType,
            sortKey: nextSortKey,
            direction: nextAscending ? "asc" : "desc",
          });

          const enrichedBaseVendors = coords ? withDistanceFromUser(baseVendors, coords) : baseVendors;

          if (nextSortKey === "rating") {
            setVendors(sortPartnerFirstByRating(enrichedBaseVendors, nextAscending));
          } else if (nextSortKey === "distance") {
            setVendors(sortPartnerFirstByDistance(enrichedBaseVendors, nextAscending));
          } else {
            setVendors(sortPartnerFirstByName(enrichedBaseVendors));
          }
        } catch {
          setVendors([]);
          Alert.alert("조회 실패", "전문업체 API 정보를 확인해주세요.");
        } finally {
          setVendorsLoading(false);
        }
      },
      [resolvedIssueType, sortKey, sortAscending, locationSortEnabled],
  );

  useEffect(() => {
    if (loading || !info || autoLocationDoneRef.current) return;

    autoLocationDoneRef.current = true;

    (async () => {
      try {
        setRequestingLocation(true);
        const coords = await requestCurrentCoordinates();

        userCoordinatesRef.current = coords;
        setUserCoordinates(coords);
        setLocationSortEnabled(true);

        const nearestRegion = await findNearestRegionFromVendors(coords);
        setSelectedRegion(nearestRegion);
        setSortKey("distance");
        setSortAscending(true);

        await loadVendors(nearestRegion, "distance", true, coords, true);
      } catch {
        const fallbackRegion = "서울";
        setSelectedRegion(fallbackRegion);
        setLocationSortEnabled(false);
        await loadVendors(fallbackRegion, "distance", true, null, false);
      } finally {
        setRequestingLocation(false);
      }
    })();
  }, [loading, info, resolvedIssueType, loadVendors]);

  useFocusEffect(
      useCallback(() => {
        if (selectedRegion) {
          loadVendors(selectedRegion, sortKey, sortAscending, userCoordinatesRef.current, locationSortEnabled);
        }
      }, [selectedRegion, sortKey, sortAscending, locationSortEnabled, loadVendors]),
  );

  // 수정된 통합 필터 핸들러
  const handleToggleSort = (targetKey: ExpertVendorSort) => {
    const coords = userCoordinatesRef.current;
    const useDistance = targetKey === "distance" && !!coords;

    let nextAscending = true;

    if (sortKey === targetKey) {
      // 동일한 필터를 또 누르면 차순을 반대로 뒤집음 (토글)
      nextAscending = !sortAscending;
    } else {
      // 새로운 필터를 누를 때 기본값 세팅
      // 거리는 기본 '가까운순(true)', 리뷰는 기본 '높은순(false)'
      nextAscending = targetKey === "distance";
    }

    setSortKey(targetKey);
    setSortAscending(nextAscending);
    setLocationSortEnabled(useDistance);

    if (selectedRegion) {
      loadVendors(selectedRegion, targetKey, nextAscending, coords, useDistance);
    }
  };

  const vendorsWithDistance = useMemo(() => vendors, [vendors]);

  const partnerCount = useMemo(
      () => vendorsWithDistance.filter(isPartnerVendor).length,
      [vendorsWithDistance],
  );

  const externalCount = vendorsWithDistance.length - partnerCount;

  if (loading || !info) return <ScreenState loading />;

  return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
          </Pressable>
          <Text style={styles.headerTitle}>전문가 매칭</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <View style={styles.infoBadge}>
              <Text style={styles.infoBadgeText}>전문가 수리 권장</Text>
            </View>

            <Text style={styles.mainTitle}>{issueTypeLabel(resolvedIssueType)} 수리 견적 안내</Text>

            <View style={styles.estimateBox}>
              <Text style={styles.estimateLabel}>예상 비용 범위</Text>
              <Text style={styles.estimateValue}>{info.estimateRange}</Text>
            </View>

            {info.notes && info.notes.length > 0 ? (
                <View style={styles.notesSection}>
                  <Text style={styles.sectionSmallTitle}>안내 사항</Text>
                  {info.notes.map((n, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Feather name="check" size={14} color={MAIN_BLUE} />
                        <Text style={styles.bulletText}>{n}</Text>
                      </View>
                  ))}
                </View>
            ) : null}
          </View>

          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Feather name="map-pin" size={18} color={MAIN_BLUE} />
              <Text style={styles.sectionTitle}>지역 선택</Text>

              <Pressable
                  onPress={handleGetCurrentLocation}
                  disabled={requestingLocation}
                  style={[styles.locationBtn, userCoordinates ? styles.locationBtnActive : null]}
              >
                <MaterialCommunityIcons
                    name={requestingLocation ? "loading" : "crosshairs-gps"}
                    size={14}
                    color={userCoordinates ? "#fff" : MAIN_BLUE}
                />
                <Text style={[styles.locationBtnText, userCoordinates ? { color: "#fff" } : null]}>
                  {requestingLocation ? "확인중" : userCoordinates ? "위치 갱신" : "내 위치"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.regionGrid}>
              {VENDOR_REGIONS.map((region) => (
                  <Pressable
                      key={region}
                      onPress={() => {
                        const coords = userCoordinatesRef.current;
                        const useDistance = !!coords;

                        setSelectedRegion(region);
                        setSortKey("distance");
                        setSortAscending(true);
                        setLocationSortEnabled(useDistance);
                        loadVendors(region, "distance", true, coords, useDistance);
                      }}
                      style={[styles.regionChip, selectedRegion === region ? styles.regionChipActive : null]}
                  >
                    <Text style={[styles.regionText, selectedRegion === region ? styles.regionTextActive : null]}>
                      {region}
                    </Text>
                  </Pressable>
              ))}
            </View>
          </View>

          {selectedRegion ? (
              <View style={styles.vendorSection}>
                <View style={styles.listHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCount}>추천 업체 {vendorsWithDistance.length}곳</Text>

                    {vendorsWithDistance.length > 0 ? (
                        <Text style={styles.listSubCount}>
                          제휴 {partnerCount}곳 · 외부검색 {externalCount}곳
                        </Text>
                    ) : null}
                  </View>

                  {/* 2개로 간소화된 토글형 필터 탭 */}
                  <View style={styles.filterRow}>
                    <Pressable onPress={() => handleToggleSort("distance")} style={styles.filterBtn}>
                      <Text style={[styles.filterText, sortKey === "distance" && styles.filterActive]}>
                        {sortKey === "distance" ? (sortAscending ? "가까운순 ▼" : "먼순 ▲") : "거리순"}
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => handleToggleSort("rating")} style={styles.filterBtn}>
                      <Text style={[styles.filterText, sortKey === "rating" && styles.filterActive]}>
                        {sortKey === "rating" ? (sortAscending ? "리뷰낮은순 ▲" : "리뷰높은순 ▼") : "리뷰순"}
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
                        {locationSortEnabled
                            ? "현재 위치 기준으로 검색된 업체가 없습니다. 다른 지역을 선택해 주세요."
                            : "선택한 지역에 표시할 업체가 없습니다. 다른 지역을 선택해 주세요."}
                      </Text>
                    </View>
                ) : (
                    vendorsWithDistance.map((vendor) => {
                      const partner = isPartnerVendor(vendor);

                      return (
                          <View
                              key={vendor.id}
                              style={[styles.vendorCard, partner ? styles.vendorCardPartner : null]}
                          >
                            <View style={styles.vendorMain}>
                              <View style={styles.vendorInfo}>
                                <View style={styles.vendorTopRow}>
                                  <View style={styles.vendorNameRow}>
                                    <Text style={styles.vendorName}>{vendor.name}</Text>

                                    {partner ? (
                                        <View style={styles.partnerBadge}>
                                          <FontAwesome name="handshake-o" size={11} color="#fff" />
                                          <Text style={styles.partnerBadgeText}>제휴</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.externalBadge}>
                                          <Text style={styles.externalBadgeText}>외부</Text>
                                        </View>
                                    )}
                                  </View>

                                  {partner ? (
                                      <Pressable
                                          onPress={() =>
                                              router.push({
                                                pathname: "/expert-reviews/[vendorId]",
                                                params: {
                                                  vendorId: vendor.companyId ?? vendor.id,
                                                  vendorName: vendor.name,
                                                  companyId: vendor.companyId,
                                                  readOnly: "true",
                                                  from: "expert",
                                                },
                                              } as any)
                                          }
                                          style={({ pressed }) => [
                                            styles.reviewButton,
                                            pressed ? styles.reviewButtonPressed : null,
                                          ]}
                                          hitSlop={8}
                                      >
                                        <FontAwesome name="star" size={12} color="#fff" />
                                        <Text style={styles.reviewButtonText}>리뷰 보기</Text>
                                        <Feather name="chevron-right" size={13} color="#fff" />
                                      </Pressable>
                                  ) : null}
                                </View>

                                <View style={styles.ratingRow}>
                                  {partner ? (
                                      <>
                                        <FontAwesome name="star" size={14} color="#f59e0b" />
                                        <Text style={styles.ratingText}>{formatRating(vendor.avgRating)}</Text>
                                        <Text style={styles.reviewCount}>({vendor.reviewCount})</Text>
                                      </>
                                  ) : null}

                                  {vendor.distanceKm != null ? (
                                      <Text style={styles.distanceBadge}>{formatDistanceKm(vendor.distanceKm)}</Text>
                                  ) : null}
                                </View>
                              </View>

                              {Number(vendor.minPrice) > 0 ? (
                                  <Text style={styles.vendorPrice}>
                                    {formatPrice(vendor.minPrice, vendor.maxPrice)}
                                  </Text>
                              ) : null}
                            </View>

                            {vendor.intro ? (
                                <Text style={styles.vendorIntro} numberOfLines={2}>
                                  {vendor.intro}
                                </Text>
                            ) : null}

                            {vendor.addressLine ? (
                                <Text style={styles.coverageText}>주소: {vendor.addressLine}</Text>
                            ) : vendor.coverageAreas.length > 0 ? (
                                <Text style={styles.coverageText}>활동 지역: {vendor.coverageAreas.join(", ")}</Text>
                            ) : null}

                            {partner ? (
                                <Pressable
                                    onPress={() =>
                                        router.push({
                                          pathname: "/expert-booking",
                                          params: {
                                            historyId: historyId ? String(historyId) : undefined,
                                            vendorId: vendor.companyId,
                                            companyId: vendor.companyId,
                                            vendorName: vendor.name,
                                            vendorPhone: vendor.phone,
                                            vendorIntro: vendor.intro,
                                            vendorMinPrice: String(vendor.minPrice),
                                            issueType: resolvedIssueType,
                                            riskScore: resolvedRiskScore != null ? String(resolvedRiskScore) : undefined,
                                            areaRatio: resolvedAreaRatio != null ? String(resolvedAreaRatio) : undefined,
                                          },
                                        })
                                    }
                                    style={styles.bookBtn}
                                >
                                  <Text style={styles.bookBtnText}>예약 페이지로 이동</Text>
                                  <Feather name="chevron-right" size={16} color="#fff" />
                                </Pressable>
                            ) : (
                                <View style={styles.externalActions}>
                                  <Pressable onPress={() => callVendor(vendor.phone)} style={styles.callBtn}>
                                    <Feather name="phone" size={15} color="#fff" />
                                    <Text style={styles.callBtnText}>전화 문의</Text>
                                  </Pressable>

                                  <Pressable
                                      onPress={() =>
                                          openPlaceUrl(
                                              (vendor as any).placeUrl ??
                                              (vendor.kakaoPlaceId
                                                  ? `https://place.map.kakao.com/${vendor.kakaoPlaceId}`
                                                  : undefined),
                                          )
                                      }
                                      style={styles.kakaoBtn}
                                  >
                                    <Text style={styles.kakaoBtnText}>카카오에서 보기</Text>
                                    <Feather name="external-link" size={15} color="#1e293b" />
                                  </Pressable>
                                </View>
                            )}
                          </View>
                      );
                    })
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
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 0,
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

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  infoBadgeText: { color: MAIN_BLUE, fontSize: 12, fontWeight: "700" },
  mainTitle: { fontSize: 20, fontWeight: "800", color: "#1e293b", marginBottom: 16 },
  estimateBox: {
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  estimateLabel: { fontSize: 13, color: "#64748b", marginBottom: 4 },
  estimateValue: { fontSize: 20, fontWeight: "800", color: MAIN_BLUE },
  notesSection: { gap: 8 },
  sectionSmallTitle: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 4 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { fontSize: 14, color: "#64748b", flex: 1 },

  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDEDFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  locationBtnActive: { backgroundColor: MAIN_BLUE, borderColor: MAIN_BLUE },
  locationBtnText: { fontSize: 12, fontWeight: "700", color: MAIN_BLUE },

  sectionContainer: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#1e293b" },
  regionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  regionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  regionChipActive: { backgroundColor: MAIN_BLUE, borderColor: MAIN_BLUE },
  regionText: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  regionTextActive: { color: "#fff" },

  vendorSection: { gap: 16 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  listCount: { fontSize: 15, fontWeight: "700", color: "#475569" },
  listSubCount: { fontSize: 12, color: "#94a3b8", marginTop: 2, fontWeight: "600" },

  // 변경 및 최적화된 스타일 컴포넌트
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  filterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  filterText: { fontSize: 13, color: "#94a3b8", fontWeight: "700" },
  filterActive: { color: MAIN_BLUE },

  vendorCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  vendorCardPartner: {
    borderColor: MAIN_BLUE,
    borderWidth: 1.5,
    backgroundColor: "#f8fbff",
  },
  vendorMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  vendorInfo: { flex: 1 },

  vendorTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  vendorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    flexWrap: "wrap",
  },
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
  reviewButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  reviewButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  reviewCount: { fontSize: 12, color: "#94a3b8" },
  distanceBadge: {
    fontSize: 12,
    color: MAIN_BLUE,
    fontWeight: "700",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vendorPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: MAIN_BLUE,
    marginLeft: 8,
  },
  vendorIntro: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 8,
  },
  coverageText: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 16,
  },

  bookBtn: {
    backgroundColor: "#1e293b",
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  bookBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  externalActions: { flexDirection: "row", gap: 8 },
  callBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  callBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  kakaoBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEE500",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  kakaoBtnText: { color: "#1e293b", fontSize: 14, fontWeight: "800" },

  guideBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  guideText: {
    textAlign: "center",
    fontSize: 15,
    color: "#64748b",
    lineHeight: 22,
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
});