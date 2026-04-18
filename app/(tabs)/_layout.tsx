// app/(tabs)/_layout.tsx
import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Platform, Animated,
  useWindowDimensions,
} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TAB_BG         = "#100825";
const ACTIVE_COLOR   = "#AB8BFF";
const INACTIVE_COLOR = "rgba(255,255,255,0.38)";
const PRESS_COLOR    = "rgba(255,255,255,0.10)";

const TABS = [
  { name: "index",   title: "Home",    filled: "home",     outline: "home-outline"     },
  { name: "search",  title: "Search",  filled: "search",   outline: "search-outline"   },
  { name: "save",    title: "Saved",   filled: "bookmark", outline: "bookmark-outline" },
  { name: "profile", title: "Profile", filled: "person",   outline: "person-outline"   },
] as const;

// ── Tab icon with OPay-style press feedback ───────────────────────────────────
const TabIcon = ({
  focused, filled, outline, title,
}: {
  focused: boolean;
  filled:  string;
  outline: string;
  title:   string;
}) => {
  const flashScale   = useRef(new Animated.Value(0.6)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const iconScale    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      // Reset
      flashScale.setValue(0.6);
      flashOpacity.setValue(0.9);

      // OPay effect: circle grows from 60% → 100%, opacity fades 0.9 → 0
      Animated.parallel([
        Animated.timing(flashScale, {
          toValue: 1, duration: 320, useNativeDriver: true,
        }),
        Animated.timing(flashOpacity, {
          toValue: 0, duration: 320, useNativeDriver: true,
        }),
      ]).start();

      // Tiny icon pop
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.18, duration: 90,  useNativeDriver: true }),
        Animated.spring(iconScale,  { toValue: 1,    friction: 5,   useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  return (
    // OUTER: full height of tab bar, centers content perfectly
    <View style={T.outer}>
      {/* INNER: tight pill that holds icon + label, creates OPay padding around icon */}
      <View style={T.inner}>
        {/* Flash circle — lives behind icon, same bounding box as inner */}
        <Animated.View style={[
          T.flash,
          { transform: [{ scale: flashScale }], opacity: flashOpacity },
        ]} />

        {/* Icon */}
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons
            name={(focused ? filled : outline) as any}
            size={21}
            color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
          />
        </Animated.View>

        {/* Label */}
        <Text style={[T.label, { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR,
          fontWeight: focused ? "700" : "500" }]}
          numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
};

const T = StyleSheet.create({
  // Fills the full tab slot — flex centering keeps inner perfectly centred
  outer: {
    flex: 1,
    alignItems:     "center",
    justifyContent: "center",
    // KEY: explicit paddingVertical keeps the inner away from the pill border
    paddingVertical: 8,
  },
  // Tight container around icon + label — OPay-style pill padding
  inner: {
    alignItems:     "center",
    justifyContent: "center",
    // Horizontal padding gives OPay breathing room between icon and border sides
    paddingHorizontal: 14,
    paddingVertical:   6,
    gap: 3,
  },
  // Flash circle — sized to wrap the icon comfortably, not the full tab width
  flash: {
    position:        "absolute",
    width:           46,
    height:          46,
    borderRadius:    23,
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

  const marginH = width < 360 ? 8 : width < 420 ? 12 : width < 480 ? 16 : 20;
  // HEIGHT: icon 21 + label 13 + gap 3 + paddingV 6*2 + outerV 8*2 = 64
  // Keep explicit so the pill never clips the content
  const tabH    = 62;
  const marginB = Platform.OS === "web" ? 18 : 22;

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel:      false,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          flex:           1,
          alignItems:     "center",
          justifyContent: "center",
          // Zero out default OS insets — we control padding in TabIcon
          paddingTop:     0,
          paddingBottom:  0,
          marginTop:      0,
          marginBottom:   0,
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
          borderColor:      "rgba(171,139,255,0.20)",
          // No extra padding that would shift icons toward top
          paddingTop:       0,
          paddingBottom:    0,
          ...(Platform.OS === "android" ? { elevation: 20 } : {}),
          ...(Platform.OS === "ios"
            ? { shadowColor: "#6D28D9", shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.30, shadowRadius: 16 }
            : {}),
          ...(Platform.OS === "web"
            ? { boxShadow: "0 6px 28px rgba(109,40,217,0.25), 0 2px 6px rgba(0,0,0,0.5)" } as any
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