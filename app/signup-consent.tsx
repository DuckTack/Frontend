import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const C = {
  primary:   "#4F46E5",
  primaryBg: "#EDEDFF",
  text:      "#0F172A",
  sub:       "#64748B",
  border:    "#E2E8F0",
  card:      "#FFFFFF",
  bg:        "#F8FAFC",
};

// ─────────────────────────────────────────
// 약관 전문 콘텐츠
// ─────────────────────────────────────────
const TERMS_SERVICE = `제1조 (목적)
이 약관은 뚝딱(이하 "회사")이 제공하는 AI 기반 주택 하자 진단 서비스(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 회사가 제공하는 AI 기반 주택 하자 진단, DIY 가이드, 전문업체 연결 등의 기능을 말합니다.
② "회원"이란 본 약관에 동의하고 회원가입을 완료한 자를 말합니다.
③ "진단 결과"란 회원이 업로드한 이미지를 AI가 분석한 참고용 결과물을 말합니다.

제3조 (서비스 제공)
① 회사는 다음과 같은 서비스를 제공합니다.
  1. AI 기반 주택 하자(균열·누수·곰팡이 등) 이미지 진단
  2. DIY 수리 가이드 및 맞춤형 자재 안내
  3. 전문 수리업체 연결 및 예약 중개
  4. 진단 기록 보관 및 리포트 발급
② AI 진단 결과는 참고 목적의 정보로, 전문가 의견을 대체하지 않습니다.

제4조 (회원의 의무)
① 회원은 타인의 정보를 무단으로 사용하거나 허위 정보를 입력해서는 안 됩니다.
② 회원은 서비스를 이용하여 법령, 본 약관, 서비스 이용 안내 등을 위반하는 행위를 해서는 안 됩니다.
③ 회원은 계정 정보를 타인에게 양도하거나 공유해서는 안 됩니다.

제5조 (책임의 한계)
① AI 진단 결과는 참고용이며, 실제 하자 여부 및 수리 비용은 전문가 현장 점검을 통해 확인하시기 바랍니다.
② 회사는 AI 진단 결과의 정확성에 대해 법적 책임을 지지 않습니다.
③ 천재지변, 전쟁, 테러 등 불가항력적 사유로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.

제6조 (서비스 이용 제한 및 중지)
회사는 다음 각 호의 사유가 발생한 경우 서비스 제공을 중단하거나 이용을 제한할 수 있습니다.
  1. 시스템 점검·교체 및 고장
  2. 회원의 약관 위반 행위
  3. 기타 서비스 운영상 필요한 경우

제7조 (약관의 변경)
회사는 약관을 변경할 경우 적용 7일 전부터 앱 내 공지사항을 통해 고지합니다. 변경된 약관에 동의하지 않을 경우 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.

제8조 (준거법 및 재판관할)
본 약관의 해석 및 분쟁 해결은 대한민국 법률에 따르며, 관할 법원은 민사소송법상의 관할 법원으로 합니다.

시행일: 2025년 1월 1일`;

const TERMS_PRIVACY = `뚝딱(이하 "회사")은 개인정보 보호법 제30조에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위해 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (수집하는 개인정보 항목 및 수집 방법)
① 수집 항목
  - 필수: 이메일 주소, 비밀번호(암호화 저장), 거주 지역, 주거 형태, 임대 유형
  - 자동 생성: 진단 이미지, 진단 기록, 접속 IP 주소, 기기 정보, 서비스 이용 기록
② 수집 방법: 회원가입 시 이용자 직접 입력, 서비스 이용 시 자동 수집

제2조 (개인정보의 수집 및 이용 목적)
  1. 회원 식별 및 본인 확인
  2. 서비스(AI 진단, DIY 가이드, 전문업체 연결) 제공
  3. 진단 기록 보관 및 PDF 리포트 발급
  4. 고객 문의 및 분쟁 처리
  5. 서비스 품질 개선 및 통계 분석

제3조 (개인정보의 보유 및 이용 기간)
  - 회원 탈퇴 시 즉시 파기
    (단, 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보관)
  - 전자상거래 관련 기록: 5년
    (전자상거래 등에서의 소비자보호에 관한 법률)
  - 접속 로그 기록: 3개월
    (통신비밀보호법)

제4조 (개인정보의 파기)
회원 탈퇴 또는 보존 기간 경과 시 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로 영구 삭제합니다.

제5조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 이용자의 사전 동의가 있거나 법령에 따른 경우에는 예외로 합니다.

제6조 (개인정보 처리 위탁)
서비스 운영을 위해 아래와 같이 개인정보 처리 업무를 위탁할 수 있습니다.
  - 클라우드 인프라 서비스 업체 (서버 운영 및 데이터 보관)
  위탁 업체는 개인정보 보호 관련 법령 준수 의무를 부과받습니다.

제7조 (정보주체의 권리·의무 및 행사 방법)
이용자는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 마이페이지 또는 고객센터를 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.

제8조 (개인정보 보호 책임자)
  - 담당 부서: 서비스운영팀
  - 이메일: privacy@dduckttack.com

시행일: 2025년 1월 1일`;

