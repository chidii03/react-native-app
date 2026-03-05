// app/admin/_layout.tsx
import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index"    />
      <Stack.Screen name="sign-in"  />
      <Stack.Screen name="users"    />
      <Stack.Screen name="movies"   />
      <Stack.Screen name="analytics"/>
    </Stack>
  );
}