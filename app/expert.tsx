import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import ScreenState from "../src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getExpertInfo, ExpertInfo } from "../src/api/guides";
import { listExpertVendors, type ExpertVendor, type ExpertVendorSort, VENDOR_REGIONS } from "../src/api/experts";
import { calculateDistanceKm, formatDistanceKm, requestCurrentCoordinates, type Coordinates } from "../src/utils/location";

function issueTypeLabel(t: IssueType) {
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

function formatPrice(price: number) {
  return `${price.toLocaleString()}원~`;
}

function withDistance(vendors: ExpertVendor[], coords: Coordinates | null) {
  return vendors.map((vendor) => {
    if (!coords || vendor.latitude == null || vendor.longitude == null) {
      return { ...vendor, distanceKm: undefined as number | undefined };
    }
    return {
      ...vendor,
      distanceKm: calculateDistanceKm(coords, {
        latitude: vendor.latitude,
        longitude: vendor.longitude,
      }),
    };
  });
}

export default function Expert() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();
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
      Alert.alert("업체 조회 실패", "전문업체 API가 없거나 응답 형식이 다릅니다.");
    } finally {
      setVendorsLoading(false);
    }
  }

  async function handleGetCurrentLocation() {
    try {
      setRequestingLocation(true);
      const coords = await requestCurrentCoordinates();
      setUserCoordinates(coords);
      Alert.alert("현재 위치 확인 완료", "이제 업체 목록에서 내 위치 기준 거리를 보여줄 수 있습니다.");
    } catch (error: any) {
      const message = String(error?.message ?? "");
      if (message === "LOCATION_SERVICE_DISABLED") {
        Alert.alert("위치 서비스 꺼짐", "휴대폰 위치 서비스를 켠 뒤 다시 시도해주세요.");
      } else if (message === "LOCATION_PERMISSION_DENIED") {
        Alert.alert("위치 권한 거부", "가까운 업체 거리를 보려면 위치 권한이 필요합니다.");
      } else {
        Alert.alert("위치 확인 실패", "현재 위치를 가져오지 못했습니다.");
      }
    } finally {
      setRequestingLocation(false);
    }
  }

  function handleSortPress(nextKey: ExpertVendorSort) {
    const nextAscending = sortKey === nextKey ? !sortAscending : true;
    setSortKey(nextKey);
    setSortAscending(nextAscending);
    if (selectedRegion) {
      loadVendors(selectedRegion, nextKey, nextAscending);
    }
  }

  function sortLabel(key: ExpertVendorSort, base: string) {
    if (sortKey !== key) return base;
    return `${base} ${sortAscending ? "↑" : "↓"}`;
  }

  const vendorsWithDistance = useMemo(() => withDistance(vendors, userCoordinates), [vendors, userCoordinates]);

  if (loading || !info) {
    return <ScreenState loading />;
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>전문가 안내</Text>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 8 }}>
        <Text style={{ fontWeight: "700" }}>예상 견적</Text>
        <Text>{info.estimateRange}</Text>
        {info.notes?.map((n) => <Text key={n}>- {n}</Text>)}
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 10 }}>
        <Text style={{ fontWeight: "800" }}>내 위치 기준 거리 보기</Text>
        <Pressable onPress={handleGetCurrentLocation} disabled={requestingLocation} style={{ alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, opacity: requestingLocation ? 0.6 : 1 }}>
          <Text>{requestingLocation ? "위치 확인 중..." : userCoordinates ? "현재 위치 다시 받기" : "현재 위치 받기"}</Text>
        </Pressable>
        <Text style={{ opacity: 0.7 }}>
          {userCoordinates ? "현재 위치 확인이 완료되었습니다." : "현재 위치를 확인하면 업체와의 거리를 표시할 수 있습니다."}
        </Text>
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 10 }}>
        <Text style={{ fontWeight: "800" }}>지역 선택</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {VENDOR_REGIONS.map((region: string) => (
            <Pressable key={region} onPress={() => { setSelectedRegion(region); setSortKey("price"); setSortAscending(true); loadVendors(region, "price", true); }} style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, opacity: selectedRegion === region ? 1 : 0.55 }}>
              <Text>{region}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {selectedRegion ? (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 10 }}>
          <Text style={{ fontWeight: "800" }}>업체 추천 ({selectedRegion} / {issueTypeLabel(resolvedIssueType)})</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable onPress={() => handleSortPress("price")} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }}><Text>{sortLabel("price", "가격순")}</Text></Pressable>
            <Pressable onPress={() => handleSortPress("rating")} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }}><Text>{sortLabel("rating", "별점순")}</Text></Pressable>
            <Pressable onPress={() => handleSortPress("name")} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }}><Text>{sortLabel("name", "가나다순")}</Text></Pressable>
          </View>

          {vendorsLoading ? (
            <Text style={{ opacity: 0.75 }}>업체 불러오는 중...</Text>
          ) : vendorsWithDistance.length === 0 ? (
            <Text style={{ opacity: 0.75 }}>전문업체 API 응답이 없거나 백엔드에 아직 구현되지 않았습니다.</Text>
          ) : (
            vendorsWithDistance.map((vendor) => (
              <View key={vendor.id} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontWeight: "800", flex: 1 }}>{vendor.name}</Text>
                  <Text>{formatPrice(vendor.minPrice)}</Text>
                </View>
                <Text>별점 {vendor.rating.toFixed(1)} / 리뷰 {vendor.reviewCount}개</Text>
                <Text style={{ opacity: 0.8 }}>{vendor.intro}</Text>
                <Text style={{ opacity: 0.75 }}>활동 지역: {vendor.coverageAreas.join(", ") || vendor.region || "-"}</Text>
                <Text style={{ opacity: 0.75 }}>거리: {formatDistanceKm((vendor as any).distanceKm)}</Text>
                {(vendor.addressLine || vendor.serviceRegionLabel) ? <Text style={{ opacity: 0.75 }}>주소: {vendor.addressLine || vendor.serviceRegionLabel}</Text> : null}
                {userCoordinates && vendor.latitude == null ? <Text style={{ opacity: 0.62 }}>업체 위치 정보가 아직 없어 거리 계산은 연결 대기 상태입니다.</Text> : null}
                <Pressable onPress={() => router.push({ pathname: "/expert-booking", params: { historyId: historyId ? String(historyId) : undefined, vendorId: vendor.id, vendorName: vendor.name, vendorPhone: vendor.phone, vendorIntro: vendor.intro, vendorMinPrice: String(vendor.minPrice), issueType: resolvedIssueType } })} style={{ marginTop: 6, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10 }}>
                  <Text style={{ fontWeight: "700" }}>예약 페이지로 이동</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12 }}><Text style={{ opacity: 0.75 }}>지역을 먼저 선택하면 업체 리스트가 나타납니다.</Text></View>
      )}
    </ScrollView>
  );
}
