import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { getIsAdmin } from "../../src/store/tokenStorage";

export default function TabsLayout() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getIsAdmin().then(setIsAdmin);
  }, []);

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="upload" options={{ title: "진단" }} />
      <Tabs.Screen name="histories" options={{ title: "히스토리" }} />
      <Tabs.Screen name="mypage" options={{ title: "마이페이지" }} />
      <Tabs.Screen name="admin" options={{ title: "관리", href: isAdmin ? undefined : null }} />
    </Tabs>
  );
}
