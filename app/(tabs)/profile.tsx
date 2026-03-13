// app/(tabs)/profile.tsx
import React, { useState, useEffect } from "react";
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

const TRIAL_DAYS = 14;
const PREFS_TIMEOUT_MS = 7000;

const pickOAuthAvatar = (rawUser: any): string => {
  const candidates = [
    rawUser?.prefs?.avatar_url,
    rawUser?.prefs?.picture,
    rawUser?.prefs?.avatar,
    rawUser?.picture,
    rawUser?.avatar,
    rawUser?.avatarUrl,
    rawUser?.profilePicture,
  ];
  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
  }
  return "";
};

const pickImageOnWeb = async (): Promise<string | null> => {
  if (typeof document === "undefined") return null;
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
};

const pickImageOnMobile = async (): Promise<string | null> => {
  try {
    const ImagePicker = require("expo-image-picker");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return null;
    const mediaImages = ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions?.Images;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaImages,
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });
    if (result.canceled) return null;
    return String(result.assets?.[0]?.uri ?? "").trim() || null;
  } catch {
    return null;
  }
};

const getTrialInfo = (iso: string | null) => {
  if (!iso) return { daysLeft: TRIAL_DAYS, pct: 0, expired: false };
  const elapsed = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  const daysLeft = Math.max(0, TRIAL_DAYS - elapsed);
  return { daysLeft, pct: Math.min(1, elapsed / TRIAL_DAYS), expired: daysLeft === 0 };
};

// ─────────────────────────────────────────────────────────────────────────────
const AvatarCircle = ({ name, avatar, size = 84 }: { name: string; avatar?: string; size?: number }) => {
  const initials = (name || "?").split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ color: "#0f0f12", fontWeight: "900", fontSize: size * 0.35 }}>{initials}</Text>
      )}
    </LinearGradient>
  );
};

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("__PREF_TIMEOUT__")), ms)),
  ]);

