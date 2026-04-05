import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import ScreenState from "../../src/components/ScreenState";
import { listAdminCompanies, getAdminCompanyDetail, setAdminCompanyActive, type AdminCompanyListItem } from "../../src/api/admin";
import { ensureAdminOrRedirect } from "../../src/utils/admin";

export default function AdminCompaniesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminCompanyListItem[]>([]);
  const [activeMap, setActiveMap] = useState<Record<number, boolean>>({});

  async function load() {
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
  }

  useEffect(() => {
    load();
  }, []);

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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>업체 관리</Text>
        <Pressable onPress={() => router.push("/admin/company-form")} style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 }}>
          <Text>업체 등록</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}><Text style={{ opacity: 0.75 }}>등록된 업체가 없습니다.</Text></View>
      ) : (
        items.map((item) => {
          const isActive = activeMap[item.id] ?? true;
          return (
            <View key={item.id} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 }}>
              <Text style={{ fontWeight: "800" }}>{item.name}</Text>
              <Text>{item.address || "주소 정보 없음"}</Text>
              <Text style={{ opacity: 0.75 }}>현재 상태: {isActive ? "노출 중" : "숨김"}</Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => router.push({ pathname: "/admin/company-form", params: { companyId: String(item.id) } })} style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                  <Text>수정</Text>
                </Pressable>
                <Pressable onPress={() => handleToggle(item.id, !isActive)} style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" }}>
                  <Text>{isActive ? "숨김" : "다시 노출"}</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
