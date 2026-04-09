import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import type { SFSymbol } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function LogoutButton({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { logout } = useAuth();
  return (
    <Pressable onPress={logout} style={{ marginRight: 16 }}>
      <Feather name="log-out" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

function NativeTabLayout() {
  const colors = useColors();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: insets.top + 8,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 18,
            color: colors.primary,
          }}
        >
          AutoFlotta
        </Text>
        <Pressable onPress={logout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>Dashboard</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="prenotazioni">
          <Icon sf={{ default: "calendar", selected: "calendar.circle.fill" }} />
          <Label>Prenotazioni</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="inventario">
          <Icon sf={{ default: "car", selected: "car.fill" }} />
          <Label>Inventario</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="clienti">
          <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
          <Label>Clienti</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="manutenzioni">
          <Icon sf={{ default: "wrench", selected: "wrench.fill" }} />
          <Label>Manutenzioni</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const tabIcon = (name: string, sfName: SFSymbol, size = 22) =>
    ({ color }: { color: string }) =>
      isIOS ? (
        <SymbolView name={sfName} tintColor={color} size={size} />
      ) : (
        <Feather name={name as never} size={size} color={color} />
      );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerRight: () => <LogoutButton colors={colors} />,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          fontFamily: "Inter_600SemiBold",
          color: colors.foreground,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: tabIcon("home", "house"),
        }}
      />
      <Tabs.Screen
        name="prenotazioni"
        options={{
          title: "Prenotazioni",
          tabBarIcon: tabIcon("calendar", "calendar"),
        }}
      />
      <Tabs.Screen
        name="inventario"
        options={{
          title: "Inventario",
          tabBarIcon: tabIcon("truck", "car"),
        }}
      />
      <Tabs.Screen
        name="clienti"
        options={{
          title: "Clienti",
          tabBarIcon: tabIcon("users", "person.2"),
        }}
      />
      <Tabs.Screen
        name="manutenzioni"
        options={{
          title: "Manutenzioni",
          tabBarIcon: tabIcon("tool", "wrench"),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