const StatChip = ({ icon, value, label }: { icon: any; value: string | number; label: string }) => (
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
    const n = val.trim();
    if (!n || n === current) { onClose(); return; }
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
            autoFocus returnKeyType="done" onSubmitEditing={save}
            autoCapitalize="words"
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

// ─────────────────────────────────────────────────────────────────────────────
// Guest view (when NOT signed in)
const GuestView = () => {
  const router = useRouter();
  return (
    <View style={S.guestWrap}>
      <LinearGradient colors={["rgba(171,139,255,0.15)","rgba(171,139,255,0.03)"]}
        style={S.guestIcon}>
        <Ionicons name="person-outline" size={44} color="#AB8BFF" />
      </LinearGradient>
      <Text style={S.guestTitle}>Sign in to MovieTime</Text>
      <Text style={S.guestSub}>
        Save movies, build your watchlist and access your profile from any device.
      </Text>
      <TouchableOpacity style={S.guestPrimary} onPress={() => router.push("/(auth)/sign-in")} activeOpacity={0.85}>
        <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.guestPrimaryIn}>
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

// ─────────────────────────────────────────────────────────────────────────────
// Main profile screen
const Profile = () => {
  const { user, isLoading, isLoggedIn, trialStartDate, logout, updateDisplayName } = useAuth();
  const toast  = useToast();
  const router = useRouter();
  const { t } = useLocale();

  const [watchCount, setWatchCount]   = useState(0);
  const [editModal, setEditModal]     = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl]     = useState("");
  const [avatarDraft, setAvatarDraft] = useState("");
  const [avatarBusy, setAvatarBusy]   = useState(false);
  const [locale, setLocale]           = useState("en-US");

  useEffect(() => {
    if (isLoggedIn && user?.$id) {
      getSavedMovies(user.$id)
        .then(docs => setWatchCount(docs.length))
        .catch(() => {});
    }
  }, [isLoggedIn, user?.$id]);

  useEffect(() => {
    const fromPrefs = String(user?.prefs?.avatar_url ?? "").trim();
    const fromOAuth = pickOAuthAvatar(user);
    const nextAvatar = fromPrefs || fromOAuth;
    setAvatarUrl(nextAvatar);
    setAvatarDraft(nextAvatar);
    setLocale(String(user?.prefs?.locale ?? "en-US"));
  }, [user?.$id]);

  const trial = getTrialInfo(trialStartDate);

  const runLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      console.log("[Profile] Sign out successful");
      toast.success("Signed out");
      router.replace("/");
    } catch (e: any) {
      console.error("[Profile] Sign out failed:", e?.code, e?.message);
      toast.error("Sign out failed", String(e?.message ?? ""));
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    setLogoutModal(true);
  };

  const saveAvatar = async (next: string) => {
    if (!isLoggedIn) return;
    const normalized = String(next ?? "").trim();
    if (!normalized) return;

    let persistedUrl = normalized;
    const isRemoteUrl = normalized.startsWith("http://") || normalized.startsWith("https://");

    if (!isRemoteUrl) {
      try {
        const uploaded = await uploadAvatarToCloudinary(normalized);
        persistedUrl = uploaded.secureUrl;
      } catch {
        // Fallback when Cloudinary is not yet configured.
        persistedUrl = normalized;
      }
    }

    setAvatarUrl(persistedUrl);
    setAvatarDraft(persistedUrl);
    setAvatarModal(false);

    const merged = { ...(user?.prefs ?? {}), avatar_url: persistedUrl };
    try {
      await withTimeout(account.updatePrefs(merged as any), PREFS_TIMEOUT_MS);
      toast.success("Profile photo saved");
    } catch {
      if (!isRemoteUrl) {
        toast.success("Photo saved on this device. Add Cloudinary keys to sync after sign-out.");
        return;
      }
      throw new Error("Unable to save avatar to account preferences");
    }
  };

  const pickAvatarFromDevice = async () => {
    setAvatarBusy(true);
    try {
      const uri = Platform.OS === "web" ? await pickImageOnWeb() : await pickImageOnMobile();
      if (!uri) {
        toast.error("No image selected", "Please pick an image from your gallery.");
        return;
      }
      setAvatarDraft(uri);
      await saveAvatar(uri);
    } catch (e: any) {
      const message = String(e?.message ?? "");
      if (message.includes("expo-image-picker")) {
        toast.error("Install required", "Run: npx expo install expo-image-picker");
      } else {
        toast.error("Failed", message || "Could not upload profile image");
      }
    } finally {
      setAvatarBusy(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={S.root}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#AB8BFF" />
          <Text style={{ color: "rgba(255,255,255,0.3)", marginTop: 12 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.root}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.headerTitle}>{t("profile", "Profile")}</Text>
        {isLoggedIn && (
          <TouchableOpacity style={S.editBtn} onPress={() => setEditModal(true)}>
            <Ionicons name="pencil-outline" size={16} color="#AB8BFF" />
          </TouchableOpacity>
        )}
      </View>

      {isLoggedIn && user && (
        <EditNameModal
          visible={editModal}
          current={user.name}
          onClose={() => setEditModal(false)}
          onSave={updateDisplayName}
        />
      )}

      {!isLoggedIn ? (
        <GuestView />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Hero */}
          <LinearGradient colors={["rgba(171,139,255,0.12)","rgba(171,139,255,0.02)"]} style={S.hero}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setAvatarModal(true)}>
              <AvatarCircle name={user?.name ?? "?"} avatar={avatarUrl} />
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
            </View>

            <View style={S.statsRow}>
              <StatChip icon="bookmark" value={watchCount} label="Saved" />
              <View style={S.statDivider} />
              <StatChip icon="gift-outline" value={trial.daysLeft} label="Days left" />
              <View style={S.statDivider} />
              <StatChip icon="star-outline" value="Free" label="Plan" />
            </View>
          </LinearGradient>

          {/* Trial bar */}
          <View style={S.section}>
            <View style={S.trialCard}>
              <View style={S.trialHead}>
                <View style={S.trialIcon}>
                  <Ionicons name="gift-outline" size={16} color={trial.expired ? "#ef4444" : "#AB8BFF"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.trialTitle}>
                    {trial.expired ? "Free Trial Ended" : `${trial.daysLeft} days left on free trial`}
                  </Text>
                  <Text style={S.trialSub}>
                    {trial.expired
                      ? "Upgrade to keep full access"
                      : trialStartDate ? `Started ${new Date(trialStartDate).toLocaleDateString()}` : ""}
                  </Text>
                </View>
              </View>
              <View style={S.trialBar}>
                <View style={[S.trialFill, {
                  width: `${Math.round(trial.pct * 100)}%` as any,
                  backgroundColor: trial.expired ? "#ef4444" : trial.pct > 0.7 ? "#f59e0b" : "#AB8BFF",
                }]} />
              </View>
              {trial.expired && (
                <TouchableOpacity style={S.upgradeBtn} onPress={() => router.push("/paywall")} activeOpacity={0.85}>
                  <LinearGradient colors={["#c4a8ff","#AB8BFF","#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.upgradeBtnIn}>
                    <Ionicons name="diamond-outline" size={15} color="#0f0f12" />
                    <Text style={S.upgradeBtnTxt}>Upgrade to Premium</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <View style={S.section}>
            <Text style={S.sectionLbl}>{t("my_content", "MY CONTENT")}</Text>
            <View style={S.menuCard}>
              <MenuRow icon="bookmark-outline" label={t("my_watchlist", "My Watchlist")}
                sub={`${watchCount} movie${watchCount !== 1 ? "s" : ""} saved`}
                onPress={() => router.push("/(tabs)/save")} />
              <MenuRow icon="film-outline" label={t("discover_movies", "Discover Movies")}
                sub={t("browse_all_genres", "Browse all genres")}
                onPress={() => router.push("/")} last />
            </View>
          </View>

          {/* Account */}
          <View style={S.section}>
            <Text style={S.sectionLbl}>{t("account", "ACCOUNT")}</Text>
            <View style={S.menuCard}>
              <MenuRow icon="camera-outline" label={t("profile_photo", "Profile Photo")}
                sub={avatarUrl ? t("photo_uploaded", "Photo uploaded") : t("upload_profile_photo", "Upload profile photo")}
                onPress={() => setAvatarModal(true)} />
              <MenuRow icon="person-outline" label={t("display_name", "Display Name")}
                sub={user?.name ?? ""} onPress={() => setEditModal(true)} />
              <MenuRow icon="mail-outline" label={t("email_address", "Email Address")}
                sub={user?.email ?? ""} onPress={() => {}} />
              <MenuRow icon="lock-closed-outline" label={t("change_password", "Change Password")}
                sub={t("send_reset_link", "Send reset link to your email")}
                onPress={() => router.push("/(auth)/forgot")} last />
            </View>
          </View>

          {/* App */}
          <View style={S.section}>
            <Text style={S.sectionLbl}>{t("app", "APP")}</Text>
            <View style={S.menuCard}>
              <MenuRow icon="information-circle-outline" label={t("version", "Version")} rightText="1.0.0" onPress={() => {}} />
              <MenuRow
                icon="globe-outline"
                label={t("language", "Language")}
                rightText={locale}
                onPress={() => router.push("/settings/language" as any)}
              />
              <MenuRow icon="shield-checkmark-outline" label={t("privacy_policy", "Privacy Policy")} onPress={() => router.push("/legal/privacy" as any)} />
              <MenuRow icon="document-text-outline" label={t("terms_of_service", "Terms of Service")} onPress={() => router.push("/legal/terms" as any)} />
              <MenuRow icon="help-circle-outline" label={t("help_center", "Help Center")} onPress={() => router.push("/help" as any)} />
              <MenuRow icon="chatbubble-ellipses-outline" label={t("contact_support", "Contact Support")} onPress={() => router.push("/support" as any)} />
              <MenuRow icon="briefcase-outline" label={t("careers", "Careers")} onPress={() => router.push("/careers" as any)} last />
            </View>
          </View>

          {/* Sign out */}
          <View style={[S.section, { marginBottom: 8 }]}>
            <View style={S.menuCard}>
              <MenuRow icon="log-out-outline" label={t("sign_out", "Sign Out")}
                sub={t("sign_back_anytime", "You can sign back in anytime")}
                onPress={handleLogout} danger last />
            </View>
          </View>
        </ScrollView>
      )}

      {loggingOut && (
        <View style={S.loggingOutOverlay}>
          <ActivityIndicator size="large" color="#AB8BFF" />
        </View>
      )}
      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <View style={S.overlay}>
          <View style={S.modalBox}>
            <Text style={S.modalTitle}>{t("sign_out", "Sign Out")}</Text>
            <Text style={S.modalHint}>
              {t("sign_out_confirm", "Are you sure you want to sign out?")}
            </Text>
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.modalCancel} onPress={() => setLogoutModal(false)}>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>
                  {t("cancel", "Cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.modalDanger}
                onPress={async () => {
                  setLogoutModal(false);
                  await runLogout();
                }}
                disabled={loggingOut}
              >
                <Text style={{ color: "#ffffff", fontWeight: "900" }}>
                  {t("sign_out", "Sign Out")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={avatarModal} transparent animationType="fade" onRequestClose={() => setAvatarModal(false)}>
        <View style={S.overlay}>
          <View style={S.modalBox}>
            <Text style={S.modalTitle}>{t("upload_profile_photo", "Upload Profile Photo")}</Text>
            <Text style={S.modalHint}>
              {Platform.OS === "web"
                ? t("choose_image_desktop", "Choose an image from Downloads or Pictures.")
                : t("choose_image_phone", "Choose an image from your phone gallery.")}
            </Text>
            {!!avatarDraft && (
              <View style={S.previewWrap}>
                <Image source={{ uri: avatarDraft }} style={S.previewImg} />
              </View>
            )}
            <View style={S.modalBtns}>
              <TouchableOpacity style={S.modalCancel} onPress={() => setAvatarModal(false)}>
                <Text style={{ color: "rgba(255,255,255,0.5)", fontWeight: "700" }}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.modalSave} onPress={pickAvatarFromDevice} disabled={avatarBusy}>
                {avatarBusy
                  ? <ActivityIndicator size="small" color="#0f0f12" />
                  : <Text style={{ color: "#0f0f12", fontWeight: "900" }}>{t("choose_image", "Choose Image")}</Text>}
              </TouchableOpacity>
            </View>
            {!!pickOAuthAvatar(user) && (
              <TouchableOpacity
                onPress={() => saveAvatar(pickOAuthAvatar(user)).catch((e) => toast.error("Failed", e?.message ?? ""))}
                style={S.oauthAvatarBtn}
              >
                <Text style={S.oauthAvatarTxt}>{t("use_google_photo", "Use Google Account Photo")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;

const S = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#0f0f12" },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  headerTitle:   { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  editBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(171,139,255,0.12)", borderWidth: 1, borderColor: "rgba(171,139,255,0.2)", alignItems: "center", justifyContent: "center" },
  hero:          { alignItems: "center", padding: 28, paddingBottom: 22, marginHorizontal: 20, marginTop: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(171,139,255,0.15)" },
  heroName:      { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 14, marginBottom: 4 },
  heroEmail:     { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", marginBottom: 10 },
  badgeRow:      { marginBottom: 18 },
  badge:         { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeTxt:      { fontSize: 12, fontWeight: "700" },
  statsRow:      { flexDirection: "row", alignItems: "center", width: "100%" },
  statDivider:   { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.08)" },
  statChip:      { flex: 1, alignItems: "center", gap: 4 },
  statVal:       { color: "#fff", fontWeight: "900", fontSize: 18 },
  statLbl:       { color: "rgba(255,255,255,0.35)", fontSize: 10, textAlign: "center" },
  section:       { paddingHorizontal: 20, marginTop: 22 },
  sectionLbl:    { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 10 },
  trialCard:     { backgroundColor: "rgba(171,139,255,0.07)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(171,139,255,0.15)", padding: 16 },
  trialHead:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  trialIcon:     { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(171,139,255,0.12)", alignItems: "center", justifyContent: "center" },
  trialTitle:    { color: "#fff", fontWeight: "800", fontSize: 14 },
  trialSub:      { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 },
  trialBar:      { height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  trialFill:     { height: 6, borderRadius: 3 },
  upgradeBtn:    { marginTop: 14, borderRadius: 12, overflow: "hidden" },
  upgradeBtnIn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  upgradeBtnTxt: { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
  menuCard:      { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  menuRow:       { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  menuIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLbl:       { color: "#fff", fontSize: 15, fontWeight: "700" },
  menuSub:       { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 },
  menuRight:     { color: "#AB8BFF", fontWeight: "700", fontSize: 13 },
  guestWrap:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  guestIcon:     { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  guestTitle:    { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center" },
  guestSub:      { color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", lineHeight: 22 },
  guestPrimary:  { width: "100%", borderRadius: 14, overflow: "hidden" },
  guestPrimaryIn:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  guestPrimaryTxt:{ color: "#0f0f12", fontWeight: "900", fontSize: 15 },
  guestSecondary:{ width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 13, paddingVertical: 13, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)" },
  guestSecondaryTxt:{ color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox:      { width: "100%", maxWidth: 380, backgroundColor: "#1a0a2e", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(171,139,255,0.2)" },
  modalTitle:    { color: "#fff", fontSize: 18, fontWeight: "900", marginBottom: 16 },
  modalInput:    { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  modalHint:     { color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 12 },
  modalBtns:     { flexDirection: "row", gap: 10 },
  modalCancel:   { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalSave:     { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#AB8BFF" },
  modalDanger:   { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, backgroundColor: "#ef4444" },
  previewWrap:   { alignItems: "center", marginBottom: 16 },
  previewImg:    { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: "rgba(171,139,255,0.35)" },
  oauthAvatarBtn: { marginTop: 12, alignItems: "center" },
  oauthAvatarTxt: { color: "#AB8BFF", fontSize: 13, fontWeight: "700" },
  loggingOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
