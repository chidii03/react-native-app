// app/(tabs)/_layout.tsx

import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Platform, Animated,
  useWindowDimensions,
} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ── Design tokens ─────────────────────────────────────────────────────────────
const TAB_BG        = "#100825";       // deep purple-dark background
const ACTIVE_COLOR  = "#AB8BFF";       // purple accent
const INACTIVE_COLOR= "rgba(255,255,255,0.35)";
const RIPPLE_COLOR  = "rgba(171,139,255,0.18)";
const BORDER_COLOR  = "rgba(171,139,255,0.15)";

// ── Tab definitions ───────────────────────────────────────────────────────────
// Each tab has a filled icon (active) and an outline icon (inactive)
const TABS = [
  { name: "index",   title: "Home",    filled: "home",           outline: "home-outline"           },
  { name: "search",  title: "Search",  filled: "search",         outline: "search-outline"         },
  { name: "save",    title: "Saved",   filled: "bookmark",       outline: "bookmark-outline"       },
  { name: "profile", title: "Profile", filled: "person",         outline: "person-outline"         },
] as const;

// ── Animated tab icon with ripple ─────────────────────────────────────────────
const TabIcon = ({
  focused, filled, outline, title,
}: {
  focused:  boolean;
  filled:   string;
  outline:  string;
  title:    string;
}) => {
  // Ripple scale animation — expands when tab becomes active
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  // Icon scale — slight pop when focused
  const iconScale = useRef(new Animated.Value(1)).current;
  // Label opacity fade
  const labelOpacity = useRef(new Animated.Value(focused ? 1 : 0.5)).current;

  useEffect(() => {
    if (focused) {
      // Reset ripple
      rippleScale.setValue(0);
      rippleOpacity.setValue(1);

      // Ripple expands and fades — like Telegram's tab press
      Animated.parallel([
        Animated.timing(rippleScale, {
          toValue:         1,
          duration:        400,
          useNativeDriver: true,
        }),
        Animated.timing(rippleOpacity, {
          toValue:         0,
          duration:        400,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon pops up slightly
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
        Animated.spring(iconScale,  { toValue: 1.0, useNativeDriver: true, friction: 4 }),
      ]).start();

      // Label brightens
      Animated.timing(labelOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    } else {
      Animated.timing(labelOpacity, { toValue: 0.5, duration: 150, useNativeDriver: true }).start();
      Animated.timing(iconScale,    { toValue: 1.0, duration: 150, useNativeDriver: true }).start();
    }
  }, [focused]);

  return (
    <View style={T.iconWrap}>
      {/* Ripple circle — expands outward from center on tab press */}
      <Animated.View style={[
        T.ripple,
        {
          transform:  [{ scale: rippleScale }],
          opacity:    rippleOpacity,
        },
      ]} />

      {/* Active pill background — solid indicator */}
      {focused && <View style={T.activePill} />}

      {/* Icon */}
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons
          name={(focused ? filled : outline) as any}
          size={22}
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      </Animated.View>

      {/* Label — always visible, brightens on focus like TikTok */}
      <Animated.Text style={[T.label, { opacity: labelOpacity, color: focused ? ACTIVE_COLOR : INACTIVE_COLOR }]}>
        {title}
      </Animated.Text>
    </View>
  );
};

const T = StyleSheet.create({
  iconWrap: {
    flex: 1,
    alignItems:     "center",
    justifyContent: "center",
    paddingTop:     8,
    paddingBottom:  6,
    position:       "relative",
  },
  // Ripple circle — starts small at center, expands to 56px, fades out
  ripple: {
    position:        "absolute",
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: RIPPLE_COLOR,
  },
  // Subtle pill behind the active icon — always visible, doesn't animate
  activePill: {
    position:        "absolute",
    top:             4,
    width:           44,
    height:          32,
    borderRadius:    16,
    backgroundColor: "rgba(171,139,255,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(171,139,255,0.2)",
  },
  label: {
    fontSize:   10,
    fontWeight: "700",
    marginTop:  3,
    letterSpacing: 0.2,
  },
});

// ── Tabs Layout ───────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const { width } = useWindowDimensions();

  // Responsive: on very small screens reduce side margins
  const marginH   = width < 380 ? 12 : width < 480 ? 16 : 20;
  // Tab bar height — taller on web/tablet for easier clicking
  const tabH      = Platform.OS === "web" ? 64 : 62;
  // Bottom margin — accounts for home indicator on notched phones
  const marginB   = Platform.OS === "web" ? 20 : 24;

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,   // we render our own labels in TabIcon
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: {
          flex:           1,
          height:         "100%",
          justifyContent: "center",
          alignItems:     "center",
          paddingBottom:  0,
        },
        tabBarStyle: {
          backgroundColor:  TAB_BG,
          borderRadius:     999,     // fully pill-shaped
          marginHorizontal: marginH,
          marginBottom:     marginB,
          height:           tabH,
          position:         "absolute",
          overflow:         "hidden",
          borderWidth:      1,
          borderColor:      BORDER_COLOR,
          // Elevation shadow
          ...(Platform.OS === "android" ? { elevation: 24 } : {}),
          ...(Platform.OS === "ios"
            ? { shadowColor: "#AB8BFF", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 }
            : {}),
          ...(Platform.OS === "web"
            ? { boxShadow: "0 8px 32px rgba(171,139,255,0.25), 0 2px 8px rgba(0,0,0,0.6)" } as any
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