import { Tabs, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getIsAdmin } from "@/src/store/tokenStorage";

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getIsAdmin().then((value) => {
        if (mounted) setIsAdmin(value);
      });
      return () => {
        mounted = false;
      };
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="upload" options={{ title: "진단" }} />
      <Tabs.Screen name="histories" options={{ title: "히스토리" }} />
      <Tabs.Screen name="mypage" options={{ title: "마이페이지" }} />
      <Tabs.Screen name="admin" options={{ title: "관리", href: isAdmin ? undefined : null }} />
    </Tabs>
  );
}
