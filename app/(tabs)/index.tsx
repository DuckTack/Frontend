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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { clearAccessToken } from "../../src/store/tokenStorage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CELL_SIZE = 13;
const GRID_COLS = Math.ceil(SCREEN_WIDTH / CELL_SIZE) + 2;
const GRID_ROWS = Math.ceil(SCREEN_HEIGHT / CELL_SIZE) + 2;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const REVEAL_THRESHOLD = 0.64;

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

function getCellIndex(col: number, row: number) {
  return row * GRID_COLS + col;
}

function getTileStyle(col: number, row: number) {
  const absoluteX = col * CELL_SIZE;
  const absoluteY = row * CELL_SIZE;
  const baseNoise = mixedNoise(absoluteX, absoluteY);
  const streakNoise = mixedNoise(absoluteX * 1.4 + 70, absoluteY * 0.8 + 20);
  const brightness = Math.round(24 + baseNoise * 26 + streakNoise * 10);

  const red = Math.min(74, brightness + 14);
  const green = Math.min(60, brightness + 6);
  const blue = Math.max(16, brightness - 6);
  const alpha = 0.9 + noise(col + 2.1, row + 6.4) * 0.06;

  const dotSeed = noise(col * 4.3 + 1.7, row * 7.1 + 8.2);
  const hasDot = dotSeed > 0.66;
  const dotSize = 1.2 + noise(col * 6.1, row * 3.7) * 3.2;
  const dotLeft = noise(col * 2.2 + 4, row * 1.1 + 2) * Math.max(1, CELL_SIZE - dotSize);
  const dotTop = noise(col * 1.3 + 8, row * 2.4 + 7) * Math.max(1, CELL_SIZE - dotSize);
  const dotOpacity = 0.14 + noise(col * 3.2 + 1, row * 2.7 + 9) * 0.28;

  const streakSeed = noise(col * 5.9 + 11.4, row * 3.8 + 5.1);
  const hasStreak = streakSeed > 0.87;
  const streakWidth = CELL_SIZE * (1.2 + noise(col * 1.4 + 5, row * 4.1 + 1) * 1.45);
  const streakHeight = 1.2 + noise(col * 2.6 + 12, row * 1.8 + 3) * 2.0;
  const streakLeft = -CELL_SIZE * 0.18;
  const streakTop = noise(col * 3.7 + 2, row * 6.3 + 4) * Math.max(1, CELL_SIZE - streakHeight);
  const streakRotate = `${-40 + noise(col * 7.5 + 3, row * 1.5 + 10) * 80}deg`;
  const streakOpacity = 0.07 + noise(col * 2.8 + 8, row * 2.2 + 6) * 0.16;

  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`,
    hasDot,
    dotStyle: {
      position: "absolute" as const,
      left: dotLeft,
      top: dotTop,
      width: dotSize,
      height: dotSize,
      borderRadius: 999,
      backgroundColor: `rgba(255,255,255,${dotOpacity.toFixed(3)})`,
    },
    hasStreak,
    streakStyle: {
      position: "absolute" as const,
      left: streakLeft,
      top: streakTop,
      width: streakWidth,
      height: streakHeight,
      borderRadius: 999,
      backgroundColor: `rgba(255,255,255,${streakOpacity.toFixed(3)})`,
      transform: [{ rotate: streakRotate }],
    },
  };
}

const tileStyles = Array.from({ length: TOTAL_CELLS }, (_, index) => {
  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;
  return getTileStyle(col, row);
});

const DustTile = memo(function DustTile({ index }: { index: number }) {
  const tile = tileStyles[index];
  return (
    <View
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        overflow: "hidden",
        backgroundColor: tile.backgroundColor,
      }}
    >
      {tile.hasDot ? <View style={tile.dotStyle} /> : null}
      {tile.hasStreak ? <View style={tile.streakStyle} /> : null}
    </View>
  );
});

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
    if (params.intro === "1") {
      resetOverlay();
    }
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

      for (let r = row - 6; r <= row + 6; r += 1) {
        for (let c = col - 6; c <= col + 6; c += 1) {
          if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) continue;
          const distance = Math.hypot(c - col, r - row);
          if (distance > radius) continue;
          const feather = noise(c * 2.1 + x * 0.03, r * 2.7 + y * 0.03);
          if (distance > radius - 0.65 && feather < 0.42) continue;
          const index = getCellIndex(c, r);
          if (!clearedCellsRef.current.has(index)) {
            clearedCellsRef.current.add(index);
            changed = true;
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
      for (let step = 1; step <= steps; step += 1) {
        const nextX = last.x + ((x - last.x) * step) / steps;
        const nextY = last.y + ((y - last.y) * step) / steps;
        clearAtPoint(nextX, nextY);
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
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          clearAtPoint(locationX, locationY);
          lastPointRef.current = { x: locationX, y: locationY };
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          clearAlongPath(locationX, locationY);
        },
        onPanResponderRelease: () => {
          lastPointRef.current = null;
        },
        onPanResponderTerminate: () => {
          lastPointRef.current = null;
        },
      }),
    [clearAlongPath, clearAtPoint]
  );

  async function logout() {
    await clearAccessToken();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#faf7f2" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "900" }}>DduckTack 홈</Text>
            <Text style={{ opacity: 0.7, marginTop: 4 }}>주거 문제를 빠르게 진단하고 다음 행동까지 연결합니다.</Text>
          </View>
          <Pressable
            onPress={() => {
              Alert.alert("로그아웃", "정말 로그아웃할까요?", [
                { text: "취소", style: "cancel" },
                { text: "로그아웃", style: "destructive", onPress: logout },
              ]);
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10, backgroundColor: "white" }}
          >
            <Text>로그아웃</Text>
          </Pressable>
        </View>

        <View style={{ padding: 22, borderRadius: 24, backgroundColor: "#1f2937", gap: 14 }}>
          <Text style={{ fontSize: 24, fontWeight: "900", color: "white" }}>사진 한 장으로 문제 진단부터 해결 방향까지</Text>
          <Text style={{ color: "#e5e7eb", lineHeight: 22 }}>
            곰팡이, 누수, 균열, 오염처럼 혼자 판단하기 어려운 생활 문제를 AI가 먼저 보고, DIY 가이드 또는 전문가 연결까지 이어줍니다.
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/upload")}
            style={{ alignSelf: "flex-start", backgroundColor: "white", paddingVertical: 14, paddingHorizontal: 150, borderRadius: 14 }}
          >
            <Text style={{ fontWeight: "900", fontSize: 16 }}>진단 시작</Text>
          </Pressable>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 20, padding: 18, backgroundColor: "white", gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>앱 로고 영역</Text>
          <View
            style={{
              height: 120,
              borderRadius: 16,
              borderWidth: 1,
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "900" }}>DduckTack</Text>
            <Text style={{ opacity: 0.65, marginTop: 6 }}>로고 이미지 자리</Text>
          </View>
        </View>

        <View style={{ borderWidth: 1, borderRadius: 20, padding: 18, backgroundColor: "white", gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>서비스 소개</Text>
          <Text style={{ lineHeight: 22, opacity: 0.82 }}>
            사용자가 촬영한 사진을 바탕으로 문제 유형과 위험도를 분석하고, 상황에 따라 직접 해결 방법과 전문업체 연결 중 무엇이 적절한지 바로 안내합니다.
          </Text>
          <Text style={{ lineHeight: 22, opacity: 0.82 }}>
            수리 전후 기록과 리포트로 남길 수 있어서 원상복구 증빙이나 추후 재점검에도 활용할 수 있습니다.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={overlayVisible} transparent animationType="none" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(7, 5, 3, 0.18)", overflow: "hidden" }} {...panResponder.panHandlers}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              alignSelf: "center",
              top: SCREEN_HEIGHT * 0.43,
              paddingHorizontal: 24,
              zIndex: 2,
            }}
          >
            <Text
              style={{
                fontSize: 38,
                fontWeight: "900",
                color: "rgba(250, 243, 230, 0.97)",
                letterSpacing: -1.1,
                textAlign: "center",
                textShadowColor: "rgba(26, 18, 9, 0.85)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 14,
              }}
            >
              먼지를 닦아 시작해보세요
            </Text>
          </View>

          <View
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              width: GRID_COLS * CELL_SIZE,
              height: GRID_ROWS * CELL_SIZE,
              flexDirection: "row",
              flexWrap: "wrap",
            }}
            pointerEvents="none"
          >
            {Array.from({ length: TOTAL_CELLS }).map((_, index) => {
              if (clearedCellsRef.current.has(index)) {
                return <View key={`clear-${index}`} style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: "transparent" }} />;
              }
              return <DustTile key={`tile-${index}`} index={index} />;
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
