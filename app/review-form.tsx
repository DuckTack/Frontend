import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Feather, FontAwesome } from "@expo/vector-icons";

import { createExpertReview, getReviewApiErrorMessage } from "../src/api/reviews";

const MAIN_BLUE = "#3b82f6";
const MAX_REVIEW_LENGTH = 1000;

export default function ReviewForm() {
  const {
    companyId,
    kakaoPlaceId,
    kakaoPlaceName,
    kakaoPlacePhone,
    kakaoPlaceAddress,
    kakaoPlaceLat,
    kakaoPlaceLng,
    vendorName,
  } = useLocalSearchParams<{
    historyId?: string;
    companyId?: string;
    kakaoPlaceId?: string;
    kakaoPlaceName?: string;
    kakaoPlacePhone?: string;
    kakaoPlaceAddress?: string;
    kakaoPlaceLat?: string;
    kakaoPlaceLng?: string;
    vendorId?: string;
    vendorName?: string;
  }>();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const targetName = useMemo(
    () => vendorName || kakaoPlaceName || "전문업체",
    [kakaoPlaceName, vendorName],
  );

  async function submit() {
    if (!companyId && !kakaoPlaceId) {
      Alert.alert("리뷰 작성 불가", "리뷰를 연결할 업체 정보가 없습니다.");
      return;
    }
    if (rating < 1 || rating > 5) {
      Alert.alert("별점 확인", "별점은 1점부터 5점까지만 선택할 수 있습니다.");
      return;
    }
    if (content.length > MAX_REVIEW_LENGTH) {
      Alert.alert("내용 확인", `리뷰 내용은 최대 ${MAX_REVIEW_LENGTH}자까지 입력할 수 있습니다.`);
      return;
    }

    try {
      setSubmitting(true);
      await createExpertReview({
        companyId,
        kakaoPlaceId,
        kakaoPlaceName: kakaoPlaceName ?? vendorName,
        kakaoPlacePhone,
        kakaoPlaceAddress,
        kakaoPlaceLat,
        kakaoPlaceLng,
        rating,
        content,
      });
      Alert.alert("작성 완료", "리뷰가 등록되었습니다.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("작성 실패", getReviewApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={MAIN_BLUE} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>리뷰 작성</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{targetName}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>별점</Text>
        <View style={styles.starPicker}>
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            return (
              <Pressable key={value} onPress={() => setRating(value)} style={styles.starButton}>
                <FontAwesome name={value <= rating ? "star" : "star-o"} size={34} color="#f59e0b" />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>리뷰 내용</Text>
        <TextInput
          value={content}
          onChangeText={(text) => setContent(text.slice(0, MAX_REVIEW_LENGTH))}
          placeholder="업체 응대, 작업 만족도, 비용 등을 적어주세요. 내용은 선택사항입니다."
          placeholderTextColor="#94a3b8"
          multiline
          textAlignVertical="top"
          style={styles.textArea}
        />
        <View style={styles.helpRow}>
          <Text style={styles.helpText}>PDF 생성이 완료된 진단 기록을 기준으로 리뷰를 작성합니다.</Text>
          <Text style={styles.countText}>{content.length}/{MAX_REVIEW_LENGTH}</Text>
        </View>

        <Pressable onPress={submit} disabled={submitting} style={[styles.submitBtn, submitting && { opacity: 0.6 }]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>리뷰 등록하기</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 16, backgroundColor: "#fff" },
  backBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#f8fafc", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  headerSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  content: { padding: 24, gap: 14 },
  label: { fontSize: 14, fontWeight: "800", color: "#334155", marginTop: 8 },
  starPicker: { flexDirection: "row", gap: 10, backgroundColor: "#f8fafc", borderRadius: 20, padding: 16, justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  starButton: { padding: 4 },
  textArea: { minHeight: 180, borderRadius: 18, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e2e8f0", padding: 16, fontSize: 15, color: "#1e293b", lineHeight: 22 },
  helpRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  helpText: { color: "#94a3b8", fontSize: 12, lineHeight: 18, flex: 1 },
  countText: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  submitBtn: { marginTop: 10, height: 56, borderRadius: 18, backgroundColor: MAIN_BLUE, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
