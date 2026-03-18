import { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import ScreenState from "@/src/components/ScreenState";
import { router, useLocalSearchParams } from "expo-router";

import { getHistoryDetail, IssueType } from "@/src/api/histories";
import { getExpertInfo, ExpertInfo } from "@/src/api/guides";
import { expertVendors, type SortKey, type VendorRegion, VENDOR_REGIONS } from "@/src/mock/expertVendors";

function issueTypeLabel(t: IssueType) {
  switch (t) {
    case "CRACK":
      return "균열";
    case "LEAK":
      return "누수";
    case "MOLD":
      return "곰팡이";
    default:
      return "기타";
  }
}

function formatPrice(price: number) {
  return `${price.toLocaleString()}원~`;
}

export default function Expert() {
  const { historyId, issueType } = useLocalSearchParams<{ historyId?: string; issueType?: string }>();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ExpertInfo | null>(null);
  const [resolvedIssueType, setResolvedIssueType] = useState<IssueType>("MOLD");
  const [selectedRegion, setSelectedRegion] = useState<VendorRegion | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("price");
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

  const filteredVendors = useMemo(() => {
    if (!selectedRegion) return [];

    const base = expertVendors.filter((vendor) => {
      return vendor.region === selectedRegion && vendor.issueTypes.includes(resolvedIssueType);
    });

    const sorted = [...base].sort((a, b) => {
      if (sortKey === "price") {
        return sortAscending ? a.minPrice - b.minPrice : b.minPrice - a.minPrice;
      }
      if (sortKey === "rating") {
        return sortAscending ? a.rating - b.rating : b.rating - a.rating;
      }
      return sortAscending ? a.name.localeCompare(b.name, "ko") : b.name.localeCompare(a.name, "ko");
    });

    return sorted;
  }, [resolvedIssueType, selectedRegion, sortAscending, sortKey]);

  function handleSortPress(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortAscending((prev) => !prev);
      return;
    }
    setSortKey(nextKey);
    setSortAscending(true);
  }

  function sortLabel(key: SortKey, base: string) {
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

        {info.notes && info.notes.length > 0 ? (
          <>
            <Text style={{ fontWeight: "700", marginTop: 8 }}>참고</Text>
            {info.notes.map((n) => (
              <Text key={n}>- {n}</Text>
            ))}
          </>
        ) : null}

        {info.whyPro && info.whyPro.length > 0 ? (
          <>
            <Text style={{ fontWeight: "700", marginTop: 8 }}>왜 전문가가 필요할 수 있나요?</Text>
            {info.whyPro.map((r) => (
              <Text key={r}>• {r}</Text>
            ))}
          </>
        ) : null}
      </View>

      <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 10 }}>
        <Text style={{ fontWeight: "800" }}>지역 선택</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {VENDOR_REGIONS.map((region) => (
            <Pressable
              key={region}
              onPress={() => {
                setSelectedRegion(region);
                setSortKey("price");
                setSortAscending(true);
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderRadius: 10,
                opacity: selectedRegion === region ? 1 : 0.55,
              }}
            >
              <Text>{region}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {selectedRegion ? (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12, gap: 10 }}>
          <Text style={{ fontWeight: "800" }}>
            업체 추천 ({selectedRegion} / {issueTypeLabel(resolvedIssueType)})
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable onPress={() => handleSortPress("price")} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }}>
              <Text>{sortLabel("price", "가격순")}</Text>
            </Pressable>
            <Pressable onPress={() => handleSortPress("rating")} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }}>
              <Text>{sortLabel("rating", "별점순")}</Text>
            </Pressable>
            <Pressable onPress={() => handleSortPress("name")} style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 }}>
              <Text>{sortLabel("name", "가나다순")}</Text>
            </Pressable>
          </View>

          {filteredVendors.length === 0 ? (
            <View style={{ paddingVertical: 10 }}>
              <Text style={{ opacity: 0.75 }}>선택한 지역과 문제 유형에 맞는 mock 업체가 아직 없습니다.</Text>
            </View>
          ) : (
            filteredVendors.map((vendor) => (
              <View key={vendor.id} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontWeight: "800", flex: 1 }}>{vendor.name}</Text>
                  <Text>{formatPrice(vendor.minPrice)}</Text>
                </View>
                <Text>별점 {vendor.rating.toFixed(1)} / 리뷰 {vendor.reviewCount}개</Text>
                <Text style={{ opacity: 0.8 }}>{vendor.intro}</Text>
                <Text style={{ opacity: 0.75 }}>활동 지역: {vendor.coverageAreas.join(", ")}</Text>
                <Text style={{ opacity: 0.75 }}>태그: {vendor.tags.join(" · ")}</Text>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/expert-booking",
                      params: {
                        historyId: historyId ? String(historyId) : undefined,
                        vendorId: vendor.id,
                        issueType: resolvedIssueType,
                      },
                    })
                  }
                  style={{ marginTop: 6, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10 }}
                >
                  <Text style={{ fontWeight: "700" }}>예약 페이지로 이동</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={{ padding: 14, borderWidth: 1, borderRadius: 12 }}>
          <Text style={{ opacity: 0.75 }}>지역을 먼저 선택하면 그 아래에 업체 리스트가 나타납니다.</Text>
        </View>
      )}

      <Pressable onPress={() => router.back()} style={{ paddingVertical: 12, borderWidth: 1, borderRadius: 12, alignItems: "center" }}>
        <Text>뒤로</Text>
      </Pressable>
    </ScrollView>
  );
}
