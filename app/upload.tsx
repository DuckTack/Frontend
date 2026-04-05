import { useState } from "react";
import { View, Text, Pressable, Image, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { showAlert } from "../src/utils/showAlert";
import api from "../src/api/apiClient";
import { setPendingImages } from "../src/api/diagnosis";

type PickedImage = {
  uri: string;
};

const MAX_IMAGES = 5;

export default function Upload() {
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);

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

    setImages((prev) => {
      const merged = [...prev, ...picked];
      return merged.slice(0, MAX_IMAGES);
    });
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

    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setImages((prev) => [...prev, { uri }].slice(0, MAX_IMAGES));
  }
  async function uploadImages() {
    try {
      setLoading(true);

      const formData = new FormData();

      images.forEach((img, index) => {
        const uri = img.uri.startsWith("file://")
            ? img.uri
            : "file://" + img.uri;

        formData.append("files", {
          uri,
          name: `image_${index}.jpg`,
          type: "image/jpeg",
        } as any);
      });

      console.log("FormData:", formData);

      await api.post("/api/files/upload", formData);

      router.push("/analyzing");

    } catch (e) {
      console.log("업로드 에러:", e);
      showAlert("업로드 실패", "사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
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

  return (
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700" }}>사진 업로드</Text>
        <Text style={{ opacity: 0.7 }}>
          문제 부위가 잘 보이게 촬영해주세요. (최대 {MAX_IMAGES}장)
        </Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
              onPress={pickFromLibrary}
              style={{ flex: 1, paddingVertical: 14, borderWidth: 1, borderRadius: 12, alignItems: "center" }}
          >
            <Text>보관함에서 가져오기</Text>
          </Pressable>

          <Pressable
              onPress={takePhoto}
              style={{ flex: 1, paddingVertical: 14, borderWidth: 1, borderRadius: 12, alignItems: "center" }}
          >
            <Text>카메라 촬영</Text>
          </Pressable>
        </View>

        <Text style={{ marginTop: 8, fontWeight: "600" }}>
          선택됨: {images.length} / {MAX_IMAGES}
        </Text>

        <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {images.length === 0 ? (
              <View style={{ padding: 16, borderWidth: 1, borderRadius: 12 }}>
                <Text style={{ opacity: 0.7 }}>선택한 사진이 아직 없습니다.</Text>
              </View>
          ) : (
              images.map((img) => (
                  <View key={img.uri} style={{ borderWidth: 1, borderRadius: 12, overflow: "hidden" }}>
                    <Image source={{ uri: img.uri }} style={{ width: "100%", height: 220 }} />
                    <Pressable
                        onPress={() => removeImage(img.uri)}
                        style={{ paddingVertical: 12, alignItems: "center", borderTopWidth: 1 }}
                    >
                      <Text>삭제</Text>
                    </Pressable>
                  </View>
              ))
          )}
        </ScrollView>

        <Pressable
            onPress={goAnalyze}
            style={{ paddingVertical: 14, borderWidth: 1, borderRadius: 12, alignItems: "center" }}
        >
          <Text>{loading ? "업로드 중..." : "진단하기"}</Text>
        </Pressable>
      </View>
  );
}