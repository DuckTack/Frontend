import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import ScreenState from "../../src/components/ScreenState";
import { listAdminUsers, type AdminUserListItem } from "../../src/api/admin";
import { ensureAdminOrRedirect } from "../../src/utils/admin";

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    async function load() {
      const allowed = await ensureAdminOrRedirect();
      if (!allowed) return;
      try {
        setLoading(true);
        const list = await listAdminUsers();
        setUsers(list);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return users;
    return users.filter((item) => {
      return [
        item.username,
        item.email,
        item.phoneNumber,
        item.address,
        item.residenceType,
        item.rentType,
        item.role,
        String(item.id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [users, keyword]);

  if (loading) return <ScreenState loading />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>사용자 조회</Text>

      <TextInput
        value={keyword}
        onChangeText={setKeyword}
        placeholder="이름/아이디/이메일/전화번호/주소/회원 ID로 검색"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      {filtered.length === 0 ? (
        <View style={{ borderWidth: 1, borderRadius: 12, padding: 14 }}><Text style={{ opacity: 0.75 }}>조회된 사용자가 없습니다.</Text></View>
      ) : (
        filtered.map((user) => (
          <Pressable key={user.id} onPress={() => router.push({ pathname: "/admin/users/[userId]", params: { userId: String(user.id) } })} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ fontWeight: "800" }}>{user.username || `회원 ${user.id}`}</Text>
            <Text>회원 ID: {user.id}</Text>
            <Text>이메일: {user.email || "-"}</Text>
            <Text>전화번호: {user.phoneNumber || "-"}</Text>
            <Text>주소: {user.address || "-"}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
