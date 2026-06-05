import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { clearAccessToken } from "../../src/store/tokenStorage";
import { apiClient } from "../../src/api/apiClient";

// --- 먼지 알고리즘 상수 (보존) ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CELL_SIZE = 13;
const GRID_COLS = Math.ceil(SCREEN_WIDTH / CELL_SIZE) + 2;
const GRID_ROWS = Math.ceil(SCREEN_HEIGHT / CELL_SIZE) + 2;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const REVEAL_THRESHOLD = 0.64;

type LatestReservation = {
  reservationId: number;
  companyId?: number | null;
  companyName?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "DONE" | "CANCELLED" | "NOSHOW";
  visitDate?: string | number[] | null;
  visitTime?: string | number[] | null;
  issueSummary?: string | null;
  requestNote?: string | null;
  displayTitle?: string | null;
  displaySubtitle?: string | null;
  stepIndex?: number | null;
  rejectReason?: string | null;
};

function fract(value: number) {
  return value - Math.floor(value);
}

function noise(x: number, y: number) {
  return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123);
}

function mixedNoise(x: number, y: number) {
  const a = noise(x * 0.018, y * 0.02);
  const b = noise(x * 0.006 + 14.2, y * 0.007 + 9.7);
  const c = noise(x * 0.035 + 3.1, y * 0.04 + 5.9);
  return a * 0.48 + b * 0.34 + c * 0.18;
}

function formatVisitDate(value?: string | number[] | null) {
  if (!value) return "-";

  if (Array.isArray(value)) {
    const [y, m, d] = value;
    if (!y || !m || !d) return "-";
    return `${y}년 ${m}월 ${d}일`;
  }

  const str = String(value);

  if (str.includes("-")) {
    const [y, m, d] = str.slice(0, 10).split("-");
    return `${y}년 ${Number(m)}월 ${Number(d)}일`;
  }

  return str;
}

