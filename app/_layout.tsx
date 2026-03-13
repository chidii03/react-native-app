// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "react-native";
import { useEffect } from "react";
import "./global.css";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { TrialProvider, useTrial } from "../context/TrialContext";
import { ToastProvider } from "../components/Toast";
import { LocaleProvider } from "../context/LocaleContext";

function AppGuard() {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { trialExpired, trialLoading } = useTrial();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || trialLoading) return;

    const root = segments[0] as string | undefined;
    const inAuth = root === "(auth)";
    const inPaywall = root === "paywall";
    const inAdmin = root === "admin";
   

    if (isLoggedIn && inAuth) {
      router.replace("/");
      return;
    }

    if (trialExpired && !isLoggedIn && !inPaywall && !inAuth && !inAdmin) {
      router.replace("/paywall");
      return;
    }
  }, [isLoggedIn, authLoading, trialExpired, trialLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TrialProvider>
        <AuthProvider>
          <LocaleProvider>
            <ToastProvider>
              <Head>
                <title>Movie Time | Streaming - Watch All Movies</title>
                <link rel="icon" href="/assets/icons/logo.png" />
                <link rel="apple-touch-icon" href="/assets/icons/logo.png" />
                <meta
                  name="description"
                  content="Movie Time helps you discover, save, and stream trending movies with a fast, user-friendly experience."
                />
                <meta
                  name="keywords"
                  content="movie time, streaming movies, watch movies online, trending movies, movie discovery"
                />
                <meta property="og:title" content="Movie Time | Streaming - Watch All Movies" />
                <meta property="og:image" content="/assets/icons/logo.png" />
                <meta
                  property="og:description"
                  content="Discover trending movies, build your watchlist, and enjoy a smooth streaming experience."
                />
                <meta name="twitter:image" content="/assets/icons/logo.png" />
                <meta name="twitter:card" content="summary_large_image" />
              </Head>
              <AppGuard />
              <StatusBar barStyle="light-content" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                  contentStyle: { backgroundColor: "#0f0f12" },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
                <Stack.Screen name="(auth)" options={{ animation: "slide_from_bottom" }} />
                <Stack.Screen
                  name="movies/[id]"
                  options={{
                    animation: "slide_from_right",
                    contentStyle: { backgroundColor: "#0f0f12" },
                  }}
                />
                <Stack.Screen name="paywall" options={{ animation: "slide_from_bottom" }} />
                <Stack.Screen name="admin" options={{ animation: "fade" }} />
              </Stack>
            </ToastProvider>
          </LocaleProvider>
        </AuthProvider>
      </TrialProvider>
    </SafeAreaProvider>
  );
}
