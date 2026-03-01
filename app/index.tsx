// asyncstorage에서 토큰을 읽어와서 있으면 홈으로, 없으면 로그인으로 보내는 분기점
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { getAccessToken } from "@/src/store/tokenStorage";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    async function checkToken() {
      try {
        const token = await getAccessToken();
        setHasToken(!!token);
      } finally {
        setIsLoading(false);
      }
    }
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={hasToken ? "/(tabs)" : "/login"} />;
}
