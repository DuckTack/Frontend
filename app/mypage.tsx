import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import {
  listMyReports,
  generateReport,
  getPdfUrl,
  MyReportItem,
} from "../src/api/reports";

export default function MyPage() {
  const [reports, setReports] = useState<MyReportItem[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const data = await listMyReports();
      setReports(data?.content ?? []);
    } catch (e) {
      console.log("리포트 목록 실패:", e);
      setReports([]);
    }
  }

  async function handleGenerate(report: MyReportItem) {
    try {
      await generateReport(report.diagnosisId);
      Alert.alert("완료", "PDF 생성 완료");
      await loadReports();
    } catch {
      Alert.alert("오류", "PDF 생성 실패");
    }
  }

  async function handleDownload(report: MyReportItem) {
    try {
      const url = await getPdfUrl(report.diagnosisId);

      const fileUri =
          FileSystem.documentDirectory +
          `report_${report.diagnosisId}.pdf`;

      await FileSystem.downloadAsync(url, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("다운로드 완료", fileUri);
      }
    } catch (e) {
      console.log("PDF 다운로드 실패:", e);
      Alert.alert("오류", "다운로드 실패");
    }
  }

  return (
      <ScrollView style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, marginBottom: 20 }}>
          마이페이지 - 리포트
        </Text>

        {Array.isArray(reports) &&
            reports.map((r) => (
                <View
                    key={r.diagnosisId}
                    style={{
                      padding: 15,
                      borderWidth: 1,
                      borderRadius: 10,
                      marginBottom: 15,
                    }}
                >
                  <Text>문제 유형: {r.issueType}</Text>
                  <Text>위험도: {r.riskScore}</Text>
                  <Text>상태: {r.status}</Text>

                  <Pressable
                      onPress={() => handleGenerate(r)}
                      style={{
                        backgroundColor: "#4CAF50",
                        padding: 10,
                        marginTop: 10,
                        borderRadius: 5,
                      }}
                  >
                    <Text style={{ color: "white", textAlign: "center" }}>
                      PDF 생성
                    </Text>
                  </Pressable>

                  <Pressable
                      onPress={() => handleDownload(r)}
                      style={{
                        backgroundColor: "#2196F3",
                        padding: 10,
                        marginTop: 10,
                        borderRadius: 5,
                      }}
                  >
                    <Text style={{ color: "white", textAlign: "center" }}>
                      PDF 다운로드
                    </Text>
                  </Pressable>
                </View>
            ))}
      </ScrollView>
  );
}