/**
 * DduckTack 디자인 토큰 — 포인트 컬러 통일 (Toss 스타일 블루)
 *
 * 기존 코드 곳곳에 흩어져 있던 블루 계열(#3b82f6, #60a5fa, #2563eb, #eff6ff 등)을
 * 하나의 일관된 팔레트로 정리했습니다. 새 화면을 만들 때는 하드코딩된 hex 대신
 * 이 토큰을 사용해 주세요.
 */

export const colors = {
  // ── 포인트 컬러 (Primary / Toss Blue) ──
  primary: "#3182F6",        // 기본 포인트 컬러 — 버튼, 링크, 강조 텍스트
  primaryDark: "#1B64DA",    // 눌림 상태 / 진한 강조 텍스트
  primarySoft: "#5B93F5",    // 보조 톤 (그라데이션, 아이콘 강조 등)
  primaryOnDark: "#8FB8F6",  // 어두운 배경 위에서 쓰는 연한 블루 텍스트
  primaryBorder: "#C8DDFE",  // 연한 보더 / 배지 테두리
  primaryTint: "#EEF4FF",    // 가장 연한 블루 배경 (카드, 배지, 선택 상태)
  primaryTint2: "#E3ECFF",   // 살짝 더 진한 블루 배경

  // ── 뉴트럴 (배경/텍스트/구분선) ──
  ink: "#0F172A",            // 가장 진한 텍스트 / 다크 히어로 배경
  text: "#1E293B",           // 본문 제목 텍스트
  textSecondary: "#64748B",  // 보조 설명 텍스트
  textTertiary: "#94A3B8",   // 캡션 / placeholder
  border: "#E2E8F0",         // 카드 보더 / 구분선
  surface: "#F8FAFC",        // 배경(카드 위 카드, 입력창 배경)
  surfaceAlt: "#F1F5F9",     // 보조 배경
  white: "#FFFFFF",

  // ── 상태 컬러 (기능적 의미를 가지므로 그대로 유지) ──
  success: "#16A34A",
  warning: "#F97316",
  danger: "#EF4444",
  dangerStrong: "#DC2626",
};

/**
 * 공용 버튼 스타일 토큰
 * Pressable + StyleSheet 조합에서 스프레드(spread)하여 사용하세요.
 *   style={({ pressed }) => [buttonTokens.primary, pressed && buttonTokens.pressed]}
 */
export const buttonTokens = {
  // 기본(Primary) 버튼 — 화면의 핵심 CTA
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  primaryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800" as const,
    letterSpacing: 0.2,
  },

  // 보조(Secondary) 버튼 — 흰 배경 + 보더
  secondary: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700" as const,
  },

  // 연한 톤(Tint) 버튼 — 덜 중요한 액션
  tint: {
    backgroundColor: colors.primaryTint,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tintText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700" as const,
  },

  // 눌림 상태 공통 (opacity 트릭)
  pressed: {
    opacity: 0.85,
  },
};
