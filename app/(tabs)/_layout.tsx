// // app/(tabs)/_layout.tsx

import React, { useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, Platform, Animated,
  Pressable, useWindowDimensions,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ── Tokens ────────────────────────────────────────────────────────────────────
const TAB_BG         = "#100825";
const ACTIVE_COLOR   = "#AB8BFF";
const INACTIVE_COLOR = "rgba(255,255,255,0.38)";
const PRESS_COLOR    = "rgba(255,255,255,0.12)";   // neutral press flash

const TABS = [
  { name: "index",   title: "Home",    filled: "home",     outline: "home-outline"     },
  { name: "search",  title: "Search",  filled: "search",   outline: "search-outline"   },
  { name: "save",    title: "Saved",   filled: "bookmark", outline: "bookmark-outline" },
  { name: "profile", title: "Profile", filled: "person",   outline: "person-outline"   },
] as const;

// ── Single tab icon ───────────────────────────────────────────────────────────
const TabIcon = ({
  focused, filled, outline, title,
}: {
  focused: boolean;
  filled:  string;
  outline: string;
  title:   string;
}) => {
  // Press-flash overlay: starts opaque, fades out quickly — disappears completely
  const flashOpacity = useRef(new Animated.Value(0)).current;
  // Icon tiny bounce on focus
  const iconScale    = useRef(new Animated.Value(1)).current;

  // Trigger the flash whenever this tab becomes active
  useEffect(() => {
    if (focused) {
      // Instant appear, then fade out
      flashOpacity.setValue(1);
      Animated.timing(flashOpacity, {
        toValue:         0,
        duration:        280,
        useNativeDriver: true,
      }).start();

      // Small pop
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
        Animated.spring(iconScale,  { toValue: 1,    useNativeDriver: true, friction: 5  }),
      ]).start();
    } else {
      Animated.timing(iconScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    }
  }, [focused]);

  return (
    <View style={T.wrap}>
      {/* ── Press flash circle — neutral white, fades out completely ── */}
      <Animated.View style={[T.flash, { opacity: flashOpacity }]} />

      {/* ── Icon ── */}
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons
          name={(focused ? filled : outline) as any}
          size={22}
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      </Animated.View>

      {/* ── Label ── */}
      <Text
        style={[
          T.label,
          { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
            fontWeight: focused ? "700" : "500" },
        ]}
        numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
};

const T = StyleSheet.create({
  wrap: {
    alignItems:     "center",
    justifyContent: "center",
    // No fixed height — let the tab bar height drive it
    paddingTop:     6,
    paddingBottom:  5,
    gap:            3,
  },
  // Transient press circle — NOT a persistent border/badge
  // Sits exactly behind the icon, same size, fully rounded
  flash: {
    position:        "absolute",
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: PRESS_COLOR,
  },
  label: {
    fontSize:      10,
    letterSpacing: 0.15,
    lineHeight:    13,
  },
});

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const { width } = useWindowDimensions();

  const marginH = width < 380 ? 10 : width < 480 ? 14 : 18;
  // Compact height — just enough for 22px icon + 13px label + padding
  const tabH    = Platform.OS === "web" ? 60 : 56;
  const marginB = Platform.OS === "web" ? 18 : 20;

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel:     false,   // we render our own label
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          flex:           1,
          alignItems:     "center",
          justifyContent: "center",
          // Remove any extra top/bottom inset the OS adds
          paddingTop:     0,
          paddingBottom:  0,
          height:         "100%",
        },
        tabBarStyle: {
          backgroundColor:  TAB_BG,
          borderRadius:     999,
          marginHorizontal: marginH,
          marginBottom:     marginB,
          height:           tabH,
          position:         "absolute",
          overflow:         "hidden",
          borderWidth:      1,
          borderColor:      "rgba(171,139,255,0.18)",
          // Shadows
          ...(Platform.OS === "android" ? { elevation: 20 } : {}),
          ...(Platform.OS === "ios"
            ? { shadowColor: "#6D28D9", shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3, shadowRadius: 18 }
            : {}),
          ...(Platform.OS === "web"
            ? { boxShadow: "0 6px 28px rgba(109,40,217,0.28), 0 2px 6px rgba(0,0,0,0.55)" } as any
            : {}),
        },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title:       tab.title,
            headerShown: false,
            tabBarIcon:  ({ focused }) => (
              <TabIcon
                focused={focused}
                filled={tab.filled}
                outline={tab.outline}
                title={tab.title}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}