// components/SearchBar.tsx
import { Image, View, TextInput, Platform, StyleSheet } from "react-native";
import React from "react";
import { icons } from "../constants/icons";

interface Props {
  placeholder:    string;
  onPress?:       () => void;
  value?:         string;
  onChangeText?:  (text: string) => void;
}

const SearchBar = ({ placeholder, onPress, value, onChangeText }: Props) => {
  return (
    <View className="flex-row items-center bg-dark-200 rounded-full px-5 py-4">
      <Image
        source={icons.search}
        className="size-5"
        resizeMode="contain"
        tintColor="#ab8bff"
      />
      <TextInput
        onPress={onPress}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#a8b5db"
        className="flex-1 ml-2 text-white"
        // ── KEY FIX: removes the white browser focus outline on web ──────────
        style={Platform.OS === "web" ? (S.webInput as any) : undefined}
      />
    </View>
  );
};

const S = StyleSheet.create({
  webInput: {
    // Cast to any — outlineStyle "none" is valid CSS but RN types don't include it
    outlineStyle: "none" as any,
    outlineWidth: 0,
  },
});

export default SearchBar;