const TERMS_MARKETING = `마케팅 정보 수신 동의 (선택사항)

뚝딱 서비스와 관련한 이벤트, 프로모션, 새로운 기능 안내, 제휴 혜택 등 유용한 정보를 알려드립니다.

■ 수신 채널
  - 앱 내 푸시 알림
  - 이메일

■ 제공하는 정보
  - 신규 기능 및 서비스 업데이트 안내
  - 이벤트·프로모션 안내
  - 전문업체 제휴 할인 혜택
  - DIY 팁 및 주택 관리 콘텐츠

■ 개인정보 이용 내역
  - 이용 항목: 이메일 주소, 서비스 이용 기록
  - 이용 목적: 맞춤형 마케팅 정보 발송
  - 보유 기간: 동의 철회 시까지

■ 거부 권리 안내
본 동의는 선택 사항이며, 동의하지 않으셔도 기본 서비스 이용에 불이익이 없습니다.
동의 후에도 마이페이지 > 알림 설정에서 언제든지 수신 거부가 가능합니다.`;

type TermsKey = "service" | "privacy" | "marketing";

const TERMS_TITLES: Record<TermsKey, string> = {
  service:   "서비스 이용약관",
  privacy:   "개인정보 수집 및 이용",
  marketing: "마케팅 정보 수신 동의",
};

const TERMS_CONTENT: Record<TermsKey, string> = {
  service:   TERMS_SERVICE,
  privacy:   TERMS_PRIVACY,
  marketing: TERMS_MARKETING,
};

// ─────────────────────────────────────────

function CheckboxRow({
  label,
  checked,
  onPress,
  description,
  required = false,
  onViewTerms,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  description: string;
  required?: boolean;
  onViewTerms?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.checkboxCard, checked && styles.checkboxCardActive]}
    >
      <View style={styles.checkboxTopRow}>
        <View style={[styles.customCheckbox, checked && styles.customCheckboxChecked]}>
          {checked && <Ionicons name="checkmark" size={14} color="white" />}
        </View>
        <Text style={styles.checkboxLabel}>
          <Text style={{ color: required ? C.primary : "#94A3B8", fontWeight: "700" }}>
            {required ? "[필수] " : "[선택] "}
          </Text>
          {label}
        </Text>
        {onViewTerms && (
          <Pressable
            onPress={(e) => { e.stopPropagation(); onViewTerms(); }}
            hitSlop={8}
            style={styles.viewTermsBtn}
          >
            <Text style={styles.viewTermsText}>전문 보기</Text>
            <Ionicons name="chevron-forward" size={11} color={C.primary} />
          </Pressable>
        )}
      </View>
      <Text style={styles.checkboxDescription}>{description}</Text>
    </Pressable>
  );
}

