import { View, Text, Pressable, ActivityIndicator } from "react-native";

type Props = {
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: (() => void) | null;
  title?: string;
};

export default function ScreenState({ loading, errorMessage, onRetry, title }: Props) {
  if (!loading && !errorMessage) return null;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16, gap: 12 }}>
      {title ? <Text style={{ fontSize: 18, fontWeight: "800" }}>{title}</Text> : null}

      {loading ? (
        <>
          <ActivityIndicator />
          <Text style={{ opacity: 0.7 }}>불러오는 중...</Text>
        </>
      ) : (
        <>
          <Text style={{ opacity: 0.7, textAlign: "center" }}>{errorMessage}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={{ borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
              <Text>다시 시도</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}
