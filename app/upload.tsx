import { useCallback, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// [원본 상대 경로 및 API 로직 100% 유지]
import { showAlert } from "../src/utils/showAlert";
import api from "../src/api/apiClient";
import { setPendingImages } from "../src/api/diagnosis";

type PickedImage = {
  uri: string;
};

const MAX_IMAGES = 5;
const MAIN_BLUE = "#4F46E5";
const BG_BLUE = "#EDEDFF";

export default function Upload() {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);

  // 탭 화면은 상태가 남을 수 있으므로, 화면에 다시 들어올 때 로딩 상태를 강제로 해제한다.
  useFocusEffect(
      useCallback(() => {
        setLoading(false);

        return () => {
          setLoading(false);
        };
      }, [])
  );

  // --- [원본 로직 영역] ---
  function removeImage(uri: string) {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  }
  async function pickFromLibrary() {
    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      showAlert("제한 초과", `사진은 최대 ${MAX_IMAGES}장까지 선택할 수 있습니다.`);
      return;
    }

    const current = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (!current.granted) {
      if (current.canAskAgain === false) {
        Alert.alert(
            "사진 접근 권한 필요",
            "사진 보관함 접근 권한이 차단되어 있습니다.\n\n설정에서 Expo Go의 사진 권한을 허용한 뒤 다시 실행해주세요.",
            [{ text: "확인" }]
        );
        return;
      }

      Alert.alert(
          "사진 접근 권한 필요",
          "하자 사진을 선택하려면 사진 보관함 접근 권한이 필요합니다.",
          [
            { text: "취소", style: "cancel" },
            {
              text: "허용",
              onPress: async () => {
                const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();

                if (!requested.granted) {
                  Alert.alert(
                      "권한 거부됨",
                      "사진 접근 권한이 허용되지 않아 사진을 선택할 수 없습니다."
                  );
                  return;
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  selectionLimit: remaining,
                  quality: 1,
                });

                if (result.canceled) return;

                const picked = result.assets.map((a) => ({ uri: a.uri }));
                setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
              },
            },
          ]
      );

      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (result.canceled) return;

    const picked = result.assets.map((a) => ({ uri: a.uri }));
    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  async function takePhoto() {
    if (images.length >= MAX_IMAGES) {
      showAlert("제한 초과", `사진은 최대 ${MAX_IMAGES}장까지 선택할 수 있습니다.`);
      return;
    }

    const current = await ImagePicker.getCameraPermissionsAsync();

    if (!current.granted) {
      if (current.canAskAgain === false) {
        Alert.alert(
            "카메라 권한 필요",
            "카메라 권한이 차단되어 있습니다.\n\n설정에서 Expo Go의 카메라 권한을 허용한 뒤 다시 실행해주세요.",
            [{ text: "확인" }]
        );
        return;
      }

      Alert.alert(
          "카메라 권한 필요",
          "하자 사진을 촬영하려면 카메라 권한이 필요합니다.",
          [
            { text: "취소", style: "cancel" },
            {
              text: "허용",
              onPress: async () => {
                const requested = await ImagePicker.requestCameraPermissionsAsync();

                if (!requested.granted) {
                  Alert.alert(
                      "권한 거부됨",
                      "카메라 권한이 허용되지 않아 촬영을 진행할 수 없습니다."
                  );
                  return;
                }

                const result = await ImagePicker.launchCameraAsync({ quality: 1 });

                if (result.canceled) return;

                const uri = result.assets[0]?.uri;
                if (!uri) return;

                setImages((prev) => [...prev, { uri }].slice(0, MAX_IMAGES));
              },
            },
          ]
      );

      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 1 });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setImages((prev) => [...prev, { uri }].slice(0, MAX_IMAGES));
  }

  async function goAnalyze() {
    if (loading) return;

    if (images.length === 0) {
      showAlert("사진 필요", "진단할 사진을 최소 1장 선택해주세요.");
      return;
    }

    try {
      setLoading(true);

      const uris = images.map((img) => img.uri);
      await setPendingImages(uris);

      router.push("/analyzing");
    } catch (e) {
      console.error("[upload] pending image save failed", e);
      showAlert("진단 준비 실패", "사진 정보를 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      // router.push 후에도 탭 화면 state가 남을 수 있어서 반드시 해제한다.
      setLoading(false);
    }
  }

  return (
      // edges 설정을 통해 탭바 영역 침범 방지
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>AI 진단 업로드</Text>
            <Text style={styles.headerSub}>문제 부위가 잘 보이게 촬영해주세요</Text>
          </View>

          {/* 진단 가능 범위 (2열 3행 그리드) */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>진단 가능 범위</Text>
            <View style={styles.typeGrid}>
              <TypeItem emoji="🦠" text="곰팡이" />
              <TypeItem emoji="💧" text="누수" />
              <TypeItem emoji="〰️" text="균열" />
            </View>
            <View style={[styles.typeGrid, { marginTop: 10 }]}>
              <TypeItem emoji="🍂" text="박리" />
              <TypeItem emoji="🕳" text="부식" />
              <TypeItem emoji="🧱" text="들뜸" />
            </View>
          </View>

          {/* 사진 등록 섹션 */}
          <View style={styles.uploadSection}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>사진 등록</Text>
              <Text style={styles.uploadCountText}>{images.length} / {MAX_IMAGES}</Text>
            </View>
            <Text style={styles.miniTipText}>• 진단은 한 번에 한 가지 하자 유형만 가능합니다.</Text>

            <View style={{ height: 16 }} />

            {images.length === 0 ? (
                <View style={styles.dualDropzoneRow}>
                  <Pressable onPress={pickFromLibrary} disabled={loading} style={[styles.halfDropzone, loading && styles.disabledBox]}>
                    <Ionicons name="images" size={28} color={MAIN_BLUE} />
                    <Text style={styles.dropTitleSmall}>보관함 업로드</Text>
                  </Pressable>
                  <Pressable onPress={takePhoto} disabled={loading} style={[styles.halfDropzone, loading && styles.disabledBox]}>
                    <Ionicons name="camera" size={28} color={MAIN_BLUE} />
                    <Text style={styles.dropTitleSmall}>카메라 촬영</Text>
                  </Pressable>
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {images.length < MAX_IMAGES && (
                      <TouchableOpacity disabled={loading} onPress={() => {
                        Alert.alert("사진 추가", "방법을 선택하세요", [
                          { text: "보관함", onPress: pickFromLibrary },
                          { text: "카메라", onPress: takePhoto },
                          { text: "취소", style: "cancel" }
                        ]);
                      }} style={styles.addSquare}>
                        <Ionicons name="add" size={30} color={MAIN_BLUE} />
                      </TouchableOpacity>
                  )}
                  {images.map((img) => (
                      <View key={img.uri} style={styles.previewSquare}>
                        <Image source={{ uri: img.uri }} style={styles.squareImage} />
                        <TouchableOpacity onPress={() => removeImage(img.uri)} style={styles.deleteMiniBadge}>
                          <Ionicons name="close" size={14} color="white" />
                        </TouchableOpacity>
                      </View>
                  ))}
                </ScrollView>
            )}
          </View>

          <View style={styles.miniTipBox}>
            <Text style={styles.miniTipTitle}>💡 촬영 팁</Text>
            <Text style={styles.miniTipText}>• 현재 AI는 6가지 하자 유형을 기준으로 분석하며,{"\n"}   그 외 문제는 정확히 인식되지 않을 수 있습니다.</Text>
            <Text style={styles.miniTipText}>• 하자 부위가 화면 중앙에 크게 보이도록 {"\n"}   약 50cm~1m 거리에서 촬영해주세요.</Text>
            <Text style={styles.miniTipText}>• 밝은 곳에서 문제 부위를 선명하게 찍어주세요.</Text>
            <Text style={styles.miniTipText}>• 최대 {MAX_IMAGES}장까지 다양한 각도에서 등록 가능합니다.</Text>

          </View>

          <TouchableOpacity
              activeOpacity={0.8}
              onPress={goAnalyze}
              disabled={images.length === 0 || loading}
              style={[styles.mainButton, (images.length === 0 || loading) && styles.mainButtonDisabled]}
          >
            <Text style={styles.mainButtonText}>{loading ? "업로드 중..." : "진단 시작하기"}</Text>
          </TouchableOpacity>

          {/* 하단바 가림 방지 여백 */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
  );
}

function TypeItem({ emoji, text }: { emoji: string; text: string }) {
  return (
      <View style={styles.typeItem}>
        <Text style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</Text>
        <Text style={styles.typeText}>{text}</Text>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 12 },
  typeGrid: { flexDirection: "row", gap: 10 },
  typeItem: { flex: 1, backgroundColor: BG_BLUE, borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#dbeafe" },
  typeText: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  uploadSection: { marginBottom: 24 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  uploadCountText: { fontSize: 14, color: MAIN_BLUE, fontWeight: "700" },
  dualDropzoneRow: { flexDirection: 'row', gap: 12 },
  halfDropzone: { flex: 1, height: 120, backgroundColor: BG_BLUE, borderRadius: 20, borderWidth: 1.5, borderColor: MAIN_BLUE, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  dropTitleSmall: { fontSize: 14, fontWeight: "600", color: MAIN_BLUE, marginTop: 8 },
  horizontalScroll: { paddingVertical: 8 },
  addSquare: { width: 100, height: 100, backgroundColor: BG_BLUE, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1.5, borderColor: MAIN_BLUE, borderStyle: "dashed" },
  previewSquare: { width: 100, height: 100, marginRight: 12, position: 'relative' },
  squareImage: { width: "100%", height: "100%", borderRadius: 16 },
  deleteMiniBadge: { position: "absolute", top: -6, right: -6, backgroundColor: "#ef4444", borderRadius: 11, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2, borderColor: "#fff" },
  miniTipBox: { backgroundColor: "#f8fafc", padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: "#f1f5f9" },
  miniTipTitle: { fontSize: 15, fontWeight: "700", color: "#475569", marginBottom: 8 },
  miniTipText: { fontSize: 13, color: "#64748b", lineHeight: 20 },
  disabledBox: { opacity: 0.45 },
  mainButton: { backgroundColor: MAIN_BLUE, borderRadius: 18, paddingVertical: 19, alignItems: "center", shadowColor: MAIN_BLUE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4 },
  mainButtonDisabled: { backgroundColor: "#cbd5e1" },
  mainButtonText: { color: "white", fontSize: 17, fontWeight: "800" },
});