function formatVisitTime(value?: string | number[] | null) {
  if (!value) return "-";

  if (Array.isArray(value)) {
    const [h, m] = value;
    if (h === undefined || m === undefined) return "-";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return String(value).slice(0, 5);
}

function getReservationStepIndex(r: LatestReservation | null) {
  if (!r) return -1;

  if (typeof r.stepIndex === "number") return r.stepIndex;

  switch (r.status) {
    case "PENDING":
      return 1;
    case "ACCEPTED":
      return 2;
    case "DONE":
      return 3;
    default:
      return 0;
  }
}

function getReservationTitle(r: LatestReservation | null) {
  if (!r) return "진행 중인 예약이 없습니다.";

  if (r.status === "ACCEPTED") return "전문가 수락 완료";
  if (r.status === "DONE") return "수리 완료";
  if (r.status === "REJECTED") return "예약 거절";

  if (r.displayTitle) return r.displayTitle;

  switch (r.status) {
    case "PENDING":
      return "예약 신청 완료.";
    case "CANCELLED":
      return "예약 취소";
    case "NOSHOW":
      return "방문 불발";
    default:
      return "예약 상태 확인";
  }
}
function getReservationSubtitle(r: LatestReservation | null) {
  if (!r) return "진단 후 전문가에게 예약을 신청해보세요.";

  if (r.status === "ACCEPTED")
    return "방문 대기 중입니다. 메일을 확인해 주세요.";

  if (r.status === "REJECTED") {
    return r.rejectReason || r.displaySubtitle || "업체가 예약을 거절했습니다.";
  }

  if (r.status === "DONE") return "수리가 완료되었습니다.";

  if (r.displaySubtitle) return r.displaySubtitle;

  if (r.status === "PENDING") return "업체가 예약을 확인 중입니다.";
  if (r.status === "CANCELLED") return "예약이 취소되었습니다.";
  if (r.status === "NOSHOW") return "방문이 완료되지 않았습니다.";

  return "예약 상태를 확인해주세요.";
}

function getReservationStatusColor(status?: string) {
  switch (status) {
    case "PENDING":
      return "#f97316";
    case "ACCEPTED":
      return "#2563eb";
    case "DONE":
      return "#16a34a";
    case "REJECTED":
      return "#dc2626";
    case "CANCELLED":
      return "#64748b";
    case "NOSHOW":
      return "#7c2d12";
    default:
      return "#64748b";
  }
}

// --- UI 데이터 ---

const PROBLEM_CHIPS = [
  { id: 1, emoji: "🦠", label: "곰팡이" },
  { id: 2, emoji: "💧", label: "누수" },
  { id: 3, emoji: "〰️", label: "균열" },
  { id: 4, emoji: "🍂", label: "박리" },
  { id: 5, emoji: "🕳️", label: "부식" },
  { id: 6, emoji: "🧱", label: "들뜸" },
];

const STATS = [
  { id: 1, value: "10,000+", label: "진단 완료" },
  { id: 2, value: "5.0 ★", label: "전문가 평점" },
  { id: 3, value: "99%", label: "고객 만족도" },
];

const SERVICE_CARDS = [
  {
    id: 1,
    emoji: "🔍",
    title: "AI 진단",
    desc: "사진 한 장으로 주거 하자의\n상태와 위험도를\n빠르게 파악합니다.",
    bg: "#eff6ff",
    accent: "#3b82f6",
  },
  {
    id: 2,
    emoji: "🛠️",
    title: "DIY 가이드",
    desc: "위험도가 낮거나 셀프 조치가\n가능하면 필요한 자재와\n단계별 가이드를 제공합니다.",
    bg: "#f0fdf4",
    accent: "#16a34a",
  },
  {
    id: 3,
    emoji: "🏢",
    title: "전문가 안내",
    desc: "하자 유형과 위치 정보를 기반으로\n관련 전문 업체를 안내합니다.",
    bg: "#fff7ed",
    accent: "#f97316",
  },
  {
    id: 4,
    emoji: "📋",
    title: "리포트 기반 수리 이력 관리",
    desc: "수리 내역을 리포트로 정리하여\n사용자가 유지보수 이력으로\n관리할 수 있도록 합니다.",
    bg: "#f5f3ff",
    accent: "#7c3aed",
  },
];

// --- 먼지 타일 (보존) ---
const tileStyles = Array.from({ length: TOTAL_CELLS }, (_, index) => {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  const absoluteX = col * CELL_SIZE;
  const absoluteY = row * CELL_SIZE;
  const baseNoise = mixedNoise(absoluteX, absoluteY);
  const streakNoise = mixedNoise(absoluteX * 1.4 + 70, absoluteY * 0.8 + 20);
  const brightness = Math.round(24 + baseNoise * 26 + streakNoise * 10);
  const red = Math.min(74, brightness + 14);
  const green = Math.min(60, brightness + 6);
  const blue = Math.max(16, brightness - 6);
  const alpha = 0.9 + noise(col + 2.1, row + 6.4) * 0.06;

  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`,
    hasDot: noise(col * 4.3 + 1.7, row * 7.1 + 8.2) > 0.66,
    dotSize: 1.2 + noise(col * 6.1, row * 3.7) * 3.2,
    dotLeft: noise(col * 2.2 + 4, row * 1.1 + 2) * Math.max(1, CELL_SIZE - 4),
    dotTop: noise(col * 1.3 + 8, row * 2.4 + 7) * Math.max(1, CELL_SIZE - 4),
    dotOpacity: 0.14 + noise(col * 3.2 + 1, row * 2.7 + 9) * 0.28,
    hasStreak: noise(col * 5.9 + 11.4, row * 3.8 + 5.1) > 0.87,
    streakWidth: CELL_SIZE * (1.2 + noise(col * 1.4 + 5, row * 4.1 + 1) * 1.45),
    streakHeight: 1.2 + noise(col * 2.6 + 12, row * 1.8 + 3) * 2.0,
    streakRotate: `${-40 + noise(col * 7.5 + 3, row * 1.5 + 10) * 80}deg`,
    streakOpacity: 0.07 + noise(col * 2.8 + 8, row * 2.2 + 6) * 0.16,
  };
});

const DustTile = memo(function DustTile({ index }: { index: number }) {
  const tile = tileStyles[index];

  return (
      <View
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            backgroundColor: tile.backgroundColor,
            overflow: "hidden",
          }}
      >
        {tile.hasDot && (
            <View
                style={{
                  position: "absolute",
                  width: tile.dotSize,
                  height: tile.dotSize,
                  borderRadius: 99,
                  left: tile.dotLeft,
                  top: tile.dotTop,
                  backgroundColor: `rgba(255,255,255,${tile.dotOpacity})`,
                }}
            />
        )}

        {tile.hasStreak && (
            <View
                style={{
                  position: "absolute",
                  width: tile.streakWidth,
                  height: tile.streakHeight,
                  borderRadius: 99,
                  left: -2,
                  top: tile.dotTop,
                  backgroundColor: `rgba(255,255,255,${tile.streakOpacity})`,
                  transform: [{ rotate: tile.streakRotate }],
                }}
            />
        )}
      </View>
  );
});

// --- 메인 컴포넌트 ---
export default function HomeTab() {
  const params = useLocalSearchParams<{ intro?: string }>();

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTick, setOverlayTick] = useState(0);
  const [latestReservation, setLatestReservation] = useState<LatestReservation | null>(null);
  const [reservationLoading, setReservationLoading] = useState(false);

  const clearedCellsRef = useRef<Set<number>>(new Set());
  const rafLockRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const fetchLatestReservation = useCallback(async () => {
    try {
      setReservationLoading(true);

      const res = await apiClient.get("/api/reservations/my/latest");
      const body = res.data?.data ?? res.data ?? null;

      setLatestReservation(body);
    } catch (e: any) {
      console.log("❌ 최신 예약 조회 실패:", e?.message);
      setLatestReservation(null);
    } finally {
      setReservationLoading(false);
    }
  }, []);

  useFocusEffect(
      useCallback(() => {
        fetchLatestReservation();
      }, [fetchLatestReservation])
  );

  useEffect(() => {
    fetchLatestReservation();

    const timer = setInterval(fetchLatestReservation, 15000);

    return () => clearInterval(timer);
  }, [fetchLatestReservation]);

  const resetOverlay = useCallback(() => {
    clearedCellsRef.current = new Set();
    lastPointRef.current = null;
    setOverlayVisible(true);
    setOverlayTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (params.intro === "1") resetOverlay();
  }, [params.intro, resetOverlay]);

  const flushOverlay = useCallback(() => {
    if (rafLockRef.current) return;

    rafLockRef.current = true;

    requestAnimationFrame(() => {
      rafLockRef.current = false;
      setOverlayTick((prev) => prev + 1);

      if (clearedCellsRef.current.size / TOTAL_CELLS >= REVEAL_THRESHOLD) {
        setOverlayVisible(false);
      }
    });
  }, []);

  const clearAtPoint = useCallback(
      (x: number, y: number) => {
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        const radius = 4.4;
        let changed = false;

        for (let r = row - 6; r <= row + 6; r++) {
          for (let c = col - 6; c <= col + 6; c++) {
            if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) continue;

            if (Math.hypot(c - col, r - row) <= radius) {
              const index = r * GRID_COLS + c;

              if (!clearedCellsRef.current.has(index)) {
                clearedCellsRef.current.add(index);
                changed = true;
              }
            }
          }
        }

        if (changed) flushOverlay();
      },
      [flushOverlay]
  );

  const clearAlongPath = useCallback(
      (x: number, y: number) => {
        const last = lastPointRef.current;

        if (!last) {
          clearAtPoint(x, y);
          lastPointRef.current = { x, y };
          return;
        }

        const distance = Math.hypot(x - last.x, y - last.y);
        const steps = Math.max(1, Math.ceil(distance / 1.2));

        for (let step = 1; step <= steps; step++) {
          clearAtPoint(
              last.x + ((x - last.x) * step) / steps,
              last.y + ((y - last.y) * step) / steps
          );
        }

        lastPointRef.current = { x, y };
      },
      [clearAtPoint]
  );

  const panResponder = useMemo(
      () =>
          PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (e) => {
              const { locationX, locationY } = e.nativeEvent;
              clearAtPoint(locationX, locationY);
              lastPointRef.current = { x: locationX, y: locationY };
            },
            onPanResponderMove: (e) => {
              const { locationX, locationY } = e.nativeEvent;
              clearAlongPath(locationX, locationY);
            },
            onPanResponderRelease: () => {
              lastPointRef.current = null;
            },
          }),
      [clearAlongPath, clearAtPoint]
  );

  async function logout() {
    await clearAccessToken();
    router.replace("/login");
  }

  const hasReservation = Boolean(latestReservation?.reservationId);

  const reservationStep = hasReservation
      ? getReservationStepIndex(latestReservation)
      : -1;

  const reservationColor = hasReservation
      ? getReservationStatusColor(latestReservation?.status)
      : "#64748b";

  return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── 헤더 ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>DDuckTTack</Text>
            </View>

            <Pressable
                onPress={() =>
                    Alert.alert("로그아웃", "로그아웃하시겠습니까?", [
                      { text: "취소" },
                      { text: "확인", onPress: logout },
                    ])
                }
                style={styles.logoutBtn}
            >
              <Text style={styles.logoutText}>로그아웃</Text>
            </Pressable>
          </View>

          {/* ── Hero CTA ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroCircle1} />
            <View style={styles.heroCircle2} />

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✦ AI 기반 주거 하자 진단</Text>
            </View>

            <Text style={styles.heroTitle}>
              집 안 문제,{"\n"}AI가 찾아드립니다
            </Text>

            <Text style={styles.heroDesc}>사진 한 장이면 충분합니다.</Text>

            <Pressable
                onPress={() => router.push("/(tabs)/upload")}
                style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.heroCtaText}>📷  지금 진단 시작하기</Text>
            </Pressable>
          </View>

          {/* ── 문제 유형 퀵 접근 칩 ── */}
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScrollView}
              contentContainerStyle={styles.chipScrollContent}
          >
            {PROBLEM_CHIPS.map((chip) => (
                <Pressable
                    key={chip.id}
                    onPress={() => router.push("/(tabs)/upload")}
                    style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                </Pressable>
            ))}
          </ScrollView>

          {/* ── 예약 현황 ── */}
          <View style={styles.reservationCard}>
            <View style={styles.reservationHeader}>
              <View>
                <Text style={styles.reservationTitle}>내 예약 현황</Text>
                <Text style={styles.reservationSub}>
                  {reservationLoading
                      ? "예약 상태를 확인하는 중입니다."
                      : hasReservation
                          ? "최근 예약 진행 상태"
                          : "예약 신청 후 진행 상태가 표시됩니다."}
                </Text>
              </View>

              <View style={styles.reservationIconRow}>
                <Pressable
                    onPress={fetchLatestReservation}
                    disabled={reservationLoading}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.reservationRefreshBtn,
                      pressed && !reservationLoading && styles.reservationRefreshBtnPressed,
                      reservationLoading && styles.reservationRefreshBtnDisabled,
                    ]}
                >
                  <Text style={styles.reservationRefreshText}>
                    {reservationLoading ? "…" : "↻"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {hasReservation ? (
                <>
                  <View style={styles.progressRow}>
                    {["신청 완료", "업체 확인", "방문 대기", "수리 완료"].map((label, index) => {
                      const active = index <= reservationStep;

                      return (
                          <View key={label} style={styles.progressItem}>
                            <View
                                style={[
                                  styles.progressDot,
                                  active && {
                                    backgroundColor: reservationColor,
                                    borderColor: reservationColor,
                                  },
                                ]}
                            />

                            <Text style={[styles.progressLabel, active && { color: "#1e293b" }]}>
                              {label}
                            </Text>
                          </View>
                      );
                    })}
                  </View>

                  <View style={styles.reservationMessageBox}>
                    <Text style={[styles.reservationMessageTitle, { color: reservationColor }]}>
                      {getReservationTitle(latestReservation)}
                    </Text>

                    <Text style={styles.reservationMessageText}>
                      {getReservationSubtitle(latestReservation)}
                    </Text>

                    <View style={styles.reservationMetaBox}>
                      <View style={styles.reservationMetaRow}>
                        <Text style={styles.reservationMetaLabel}>업체</Text>
                        <Text style={styles.reservationMetaValue}>
                          {latestReservation?.companyName || "업체 정보 없음"}
                        </Text>
                      </View>

                      <View style={styles.reservationMetaRow}>
                        <Text style={styles.reservationMetaLabel}>방문 일시</Text>
                        <Text style={styles.reservationMetaValue}>
                          {formatVisitDate(latestReservation?.visitDate)}{" "}
                          {formatVisitTime(latestReservation?.visitTime)}
                        </Text>
                      </View>

                      {latestReservation?.issueSummary ? (
                          <View style={styles.reservationMetaRow}>
                            <Text style={styles.reservationMetaLabel}>진단 결과</Text>
                            <Text style={styles.reservationMetaValue}>
                              {latestReservation.issueSummary}
                            </Text>
                          </View>
                      ) : null}
                    </View>
                  </View>
                </>
            ) : (
                <View style={styles.emptyReservationBox}>
                  <Text style={styles.emptyReservationTitle}>
                    진행 중인 예약이 없습니다
                  </Text>

                  <Text style={styles.emptyReservationText}>
                    AI 진단 후 전문가 예약을 신청하면{"\n"} 진행 상태가 이곳에 표시됩니다.
                  </Text>

                </View>
            )}
          </View>

          {/* ── 신뢰 지표 ── */}
          <View style={styles.statsCard}>
            {STATS.map((stat, index) => (
                <React.Fragment key={stat.id}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>

                  {index < STATS.length - 1 && <View style={styles.statDivider} />}
                </React.Fragment>
            ))}
          </View>

          {/* ── 서비스 소개 헤더 ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>서비스 소개</Text>
            <Text style={styles.sectionSub}>DDuckTTack이 제공하는 기능</Text>
          </View>

          {/* ── 서비스 소개 가로 스크롤 카드 ── */}
          <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.serviceScrollView}
              contentContainerStyle={styles.serviceScrollContent}
          >
            {SERVICE_CARDS.map((card) => (
                <View key={card.id} style={[styles.serviceCard, { backgroundColor: card.bg }]}>
                  <Text style={styles.serviceCardEmoji}>{card.emoji}</Text>
                  <Text style={[styles.serviceCardTitle, { color: card.accent }]}>
                    {card.title}
                  </Text>
                  <Text style={styles.serviceCardDesc}>{card.desc}</Text>
                </View>
            ))}
          </ScrollView>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* ── 먼지 닦기 모달 (보존) ── */}
        <Modal visible={overlayVisible} transparent animationType="none" statusBarTranslucent>
          <View style={styles.overlayContainer} {...panResponder.panHandlers}>
            <View pointerEvents="none" style={styles.overlayTextWrapper}>
              <Text style={styles.overlayTitle}>먼지를 닦아{"\n"}시작해보세요</Text>
            </View>

            <View style={styles.gridWrapper} pointerEvents="none">
              {Array.from({ length: TOTAL_CELLS }).map((_, index) =>
                  clearedCellsRef.current.has(index) ? (
                      <View key={index} style={{ width: CELL_SIZE, height: CELL_SIZE }} />
                  ) : (
                      <DustTile key={index} index={index} />
                  )
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── 레이아웃 ──
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  scrollContent: {
    padding: 24,
    paddingTop: Platform.OS === "android" ? 50 : 20,
    paddingBottom: 8,
  },

  // ── 헤더 ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },

  headerSub: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
    fontWeight: "600",
  },

  logoutBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

  // ── Hero CTA ──
  heroCard: {
    backgroundColor: "#0f172a",
    borderRadius: 28,
    padding: 28,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  heroCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
    top: -60,
    right: -50,
  },

  heroCircle2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    bottom: -20,
    left: 20,
  },

  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.35)",
  },

  heroBadgeText: {
    fontSize: 11,
    color: "#93c5fd",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffffff",
    lineHeight: 38,
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  heroDesc: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: "500",
  },

  heroCta: {
    backgroundColor: "#3b82f6",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },

  heroCtaText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  // ── 문제 유형 칩 ──
  chipScrollView: {
    marginHorizontal: -24,
    marginBottom: 20,
  },

  chipScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 4,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  chipEmoji: {
    fontSize: 15,
    marginRight: 6,
  },

  chipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },

  // ── 예약 현황 ──
  reservationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  reservationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  reservationTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1e293b",
  },

  reservationSub: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
    fontWeight: "600",
  },

  reservationIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  reservationIcon: {
    fontSize: 22,
  },

  reservationRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
  },

  reservationRefreshBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },

  reservationRefreshBtnDisabled: {
    opacity: 0.55,
  },

  reservationRefreshText: {
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "900",
    color: "#3b82f6",
  },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  progressItem: {
    flex: 1,
    alignItems: "center",
  },

  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 99,
    backgroundColor: "#e2e8f0",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    marginBottom: 6,
  },

  progressLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "800",
    textAlign: "center",
  },

  reservationMessageBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  reservationMessageTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 4,
  },

  reservationMessageText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 19,
    fontWeight: "600",
  },

  reservationMetaBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 6,
  },

  reservationMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  reservationMetaLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "800",
  },

  reservationMetaValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#334155",
    fontWeight: "800",
  },

  reservationIssueText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "700",
  },

  emptyReservationBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  emptyReservationTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 6,
  },

  emptyReservationText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },

  // ── 신뢰 지표 ──
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#e2e8f0",
  },

  statValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: -0.3,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94a3b8",
  },

  // ── 서비스 소개 ──
  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 3,
    letterSpacing: -0.3,
  },

  sectionSub: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },

  serviceScrollView: {
    marginHorizontal: -24,
  },

  serviceScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },

  serviceCard: {
    width: 180,
    borderRadius: 24,
    padding: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },

  serviceCardEmoji: {
    fontSize: 28,
    marginBottom: 12,
  },

  serviceCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },

  serviceCardDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    fontWeight: "600",
  },

  // ── 먼지 모달 (보존) ──
  overlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  overlayTextWrapper: {
    position: "absolute",
    alignSelf: "center",
    top: SCREEN_HEIGHT * 0.4,
    zIndex: 10,
  },

  overlayTitle: {
    fontSize: 40,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
  },

  gridWrapper: {
    position: "absolute",
    width: GRID_COLS * CELL_SIZE,
    height: GRID_ROWS * CELL_SIZE,
    flexDirection: "row",
    flexWrap: "wrap",
  },
});