import { useState } from "react";
import { View, Text, Pressable, Image, ScrollView, StyleSheet, Alert, Platform, TouchableOpacity, SafeAreaView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";

// [원본 경로 및 로직 100% 유지]
import { showAlert } from "../src/utils/showAlert";
import api from "../src/api/apiClient";
import { setPendingImages } from "../src/api/diagnosis";
import { Ionicons } from "@expo/vector-icons";

type PickedImage = {
  uri: string;
};

const MAX_IMAGES = 5;
const MAIN_BLUE = "#60a5fa";
const BG_BLUE = "#eff6ff";

export default function Upload() {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);

  // --- [원본 로직 영역: 수정 금지] ---
  function removeImage(uri: string) {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showAlert("권한 필요", "사진 접근 권한을 허용해주세요.");
      return;
    }
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      showAlert("제한 초과", `사진은 최대 ${MAX_IMAGES}장까지 선택할 수 있습니다.`);
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
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showAlert("권한 필요", "카메라 권한을 허용해주세요.");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      showAlert("제한 초과", `사진은 최대 ${MAX_IMAGES}장까지 선택할 수 있습니다.`);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;
    const uri = result.assets[0]?.uri;
    if (!uri) return;
    setImages((prev) => [...prev, { uri }].slice(0, MAX_IMAGES));
  }

  function goAnalyze() {
    if (images.length === 0) {
      showAlert("사진 필요", "진단할 사진을 최소 1장 선택해주세요.");
      return;
    }
    const uris = images.map(img => img.uri);
    setPendingImages(uris);
    router.push("/analyzing");
  }
  // --- [원본 로직 영역 끝] ---

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI 진단</Text>
          <Text style={styles.headerSub}>문제가 생긴 곳의 사진을 올려주세요</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>진단 가능 범위</Text>
          <View style={styles.typeGrid}>
            <TypeItem emoji="💧" text="누수" />
            <TypeItem emoji="⚡" text="균열" />
            <TypeItem emoji="🔧" text="고장" />
            <TypeItem emoji="🧹" text="오염" />
          </View>
        </View>

        <View style={styles.uploadSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionLabel}>사진 등록</Text>
            <Text style={styles.uploadCountText}>{images.length} / {MAX_IMAGES}</Text>
          </View>

          {images.length === 0 ? (
            /* [수정] 업로드와 촬영 버튼을 가로로 분리 */
            <View style={styles.dualDropzoneRow}>
              <Pressable 
                onPress={pickFromLibrary}
                style={({ pressed }) => [
                  styles.halfDropzone,
                  pressed && { backgroundColor: '#e0e7ff' }
                ]}
              >
                <Ionicons name="images" size={28} color={MAIN_BLUE} />
                <Text style={styles.dropTitleSmall}>보관함 업로드</Text>
              </Pressable>

              <Pressable 
                onPress={takePhoto}
                style={({ pressed }) => [
                  styles.halfDropzone,
                  pressed && { backgroundColor: '#e0e7ff' }
                ]}
              >
                <Ionicons name="camera" size={28} color={MAIN_BLUE} />
                <Text style={styles.dropTitleSmall}>직접 촬영</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {images.length < MAX_IMAGES && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => {
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
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => removeImage(img.uri)} 
                    style={styles.deleteMiniBadge}
                  >
                    <Ionicons name="close" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.miniTipBox}>
          <Text style={styles.miniTipTitle}>💡 촬영 팁</Text>
          <Text style={styles.miniTipText}>• 밝은 곳에서 문제 부위를 가깝고 선명하게 찍어주세요.</Text>
          <Text style={styles.miniTipText}>• 여러 각도에서 찍으면 AI가 더 정확하게 분석합니다.</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={goAnalyze}
          disabled={images.length === 0}
          style={[
            styles.mainButton, 
            images.length === 0 && styles.mainButtonDisabled
          ]}
        >
          <Text style={styles.mainButtonText}>
            {loading ? "업로드 중..." : "진단 시작하기"}
          </Text>
        </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 60 },
  header: { marginBottom: 32 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 2 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 12 },
  typeGrid: { flexDirection: "row", gap: 10 },
  typeItem: { flex: 1, backgroundColor: BG_BLUE, borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  typeText: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  uploadSection: { marginBottom: 24 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  uploadCountText: { fontSize: 14, color: MAIN_BLUE, fontWeight: "700" },
  
  // 가로 정렬을 위한 스타일 추가
  dualDropzoneRow: { flexDirection: 'row', gap: 12 },
  halfDropzone: { 
    flex: 1, 
    height: 120, 
    backgroundColor: BG_BLUE, 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: MAIN_BLUE, 
    borderStyle: "dashed", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  dropTitleSmall: { fontSize: 14, fontWeight: "600", color: MAIN_BLUE, marginTop: 8 },

  horizontalScroll: { paddingVertical: 4 },
  addSquare: { width: 100, height: 100, backgroundColor: BG_BLUE, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1.5, borderColor: MAIN_BLUE, borderStyle: "dashed" },
  previewSquare: { width: 100, height: 100, marginRight: 12, position: 'relative' },
  squareImage: { width: "100%", height: "100%", borderRadius: 16 },
  deleteMiniBadge: { position: "absolute", top: -6, right: -6, backgroundColor: "#ef4444", borderRadius: 11, width: 22, height: 22, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 2, borderColor: "#fff" },
  miniTipBox: { backgroundColor: "#f8fafc", padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: "#f1f5f9" },
  miniTipTitle: { fontSize: 15, fontWeight: "700", color: "#475569", marginBottom: 8 },
  miniTipText: { fontSize: 13, color: "#64748b", lineHeight: 20 },
  mainButton: { backgroundColor: MAIN_BLUE, borderRadius: 16, paddingVertical: 18, alignItems: "center", shadowColor: MAIN_BLUE, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  mainButtonDisabled: { backgroundColor: "#cbd5e1" },
  mainButtonText: { color: "white", fontSize: 17, fontWeight: "800" },
});