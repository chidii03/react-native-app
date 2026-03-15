// app/(tabs)/profile.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Image,
  Modal, TextInput, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { getSavedMovies } from "../../services/appwrite";
import { account } from "../../services/appwriteConfig";
import { uploadAvatarToCloudinary } from "../../services/cloudinary";
import { useLocale } from "../../context/LocaleContext";

const OWNER_EMAILS = ["chidiokwu795@gmail.com"];

const PLAN_DAYS: Record<string, number> = {
  monthly: 30,
  yearly:  365,
  free:    14,
};

const PREFS_TIMEOUT_MS = 5000;

const pickOAuthAvatar = (rawUser: any): string => {
  const candidates = [
    rawUser?.prefs?.avatar_url, rawUser?.prefs?.picture,
    rawUser?.prefs?.avatar, rawUser?.picture, rawUser?.avatar,
    rawUser?.avatarUrl, rawUser?.profilePicture,
  ];
  for (const c of candidates) {
    const v = String(c ?? "").trim();
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
  }
  return "";
};

const pickImageOnWeb = (): Promise<string | null> => {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    // If user closes without picking, input.onchange never fires.
    // We use a focus trick to detect cancellation.
    let resolved = false;
    const onFocus = () => {
      // Give the file dialog ~300ms to trigger onchange before resolving null
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(null); }
        window.removeEventListener("focus", onFocus);
      }, 500);
    };
    window.addEventListener("focus", onFocus, { once: true });
    input.onchange = () => {
      resolved = true;
      window.removeEventListener("focus", onFocus);
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload  = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
};

const pickImageOnMobile = async (useCamera: boolean): Promise<string | null> => {
  try {
    const IP = require("expo-image-picker");
    if (useCamera) {
      const perm = await IP.requestCameraPermissionsAsync();
      if (!perm.granted) return null;
      const r = await IP.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7 });
      if (r.canceled) return null;
      return String(r.assets?.[0]?.uri ?? "").trim() || null;
    } else {
      const perm = await IP.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return null;
      const mediaType = IP.MediaType?.Images ?? IP.MediaTypeOptions?.Images;
      const r = await IP.launchImageLibraryAsync({ mediaTypes: mediaType, allowsEditing: true, aspect: [1,1], quality: 0.7 });
      if (r.canceled) return null;
      return String(r.assets?.[0]?.uri ?? "").trim() || null;
    }
  } catch { return null; }
};

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("__TIMEOUT__")), ms))]);

const getSubProgress = (user: any, trialStartDate: string | null) => {
  const isSubscribed = user?.prefs?.subscribed === true;
  const planName     = String(user?.prefs?.plan ?? "free");
  const totalDays    = PLAN_DAYS[planName] ?? 14;
  const startIso     =
    user?.prefs?.subscribed_at ??
    user?.registration ??
    trialStartDate ??
    new Date().toISOString();
  const elapsed  = Math.floor((Date.now() - new Date(startIso).getTime()) / 86_400_000);
  const daysLeft = Math.max(0, totalDays - elapsed);
  const pct      = Math.min(1, elapsed / totalDays);
  return { isSubscribed, planName, totalDays, daysLeft, pct, expired: daysLeft === 0, startIso };
};

const AvatarCircle = ({ name, avatar, size = 84 }: { name: string; avatar?: string; size?: number }) => {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0,2).map(w => w[0]).join("").toUpperCase();
  return (
    <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]}
      style={{ width: size, height: size, borderRadius: size/2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {avatar
        ? <Image source={{ uri: avatar }} style={{ width: size, height: size }} resizeMode="cover" />
        : <Text style={{ color: "#0f0f12", fontWeight: "900", fontSize: size * 0.35 }}>{initials}</Text>}
    </LinearGradient>
  );
};

const StatChip = ({ icon, value, label }: { icon: any; value: string|number; label: string }) => (
  <View style={S.statChip}>
    <Ionicons name={icon} size={16} color="#AB8BFF" />
    <Text style={S.statVal}>{value}</Text>
    <Text style={S.statLbl}>{label}</Text>
  </View>
);