export default function SignupConsentPage() {
  const [serviceChecked,   setServiceChecked]   = useState(false);
  const [privacyChecked,   setPrivacyChecked]   = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [activeTerms,      setActiveTerms]      = useState<TermsKey | null>(null);

  const allRequiredChecked = serviceChecked && privacyChecked;
  const isAllAgree = serviceChecked && privacyChecked && marketingChecked;

  // --- [원본 로직 100% 유지] ---
  function handleContinue() {
    if (!allRequiredChecked) {
      Alert.alert("동의 필요", "필수 동의 항목을 모두 체크해야 회원가입을 진행할 수 있습니다.");
      return;
    }
    router.replace("/signup?consent=1");
  }

  function handleAllAgree() {
    const next = !isAllAgree;
    setServiceChecked(next);
    setPrivacyChecked(next);
    setMarketingChecked(next);
  }
  // --- [원본 로직 끝] ---

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>약관 동의</Text>
          <Text style={styles.headerSub}>안전한 서비스 이용을 위해{"\n"}약관에 동의해주세요</Text>
        </View>

        {/* 전체 동의 버튼 */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAllAgree}
          style={[styles.allAgreeButton, isAllAgree && styles.allAgreeButtonActive]}
        >
          <View style={[styles.allAgreeIcon, isAllAgree && styles.allAgreeIconActive]}>
            <Ionicons
              name={isAllAgree ? "checkmark" : "checkmark"}
              size={16}
              color={isAllAgree ? C.primary : "#CBD5E1"}
            />
          </View>
          <Text style={[styles.allAgreeText, isAllAgree && styles.allAgreeTextActive]}>
            모든 약관에 전체 동의합니다
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 개별 약관 */}
        <View style={styles.checkboxList}>
          <CheckboxRow
            required
            checked={serviceChecked}
            onPress={() => setServiceChecked(!serviceChecked)}
            label="서비스 이용약관"
            description="AI 진단, DIY 가이드, 전문업체 연결 등 서비스 제공에 관한 기본 약관입니다."
            onViewTerms={() => setActiveTerms("service")}
          />
          <CheckboxRow
            required
            checked={privacyChecked}
            onPress={() => setPrivacyChecked(!privacyChecked)}
            label="개인정보 수집 및 이용"
            description="이메일·거주 정보를 수집하며, 탈퇴 시 즉시 파기합니다. (개인정보 보호법 준수)"
            onViewTerms={() => setActiveTerms("privacy")}
          />
          <CheckboxRow
            checked={marketingChecked}
            onPress={() => setMarketingChecked(!marketingChecked)}
            label="마케팅 정보 수신"
            description="이벤트·혜택·업데이트 안내를 수신합니다. 미동의 시에도 서비스 이용에 불이익이 없습니다."
            onViewTerms={() => setActiveTerms("marketing")}
          />
        </View>

        {/* 약관 전문 모달 */}
        <Modal
          visible={activeTerms !== null}
          animationType="slide"
          transparent
          statusBarTranslucent
          onRequestClose={() => setActiveTerms(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* 모달 헤더 */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeTerms ? TERMS_TITLES[activeTerms] : ""}
                </Text>
                <Pressable onPress={() => setActiveTerms(null)} style={styles.modalCloseBtn} hitSlop={12}>
                  <Ionicons name="close" size={20} color="#475569" />
                </Pressable>
              </View>
              {/* 약관 본문 */}
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalBody}>
                  {activeTerms ? TERMS_CONTENT[activeTerms] : ""}
                </Text>
              </ScrollView>
              {/* 확인 버튼 */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTerms(null)}
                  style={styles.modalConfirmBtn}
                >
                  <Text style={styles.modalConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            style={[styles.mainButton, !allRequiredChecked && styles.mainButtonDisabled]}
          >
            <Text style={styles.mainButtonText}>회원가입 계속하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 },

  header:      { marginBottom: 28 },
  headerTitle: { fontSize: 30, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  headerSub:   { fontSize: 15, color: "#64748B", marginTop: 10, lineHeight: 24 },

  allAgreeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 14,
  },
  allAgreeButtonActive: {
    backgroundColor: C.primaryBg,
    borderColor: "#C7D2FE",
  },
  allAgreeIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  allAgreeIconActive: {
    backgroundColor: C.primaryBg,
    borderColor: C.primary,
  },
  allAgreeText:       { fontSize: 16, fontWeight: "700", color: "#475569" },
  allAgreeTextActive: { color: C.primary },

  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 24 },

  checkboxList: { gap: 12 },
  checkboxCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  checkboxCardActive: {
    borderColor: "#C7D2FE",
    backgroundColor: C.primaryBg,
  },
  checkboxTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  customCheckboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checkboxLabel:       { fontSize: 15, fontWeight: "700", color: "#1E293B", flex: 1 },
  checkboxDescription: { fontSize: 13, color: "#64748B", lineHeight: 20, paddingLeft: 34 },

  viewTermsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.primaryBg,
  },
  viewTermsText: { fontSize: 11, fontWeight: "700", color: C.primary },

  // ── 약관 전문 모달 ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalBody: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 22,
    fontWeight: "400",
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalConfirmBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  footer:     { marginTop: 44, gap: 12 },
  mainButton: {
    backgroundColor: C.primary,
    paddingVertical: 19,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  mainButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  mainButtonText: { color: "white", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  backButton:     { paddingVertical: 12, alignItems: "center" },
  backButtonText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
});
