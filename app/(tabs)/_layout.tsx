// app/(tabs)/_layout.tsx
import { Text, Image, ImageBackground, StatusBar, View, Platform } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { images } from "../../constants/images";
import { icons }  from "../../constants/icons";
import { useLocale } from "../../context/LocaleContext";
import { SafeAreaView } from "react-native-safe-area-context";

const BG_PRIMARY = "#0f0D23";

const TabIcon = ({ focused, icon, title }: {
  focused: boolean;
  icon:    any;
  title:   string;
}) => {
  if (focused) {
    return (
      <ImageBackground
        source={images.highlight}
        className="flex flex-row w-full flex-1 min-w-[112px] min-h-11 mt-4 mb-4 justify-center items-center rounded-full overflow-hidden"
      >
        <Image source={icon} tintColor="#151312" className="size-5" />
        <Text className="text-secondary text-base font-semibold ml-2">{title}</Text>
      </ImageBackground>
    );
  }
  return (
    <View className="size-full justify-center items-center mt-4 rounded-full">
      <Image source={icon} tintColor="#A8B5DB" className="size-5" />
    </View>
  );
};

const TabsLayout = () => {
  const { t } = useLocale();
  return (
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarItemStyle: {
            width:          "100%",
            height:         "100%",
            justifyContent: "center",
            alignItems:     "center",
          },
          tabBarStyle: {
            backgroundColor: BG_PRIMARY,
            borderRadius:    50,
            marginHorizontal: 20,
            marginBottom:    36,
            height:          52,
            position:        "absolute",
            overflow:        "hidden",
            borderWidth:     1,
            borderColor:     BG_PRIMARY,
            ...(Platform.OS === "web"
              ? { boxShadow: "0 -2px 24px rgba(10,0,30,0.9)" } as any
              : {}),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title:       t("home", "Home"),
            headerShown: false,
            tabBarIcon:  ({ focused }) => (
              <TabIcon focused={focused} icon={icons.home} title={t("home", "Home")} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title:       t("search", "Search"),
            headerShown: false,
            tabBarIcon:  ({ focused }) => (
              <TabIcon focused={focused} icon={icons.search} title={t("search", "Search")} />
            ),
          }}
        />
        <Tabs.Screen
          name="save"
          options={{
            title:       t("save", "Save"),
            headerShown: false,
            tabBarIcon:  ({ focused }) => (
              <TabIcon focused={focused} icon={icons.save} title={t("save", "Save")} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title:       t("profile", "Profile"),
            headerShown: false,
            tabBarIcon:  ({ focused }) => (
              <TabIcon focused={focused} icon={icons.person} title={t("profile", "Profile")} />
            ),
          }}
        />
      </Tabs>
  );
};

export default TabsLayout;