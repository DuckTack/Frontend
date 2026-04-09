import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import ScreenState from "../../../src/components/ScreenState";
import { getAdminUserDetail, listAdminUserHistories, type AdminUserDetail, type AdminUserHistorySummary } from "../../../src/api/admin";
import { ensureAdminOrRedirect, formatDateTime, issueTypeLabel } from "../../../src/utils/admin";

export default function AdminUserDetailPage() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const numericUserId = Number(userId);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [histories, setHistories] = useState<AdminUserHistorySummary[]>([]);
  const [historyApiAvailable, setHistoryApiAvailable] = useState(true);

  async function load() {
    const allowed = await ensureAdminOrRedirect();
    if (!allowed) return;
    if (!numericUserId) {
      setErrorMessage("잘못된 사용자 ID입니다.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const detail = await getAdminUserDetail(numericUserId);
      setUser(detail);

      try {
        const historyItems = await listAdminUserHistories(numericUserId);
        setHistories(historyItems);
        setHistoryApiAvailable(true);
      } catch {
        setHistories([]);
        setHistoryApiAvailable(false);
      }
    } catch {
      setErrorMessage("사용자 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [numericUserId]);

  const stats = useMemo(() => {
    const total = histories.length;
    const diyCount = histories.filter((item) => item.recommendation === "DIY").length;
    const proCount = histories.filter((item) => item.recommendation === "PRO").length;
    const reportDoneCount = histories.filter((item) => !!item.report).length;
    return { total, diyCount, proCount, reportDoneCount };
  }, [histories]);

  if (loading || errorMessage) {
    return <ScreenState loading={loading} errorMessage={errorMessage} onRetry={load} title="사용자 상세" />;
  }

  if (!user) {
    return <ScreenState errorMessage="사용자 정보가 없습니다." onRetry={load} title="사용자 상세" />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>사용자 상세</Text>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>기본 정보</Text>
        <Text>회원 ID: {user.id}</Text>
        <Text>아이디: {user.username}</Text>
        <Text>권한: {user.role}</Text>
        <Text>전화번호: {user.phoneNumber || "-"}</Text>
        <Text>주소: {user.address || "-"}</Text>
        <Text>거주 유형: {user.residenceType || "-"}</Text>
        <Text>임대 유형: {user.rentType || "-"}</Text>
        <Text>가입일: {formatDateTime(user.createdAt)}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "800" }}>전체 진단</Text>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>{stats.total}</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "800" }}>DIY 안내</Text>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>{stats.diyCount}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "800" }}>전문가 안내</Text>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>{stats.proCount}</Text>
        </View>
        <View style={{ flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ fontWeight: "800" }}>리포트 완료</Text>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>{stats.reportDoneCount}</Text>
        </View>
      </View>

      <View style={{ borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "800" }}>진단 기록</Text>

        {!historyApiAvailable ? (
          <Text style={{ opacity: 0.75, lineHeight: 20 }}>관리자용 사용자 진단기록 조회 API가 아직 없어 이 영역은 연결 대기 상태입니다.</Text>
        ) : histories.length === 0 ? (
          <Text style={{ opacity: 0.75 }}>진단 기록이 없습니다.</Text>
        ) : (
          histories.map((history) => (
            <View key={String(history.historyId)} style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}>
              <Text style={{ fontWeight: "800" }}>{issueTypeLabel(history.issueType)}</Text>
              <Text>생성일: {formatDateTime(history.createdAt)}</Text>
              <Text>권장 조치: {history.recommendation === "PRO" ? "전문가 안내" : "DIY 안내"}</Text>
              <Text>리포트: {history.report ? "완료" : "미완료"}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
