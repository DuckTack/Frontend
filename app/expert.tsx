import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import ScreenState from "../src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "../src/api/histories";
import { getExpertInfo, ExpertInfo } from "../src/api/guides";
import { listExpertVendors, type ExpertVendor, type ExpertVendorSort, VENDOR_REGIONS } from "../src/api/experts";

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
          ) : vendors.length === 0 ? (
            <Text style={{ opacity: 0.75 }}>전문업체 API 응답이 없거나 백엔드에 아직 구현되지 않았습니다.</Text>
          ) : (
            vendors.map((vendor) => (
              <View key={vendor.id} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontWeight: "800", flex: 1 }}>{vendor.name}</Text>
                  <Text>{formatPrice(vendor.minPrice)}</Text>
                </View>
                <Text>별점 {vendor.rating.toFixed(1)} / 리뷰 {vendor.reviewCount}개</Text>
                <Text style={{ opacity: 0.8 }}>{vendor.intro}</Text>
                <Text style={{ opacity: 0.75 }}>활동 지역: {vendor.coverageAreas.join(", ")}</Text>
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
