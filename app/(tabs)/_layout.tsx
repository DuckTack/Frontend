import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "진단",
        }}
      />
      <Tabs.Screen
        name="histories"
        options={{
          title: "히스토리",
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "마이페이지",
        }}
      />
    </Tabs>
  );
}
