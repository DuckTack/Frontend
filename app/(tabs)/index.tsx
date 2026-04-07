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
import { router, useLocalSearchParams } from "expo-router";
import { clearAccessToken } from "../../src/store/tokenStorage"; // 경로 유지

// --- [원본 로직] 정교한 먼지 알고리즘 (보존) ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CELL_SIZE = 13;
const GRID_COLS = Math.ceil(SCREEN_WIDTH / CELL_SIZE) + 2;
const GRID_ROWS = Math.ceil(SCREEN_HEIGHT / CELL_SIZE) + 2;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const REVEAL_THRESHOLD = 0.64;

function fract(value: number) { return value - Math.floor(value); }
function noise(x: number, y: number) { return fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123); }
function mixedNoise(x: number, y: number) {
  const a = noise(x * 0.018, y * 0.02);
  const b = noise(x * 0.006 + 14.2, y * 0.007 + 9.7);
  const c = noise(x * 0.035 + 3.1, y * 0.04 + 5.9);
  return a * 0.48 + b * 0.34 + c * 0.18;
}

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

  // 먼지 입자 및 줄무늬 효과 보존
  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`,
    hasDot: noise(col * 4.3 + 1.7, row * 7.1 + 8.2) > 0.66,
    dotSize: 1.2 + noise(col * 6.1, row * 3.7) * 3.2,
    dotLeft: noise(col * 2.2 + 4, row * 1.1 + 2) * (CELL_SIZE - 4),
    dotTop: noise(col * 1.3 + 8, row * 2.4 + 7) * (CELL_SIZE - 4),
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
    <View style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: tile.backgroundColor, overflow: 'hidden' }}>
      {tile.hasDot && (
        <View style={{
          position: 'absolute', width: tile.dotSize, height: tile.dotSize, borderRadius: 99,
          left: tile.dotLeft, top: tile.dotTop, backgroundColor: `rgba(255,255,255,${tile.dotOpacity})`
        }} />
      )}
      {tile.hasStreak && (
        <View style={{
          position: 'absolute', width: tile.streakWidth, height: tile.streakHeight, borderRadius: 99,
          left: -2, top: tile.dotTop, backgroundColor: `rgba(255,255,255,${tile.streakOpacity})`,
          transform: [{ rotate: tile.streakRotate }]
        }} />
      )}
    </View>
  );
});

// --- 메인 컴포넌트 ---
export default function HomeTab() {
  const params = useLocalSearchParams<{ intro?: string }>();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTick, setOverlayTick] = useState(0);
  const clearedCellsRef = useRef<Set<number>>(new Set());
  const rafLockRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

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
      if (clearedCellsRef.current.size / TOTAL_CELLS >= REVEAL_THRESHOLD) setOverlayVisible(false);
    });
  }, []);

  const clearAtPoint = useCallback((x: number, y: number) => {
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
  }, [flushOverlay]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => clearAtPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => clearAtPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderRelease: () => { lastPointRef.current = null; },
  }), [clearAtPoint]);

  async function logout() {
    await clearAccessToken();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 상단 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>DduckTack</Text>
            <Text style={styles.headerSub}>AI 기반 스마트 주택 진단</Text>
          </View>
          <Pressable onPress={() => Alert.alert("로그아웃", "로그아웃하시겠습니까?", [{ text: "취소" }, { text: "확인", onPress: logout }])} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </Pressable>
        </View>

        {/* 메인 배너 카드 */}
        <Pressable onPress={() => router.push("/(tabs)/upload")} style={({ pressed }) => [styles.mainCard, pressed && { opacity: 0.9 }]}>
          <View style={styles.mainCardTextContent}>
            <Text style={styles.mainCardTitle}>사진 한 장으로{"\n"}문제 진단 시작하기</Text>
            <Text style={styles.mainCardDesc}>곰팡이, 누수, 균열을 AI가 분석합니다.</Text>
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>지금 시작</Text>
            </View>
          </View>
          <Text style={{ fontSize: 60 }}>🏠</Text>
        </Pressable>

        {/* 대시보드 그리드 */}
        <View style={styles.gridRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoEmoji}>🔍</Text>
            <Text style={styles.infoTitle}>정밀 분석</Text>
            <Text style={styles.infoDesc}>위험도와 원인을 상세히 파악합니다.</Text>
          </View>
          <View style={[styles.infoBox, { backgroundColor: "#eff6ff" }]}>
            <Text style={styles.infoEmoji}>🛠️</Text>
            <Text style={[styles.infoTitle, { color: "#3b82f6" }]}>DIY 가이드</Text>
            <Text style={styles.infoDesc}>직접 해결 가능한 솔루션을 드립니다.</Text>
          </View>
        </View>

        {/* 서비스 철학 섹션 */}
        <View style={styles.logoSection}>
          <Text style={styles.sectionTitle}>DduckTack 서비스</Text>
          <Text style={styles.sectionDesc}>
            복잡한 수리 증빙부터 전문가 연결까지, 주거 문제를 가장 빠르게 해결하는 방법을 제시합니다.
          </Text>
        </View>
      </ScrollView>

      {/* 먼지 닦기 모달 (로직 및 텍스트 효과 유지) */}
      <Modal visible={overlayVisible} transparent animationType="none" statusBarTranslucent>
        <View style={styles.overlayContainer} {...panResponder.panHandlers}>
          <View pointerEvents="none" style={styles.overlayTextWrapper}>
            <Text style={styles.overlayTitle}>먼지를 닦아{"\n"}시작해보세요</Text>
          </View>
          <View style={styles.gridWrapper} pointerEvents="none">
            {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
              clearedCellsRef.current.has(index)
                ? <View key={index} style={{ width: CELL_SIZE, height: CELL_SIZE }} />
                : <DustTile key={index} index={index} />
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContent: { padding: 24, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  logoutBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f3f4f6", borderRadius: 10 },
  logoutText: { fontSize: 13, fontWeight: "600", color: "#4b5563" },

  mainCard: {
    backgroundColor: "#60a5fa", borderRadius: 28, padding: 28,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20, elevation: 8, shadowColor: "#3b82f6", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }
  },
  mainCardTextContent: { flex: 1 },
  mainCardTitle: { fontSize: 22, fontWeight: "800", color: "#ffffff", lineHeight: 30 },
  mainCardDesc: { fontSize: 13, color: "#eff6ff", marginTop: 8, marginBottom: 18 },
  startButton: { backgroundColor: "#ffffff", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignSelf: "flex-start" },
  startButtonText: { color: "#3b82f6", fontWeight: "800", fontSize: 14 },

  gridRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  infoBox: { flex: 1, backgroundColor: "#f9fafb", padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "#f1f5f9" },
  infoEmoji: { fontSize: 24, marginBottom: 10 },
  infoTitle: { fontSize: 16, fontWeight: "700", color: "#1f2937", marginBottom: 6 },
  infoDesc: { fontSize: 12, color: "#6b7280", lineHeight: 18 },

  logoSection: { padding: 24, backgroundColor: "#f8fafc", borderRadius: 24, alignItems: "center", borderWidth: 1, borderStyle: "dashed", borderColor: "#cbd5e1" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: 10 },
  sectionDesc: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 22 },

  // 오버레이 스타일
  overlayContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)" },
  overlayTextWrapper: { position: "absolute", alignSelf: "center", top: SCREEN_HEIGHT * 0.4, zIndex: 10 },
  overlayTitle: { 
    fontSize: 40, 
    fontWeight: "900", 
    color: "#ffffff", 
    textAlign: "center", 
    textShadowColor: "rgba(0,0,0,0.5)", 
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15 
  },
  gridWrapper: { position: "absolute", width: GRID_COLS * CELL_SIZE, height: GRID_ROWS * CELL_SIZE, flexDirection: "row", flexWrap: "wrap" }
});