const MenuRow = ({ icon, label, sub, onPress, danger, rightText, last }: {
  icon: any; label: string; sub?: string; onPress: () => void;
  danger?: boolean; rightText?: string; last?: boolean;
}) => (
  <TouchableOpacity onPress={onPress}
    style={[S.menuRow, last && { borderBottomWidth: 0 }]} activeOpacity={0.7}>
    <View style={[S.menuIcon, { backgroundColor: danger ? "rgba(239,68,68,0.1)" : "rgba(171,139,255,0.1)" }]}>
      <Ionicons name={icon} size={18} color={danger ? "#ef4444" : "#AB8BFF"} />
    </View>
    <View style={{ flex: 1, marginLeft: 14 }}>
      <Text style={[S.menuLbl, danger && { color: "#ef4444" }]}>{label}</Text>
      {!!sub && <Text style={S.menuSub}>{sub}</Text>}
    </View>
    {rightText
      ? <Text style={S.menuRight}>{rightText}</Text>
      : <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.15)" />}
  </TouchableOpacity>
);

const EditNameModal = ({ visible, current, onClose, onSave }: {
  visible: boolean; current: string; onClose: () => void; onSave: (n: string) => Promise<void>;
}) => {
  const [val, setVal]   = useState(current);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { if (visible) setVal(current); }, [visible, current]);
  const save = async () => {
    const n = val.trim(); if (!n || n === current) { onClose(); return; }
    setBusy(true);
    try { await onSave(n); toast.success("Name updated!"); onClose(); }
    catch (e: any) { toast.error("Failed", e?.message ?? ""); }
    finally { setBusy(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={S.modalBox}>
          <Text style={S.modalTitle}>Edit Display Name</Text>
          <TextInput style={S.modalInput} value={val} onChangeText={setVal}
            placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.3)"
            autoFocus returnKeyType="done" onSubmitEditing={save} autoCapitalize="words"
            {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
          <View style={S.modalBtns}>
            <TouchableOpacity style={S.modalCancel} onPress={onClose}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.modalSave} onPress={save} disabled={busy}>
              {busy ? <ActivityIndicator size="small" color="#0f0f12" />
                : <Text style={{ color: "#0f0f12", fontWeight: "900" }}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const GuestView = () => {
  const router = useRouter();
  return (
    <View style={S.guestWrap}>
      <LinearGradient colors={["rgba(171,139,255,0.15)","rgba(171,139,255,0.03)"]} style={S.guestIcon}>
        <Ionicons name="person-outline" size={44} color="#AB8BFF" />
      </LinearGradient>
      <Text style={S.guestTitle}>Sign in to MovieTime</Text>
      <Text style={S.guestSub}>Save movies, build your watchlist and access your profile.</Text>
      <TouchableOpacity style={S.guestPrimary} onPress={() => router.push("/(auth)/sign-in")} activeOpacity={0.85}>
        <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={S.guestPrimaryIn}>
          <Ionicons name="log-in-outline" size={17} color="#0f0f12" />
          <Text style={S.guestPrimaryTxt}>Sign In</Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity style={S.guestSecondary} onPress={() => router.push("/(auth)/sign-up")} activeOpacity={0.85}>
        <Ionicons name="person-add-outline" size={15} color="#AB8BFF" />
        <Text style={S.guestSecondaryTxt}>Create Free Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const Profile = () => {
  const { user, isLoading, isLoggedIn, trialStartDate, logout, updateDisplayName } = useAuth();
  const toast  = useToast();
  const router = useRouter();
  const { t }  = useLocale();

  const [watchCount,  setWatchCount]  = useState(0);
  const [editModal,   setEditModal]   = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const [viewPhoto,   setViewPhoto]   = useState(false);
  const [avatarUrl,   setAvatarUrl]   = useState("");
  const [avatarDraft, setAvatarDraft] = useState("");
  // FIX: separate "picking" (waiting for user) from "uploading" (after image chosen)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  const [locale,       setLocale]       = useState("en-US");

  const isOwner = OWNER_EMAILS.includes((user?.email ?? "").toLowerCase().trim());

  useEffect(() => {
    if (isLoggedIn && user?.$id) {
      getSavedMovies(user.$id).then(d => setWatchCount(d.length)).catch(() => {});
    }
  }, [isLoggedIn, user?.$id]);

  useEffect(() => {
    const fromPrefs = String(user?.prefs?.avatar_url ?? "").trim();
    const fromOAuth = pickOAuthAvatar(user);
    setAvatarUrl(fromPrefs || fromOAuth);
    setAvatarDraft(fromPrefs || fromOAuth);
    setLocale(String(user?.prefs?.locale ?? "en-US"));
  }, [user?.$id]);

  const sub = getSubProgress(user, trialStartDate);

  // ── FIX: saveAvatar — optimistic update clears busy state immediately ────────
  const saveAvatar = useCallback(async (uri: string) => {
    if (!isLoggedIn || !uri) return;

    // 1. Show the new image IMMEDIATELY — no waiting
    setAvatarUrl(uri);
    setAvatarDraft(uri);
    // 2. Clear "uploading" spinner right after image switches
    setUploadStatus("idle");
    // 3. Close modal
    setAvatarModal(false);

    // 4. Persist in background — user sees result already
    let persistedUrl = uri;
    const isRemote = uri.startsWith("http://") || uri.startsWith("https://");

    if (!isRemote) {
      try {
        const uploaded = await uploadAvatarToCloudinary(uri);
        persistedUrl = uploaded.secureUrl;
        // Silently update to cloud URL
        setAvatarUrl(persistedUrl);
        setAvatarDraft(persistedUrl);
      } catch {
        // Keep local URI if Cloudinary not configured
      }
    }

    try {
      const merged = { ...(user?.prefs ?? {}), avatar_url: persistedUrl };
      await withTimeout(account.updatePrefs(merged as any), PREFS_TIMEOUT_MS);
      toast.success("Profile photo saved ✓");
    } catch (e: any) {
      if (String(e?.message ?? "").includes("__TIMEOUT__")) {
        toast.success("Photo saved (syncing in background)");
      } else {
        toast.error("Save failed", e?.message ?? "");
      }
    }
  }, [isLoggedIn, user]);

  // ── FIX: pickAvatar — only set uploading AFTER image is confirmed selected ───
  const pickAvatar = async (useCamera: boolean) => {
    // Don't set busy yet — wait until user actually picks something
    let uri: string | null = null;
    try {
      uri = Platform.OS === "web"
        ? await pickImageOnWeb()
        : await pickImageOnMobile(useCamera);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("expo-image-picker"))
        toast.error("Install required", "npx expo install expo-image-picker");
      else
        toast.error("Failed", msg || "Could not open picker");
      return;
    }

    // FIX: if user cancelled/dismissed — do nothing, stay on modal, no spinner
    if (!uri) return;

    // Only NOW set uploading (image was actually selected)
    setUploadStatus("uploading");
    await saveAvatar(uri);
    // saveAvatar clears uploadStatus to "idle" right after image shows
  };

  const runLogout = async () => {
    setLoggingOut(true);
    try { await logout(); toast.success("Signed out"); router.replace("/"); }
    catch (e: any) { toast.error("Sign out failed", String(e?.message ?? "")); }
    finally { setLoggingOut(false); }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={S.root}>
        <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
          <ActivityIndicator size="large" color="#AB8BFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.root}>
      <View style={S.header}>
        <Text style={S.headerTitle}>{t("profile","Profile")}</Text>
        {isLoggedIn && (
          <TouchableOpacity style={S.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="pencil-outline" size={16} color="#AB8BFF" />
          </TouchableOpacity>
        )}
      </View>

      {isLoggedIn && user && (
        <EditNameModal visible={editModal} current={user.name}
          onClose={() => setEditModal(false)} onSave={updateDisplayName} />
      )}

      {/* Full-screen photo viewer */}
      <Modal visible={viewPhoto} transparent animationType="fade" onRequestClose={() => setViewPhoto(false)}>
        <View style={S.photoViewOverlay}>
          <TouchableOpacity style={S.photoViewClose} onPress={() => setViewPhoto(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={S.photoViewImg} resizeMode="contain" />
            : <View style={[S.photoViewImg, { alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="person-outline" size={80} color="rgba(171,139,255,0.4)" />
              </View>}
        </View>
      </Modal>

      {/* Avatar picker modal */}
      <Modal visible={avatarModal} transparent animationType="fade"
        onRequestClose={() => { setUploadStatus("idle"); setAvatarModal(false); }}>
        <View style={S.overlay}>
          <View style={S.modalBox}>
            <Text style={S.modalTitle}>Profile Photo</Text>

            {/* Tappable preview → full-screen view */}
            <TouchableOpacity
              onPress={() => { setAvatarModal(false); setViewPhoto(true); }}
              style={S.previewWrap} activeOpacity={0.85}>
              <AvatarCircle name={user?.name ?? "?"} avatar={avatarDraft} size={100} />
              {!!avatarDraft && (
                <View style={S.previewViewBadge}>
                  <Ionicons name="expand-outline" size={11} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>View</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* FIX: only show spinner when uploadStatus === "uploading" */}
            {uploadStatus === "uploading" ? (
              <View style={S.uploadingRow}>
                <ActivityIndicator size="small" color="#AB8BFF" />
                <Text style={S.uploadingTxt}>Uploading…</Text>
              </View>
            ) : (
              <View style={S.photoOptions}>
                {Platform.OS !== "web" && (
                  <TouchableOpacity style={S.photoOptionBtn} onPress={() => pickAvatar(true)} activeOpacity={0.8}>
                    <View style={S.photoOptionIcon}>
                      <Ionicons name="camera-outline" size={20} color="#AB8BFF" />
                    </View>
                    <Text style={S.photoOptionTxt}>Camera</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={S.photoOptionBtn} onPress={() => pickAvatar(false)} activeOpacity={0.8}>
                  <View style={S.photoOptionIcon}>
                    <Ionicons name="images-outline" size={20} color="#AB8BFF" />
                  </View>
                  <Text style={S.photoOptionTxt}>{Platform.OS === "web" ? "Choose File" : "Gallery"}</Text>
                </TouchableOpacity>
                {/* Google Photo — always visible, always fetches latest from Google */}
                <TouchableOpacity style={S.photoOptionBtn}
                  onPress={async () => {
                    setUploadStatus("uploading");
                    try {
                      // First try to refetch from Google OAuth identities
                      // Use the already-imported account from top of file (no require needed)
                      let googlePic: string | null = null;
                      try {
                        const identities = await Promise.race([
                          (account as any).listIdentities(),
                          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
                        ]) as any;
                        const googleId = (identities?.identities ?? []).find((id: any) => id.provider === "google");
                        if (googleId?.providerAccessToken) {
                          const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${googleId.providerAccessToken}`);
                          if (res.ok) { const d = await res.json(); googlePic = d?.picture ?? null; }
                        }
                      } catch {}
                      // Fallback to whatever is cached in prefs
                      if (!googlePic) googlePic = pickOAuthAvatar(user);
                      if (googlePic) {
                        await saveAvatar(googlePic);
                      } else {
                        setUploadStatus("idle");
                        toast.error("No Google photo found", "Sign in with Google to sync your photo.");
                      }
                    } catch (e: any) {
                      setUploadStatus("idle");
                      toast.error("Failed", e?.message ?? "Could not fetch Google photo");
                    }
                  }}
                  activeOpacity={0.8}>
                  <View style={S.photoOptionIcon}>
                    <Ionicons name="logo-google" size={20} color="#AB8BFF" />
                  </View>
                  <Text style={S.photoOptionTxt}>Google Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FIX: wider cancel button */}
            <TouchableOpacity
              style={S.modalCancelWide}
              onPress={() => { setUploadStatus("idle"); setAvatarModal(false); }}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "700", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!isLoggedIn ? <GuestView /> : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Hero */}
          <LinearGradient colors={["rgba(171,139,255,0.12)","rgba(171,139,255,0.02)"]} style={S.hero}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setAvatarModal(true)}>
              <AvatarCircle name={user?.name ?? "?"} avatar={avatarUrl} />
              <View style={S.avatarEditBadge}>
                <Ionicons name="camera" size={11} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={S.heroName}>{user?.name ?? "Movie Fan"}</Text>
            <Text style={S.heroEmail}>{user?.email ?? ""}</Text>

            <View style={S.badgeRow}>
              <View style={[S.badge, { backgroundColor: user?.emailVerification ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.07)" }]}>
                <Ionicons name={user?.emailVerification ? "checkmark-circle" : "time-outline"} size={12}
                  color={user?.emailVerification ? "#4ade80" : "rgba(255,255,255,0.4)"} />
                <Text style={[S.badgeTxt, { color: user?.emailVerification ? "#4ade80" : "rgba(255,255,255,0.35)" }]}>
                  {user?.emailVerification ? "Verified" : "Not verified"}
                </Text>
              </View>
              {isOwner && (
                <View style={[S.badge, { backgroundColor: "rgba(171,139,255,0.15)", marginLeft: 6 }]}>
                  <Ionicons name="shield-checkmark" size={12} color="#AB8BFF" />
                  <Text style={[S.badgeTxt, { color: "#AB8BFF" }]}>CEO · Free Access</Text>
                </View>
              )}
            </View>

            <View style={S.statsRow}>
              <StatChip icon="bookmark" value={watchCount} label="Saved" />
              <View style={S.statDivider} />
              <StatChip
                icon={isOwner ? "shield-checkmark" : sub.isSubscribed ? "diamond-outline" : "gift-outline"}
                value={isOwner ? "∞" : sub.daysLeft}
                label={isOwner ? "Access" : "Days left"} />
              <View style={S.statDivider} />
              <StatChip
                icon="star-outline"
                value={isOwner ? "Owner" : sub.isSubscribed ? (sub.planName === "yearly" ? "Yearly" : "Monthly") : "Trial"}
                label="Plan" />
            </View>
          </LinearGradient>

          {/* Subscription progress bar — hidden for CEO */}
          {!isOwner && (
            <View style={S.section}>
              <View style={S.trialCard}>
                <View style={S.trialHead}>
                  <View style={S.trialIcon}>
                    <Ionicons
                      name={sub.isSubscribed ? "diamond-outline" : "gift-outline"}
                      size={16}
                      color={sub.expired ? "#ef4444" : "#AB8BFF"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.trialTitle}>
                      {sub.expired
                        ? (sub.isSubscribed ? "Subscription Expired" : "Free Trial Ended")
                        : sub.isSubscribed
                          ? `${sub.daysLeft} days left — ${sub.planName === "yearly" ? "Yearly" : "Monthly"} Plan`
                          : `${sub.daysLeft} days left on free trial`}
                    </Text>
                    <Text style={S.trialSub}>
                      {sub.expired
                        ? "Upgrade to keep full access"
                        : `Started ${new Date(sub.startIso).toLocaleDateString()} · ${sub.totalDays} day plan`}
                    </Text>
                  </View>
                  {sub.isSubscribed && !sub.expired && (
                    <View style={S.activePill}>
                      <View style={S.activeDot} />
                      <Text style={S.activeTxt}>Active</Text>
                    </View>
                  )}
                </View>

                <View style={S.trialBar}>
                  <View style={[S.trialFill, {
                    width: `${Math.round(sub.pct * 100)}%` as any,
                    backgroundColor: sub.expired
                      ? "#ef4444"
                      : sub.pct > 0.8 ? "#AB8BFF" : "#AB8BFF",
                  }]} />
                </View>
                <Text style={S.progressLabel}>
                  {Math.round(sub.pct * 100)}% used · {sub.daysLeft} days remaining
                </Text>

                {sub.expired && (
                  <TouchableOpacity style={S.upgradeBtn} onPress={() => router.push("/paywall")} activeOpacity={0.85}>
                    <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x:0,y:0 }} end={{ x:1,y:0 }} style={S.upgradeBtnIn}>
                      <Ionicons name="diamond-outline" size={15} color="#0f0f12" />
                      <Text style={S.upgradeBtnTxt}>
                        {sub.isSubscribed ? "Renew Subscription" : "Upgrade to Premium"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Content */}
          <View style={S.section}>
            <Text style={S.sectionLbl}>{t("my_content","MY CONTENT")}</Text>
            <View style={S.menuCard}>
              <MenuRow icon="bookmark-outline" label={t("my_watchlist","My Watchlist")}
                sub={`${watchCount} movie${watchCount !== 1 ? "s" : ""} saved`}
                onPress={() => router.push("/(tabs)/save")} />
              <MenuRow icon="film-outline" label={t("discover_movies","Discover Movies")}
                sub={t("browse_all_genres","Browse all genres")}
                onPress={() => router.push("/")} last />
            </View>
          </View>

          {/* Account */}
          <View style={S.section}>
            <Text style={S.sectionLbl}>{t("account","ACCOUNT")}</Text>
            <View style={S.menuCard}>
              <MenuRow icon="camera-outline" label={t("profile_photo","Profile Photo")}
                sub={avatarUrl ? "Tap to change or view photo" : "Upload profile photo"}
                onPress={() => setAvatarModal(true)} />
              <MenuRow icon="person-outline" label={t("display_name","Display Name")}
                sub={user?.name ?? ""} onPress={() => setEditModal(true)} />
              <MenuRow icon="mail-outline" label={t("email_address","Email Address")}
                sub={user?.email ?? ""} onPress={() => {}} />
              <MenuRow icon="lock-closed-outline" label={t("change_password","Change Password")}
                sub="Send reset link to your email"
                onPress={() => router.push("/(auth)/forgot")} last />
            </View>
          </View>

          {/* App */}
          <View style={S.section}>
            <Text style={S.sectionLbl}>{t("app","APP")}</Text>
            <View style={S.menuCard}>
              <MenuRow icon="information-circle-outline" label="Version" rightText="1.0.0" onPress={() => {}} />
              <MenuRow icon="globe-outline" label="Language" rightText={locale}
                onPress={() => router.push("/settings/language" as any)} />
              <MenuRow icon="shield-checkmark-outline" label="Privacy Policy"
                onPress={() => router.push("/legal/privacy" as any)} />
              <MenuRow icon="document-text-outline" label="Terms of Service"
                onPress={() => router.push("/legal/terms" as any)} />
              <MenuRow icon="help-circle-outline" label="Help Center"
                onPress={() => router.push("/help" as any)} />
              <MenuRow icon="chatbubble-ellipses-outline" label="Contact Support"
                onPress={() => router.push("/support" as any)} />
              <MenuRow icon="briefcase-outline" label="Careers"
                onPress={() => router.push("/careers" as any)} last />
            </View>
          </View>

          {/* Sign out */}
          <View style={[S.section, { marginBottom: 8 }]}>
            <View style={S.menuCard}>
              <MenuRow icon="log-out-outline" label="Sign Out"
                sub="You can sign back in anytime"
                onPress={() => setLogoutModal(true)} danger last />
            </View>
          </View>
        </ScrollView>
      )}

      {loggingOut && (
        <View style={S.loggingOutOverlay}><ActivityIndicator size="large" color="#AB8BFF" /></View>
      )}

      {/* Logout confirm modal */}
      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <View style={S.overlay}>
          <View style={S.modalBox}>
            <Text style={S.modalTitle}>Sign Out</Text>
            <Text style={S.modalHint}>Are you sure you want to sign out?</Text>
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.modalCancel} onPress={() => setLogoutModal(false)}>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.modalDanger}
                onPress={async () => { setLogoutModal(false); await runLogout(); }}
                disabled={loggingOut}>
                <Text style={{ color: "#fff", fontWeight: "900" }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;

const S = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#0f0f12" },
  header:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle:       { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  editBtn:           { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(171,139,255,0.12)", borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", alignItems: "center", justifyContent: "center" },
  hero:              { alignItems: "center", padding: 28, paddingBottom: 22, marginHorizontal: 20, marginTop: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(171,139,255,0.15)" },
  avatarEditBadge:   { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: "#AB8BFF", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0f0f12" },
  heroName:          { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 14, marginBottom: 4 },
  heroEmail:         { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", marginBottom: 10 },
  badgeRow:          { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 18, gap: 6 },
  badge:             { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeTxt:          { fontSize: 12, fontWeight: "700" },
  statsRow:          { flexDirection: "row", alignItems: "center", width: "100%" },
  statDivider:       { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.08)" },
  statChip:          { flex: 1, alignItems: "center", gap: 4 },
  statVal:           { color: "#fff", fontWeight: "900", fontSize: 16 },
  statLbl:           { color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center" },
  section:           { paddingHorizontal: 20, marginTop: 22 },
  sectionLbl:        { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 },
  trialCard:         { backgroundColor: "rgba(171,139,255,0.07)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(171,139,255,0.15)", padding: 16 },
  trialHead:         { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  trialIcon:         { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(171,139,255,0.12)", alignItems: "center", justifyContent: "center" },
  trialTitle:        { color: "#fff", fontWeight: "800", fontSize: 14 },
  trialSub:          { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 },
  activePill:        { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(74,222,128,0.12)", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  activeDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  activeTxt:         { color: "#4ade80", fontSize: 10, fontWeight: "800" },
  trialBar:          { height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  trialFill:         { height: 8, borderRadius: 4 },
  progressLabel:     { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "right" },
  upgradeBtn:        { marginTop: 14, borderRadius: 12, overflow: "hidden" },
  upgradeBtnIn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  upgradeBtnTxt:     { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
  menuCard:          { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  menuRow:           { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  menuIcon:          { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLbl:           { color: "#fff", fontSize: 15, fontWeight: "700" },
  menuSub:           { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 },
  menuRight:         { color: "#AB8BFF", fontWeight: "700", fontSize: 13 },
  guestWrap:         { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  guestIcon:         { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  guestTitle:        { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center" },
  guestSub:          { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 22 },
  guestPrimary:      { width: "100%", borderRadius: 14, overflow: "hidden" },
  guestPrimaryIn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  guestPrimaryTxt:   { color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  guestSecondary:    { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 13, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)" },
  guestSecondaryTxt: { color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
  overlay:           { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox:          { width: "100%", maxWidth: 380, backgroundColor: "#1a0a2e", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", alignItems: "center" },
  modalTitle:        { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 16, alignSelf: "flex-start" },
  modalInput:        { width: "100%", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  modalHint:         { color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 12, alignSelf: "flex-start" },
  modalBtns:         { flexDirection: "row", gap: 10, width: "100%" },
  modalCancel:       { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  // FIX: wider cancel button for the avatar modal
  modalCancelWide:   { width: "100%", alignItems: "center", paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", marginTop: 4 },
  modalSave:         { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#AB8BFF" },
  modalDanger:       { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#ef4444" },
  previewWrap:       { alignItems: "center", marginBottom: 20, position: "relative" },
  previewViewBadge:  { position: "absolute", bottom: 2, right: "16%", flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.72)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  uploadingRow:      { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 18 },
  uploadingTxt:      { color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "600" },
  photoOptions:      { flexDirection: "row", gap: 16, marginBottom: 16, flexWrap: "wrap", justifyContent: "center" },
  photoOptionBtn:    { alignItems: "center", gap: 7 },
  photoOptionIcon:   { width: 54, height: 54, borderRadius: 16, backgroundColor: "rgba(171,139,255,0.12)", borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", alignItems: "center", justifyContent: "center" },
  photoOptionTxt:    { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700" },
  photoViewOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  photoViewClose:    { position: "absolute", top: 56, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  photoViewImg:      { width: 280, height: 280, borderRadius: 140, overflow: "hidden" },
  loggingOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});