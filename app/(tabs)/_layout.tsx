import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform, StyleSheet } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "진단",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="camera" />
          ),
        }}
      />
      <Tabs.Screen
        name="histories"
        options={{
          title: "히스토리",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="time" />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "마이페이지",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused} color={color} name="person" />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ focused, color, name }: { focused: boolean; color: string; name: any }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: Platform.OS === "ios" ? 90 : 70,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 0,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 25 : 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: -2,
  },
  iconContainer: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: "#eff6ff",
  },
});
