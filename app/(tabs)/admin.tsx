import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import ScreenState from "../../src/components/ScreenState";
import { listAdminCompanies, listAdminUsers } from "../../src/api/admin";
import { ensureAdminOrRedirect } from "../../src/utils/admin";

export default function AdminHome() {
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState(0);
  const [companyCount, setCompanyCount] = useState(0);

  useEffect(() => {
    async function load() {
      const allowed = await ensureAdminOrRedirect();
      if (!allowed) return;
      try {
        setLoading(true);
        const [users, companies] = await Promise.all([
          listAdminUsers().catch(() => []),
          listAdminCompanies().catch(() => []),
        ]);
        setUserCount(users.length);
        setCompanyCount(companies.length);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <ScreenState loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>관리</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "800" }}>전체 사용자</Text>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>{userCount}</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "800" }}>등록 업체</Text>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>{companyCount}</Text>
        </View>
      </View>

      <Pressable onPress={() => router.push("/admin/companies")} style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>업체 관리</Text>
        <Text style={{ opacity: 0.75 }}>업체 등록, 수정, 숨김/다시 노출을 관리합니다.</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/admin/users")} style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>사용자 조회</Text>
        <Text style={{ opacity: 0.75 }}>회원 목록과 기본 정보, 진단 기록 요약을 확인합니다.</Text>
      </Pressable>
    </ScrollView>
  );
}
