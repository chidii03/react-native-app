// app/support.tsx
// Uses Formspree — no Appwrite Function, no Resend, no backend needed.
//
// ONE-TIME SETUP (2 minutes):
//   1. Go to https://formspree.io → Sign up free (100 submissions/month)
//   2. Click "New Form" → name it "MovieTime Support"
//   3. Copy the form endpoint: https://formspree.io/f/xabc1234
//   4. Add EXPO_PUBLIC_FORMSPREE_URL=https://formspree.io/f/xabc1234 to Vercel env vars
//   5. Done. Formspree emails you at whatever address you used to sign up.

import React, { useState, useEffect } from "react";
import {
  ActivityIndicator, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";

// Remove browser default focus outline on web
if (Platform.OS === "web" && typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = "input:focus, textarea:focus { outline: none !important; box-shadow: none !important; }";
  document.head.appendChild(s);
}
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PageBackHeader from "../components/PageBackHeader";
import { useToast } from "../components/Toast";

const FORMSPREE_URL = process.env.EXPO_PUBLIC_FORMSPREE_URL?.trim() ?? "";
const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SupportPage() {
  const toast = useToast();
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [errors,  setErrors]  = useState({ name: "", email: "", message: "" });

  const validate = () => {
    const e = { name: "", email: "", message: "" };
    if (!name.trim())                        e.name    = "Name is required";
    if (!email.trim())                       e.email   = "Email is required";
    else if (!emailRegex.test(email.trim())) e.email   = "Enter a valid email address";
    if (!message.trim())                     e.message = "Please write a message";
    else if (message.trim().length < 10)     e.message = "Message is too short";
    setErrors(e);
    return !e.name && !e.email && !e.message;
  };

  const submit = async () => {
    if (!validate()) return;
    if (!FORMSPREE_URL) {
      toast.error("Not configured", "Email us directly at chidiokwu795@gmail.com");
      return;
    }
    setSending(true);
    try {
      const res  = await fetch(FORMSPREE_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body:    JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.errors?.[0]?.message ?? "Submission failed");
      setName(""); setEmail(""); setMessage("");
      setErrors({ name: "", email: "", message: "" });
      setSent(true);
    } catch (e: any) {
      toast.error("Unable to send", e?.message ?? "Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={S.root}>
        <PageBackHeader />
        <View style={S.successWrap}>
          <View style={S.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color="#4ade80" />
          </View>
          <Text style={S.successTitle}>Message sent!</Text>
          <Text style={S.successSub}>
            Thank you for reaching out.{"\n"}We will reply to{"\n"}
            <Text style={{ color: "#AB8BFF", fontWeight: "800" }}>{email}</Text>
            {"\n"}shortly.
          </Text>
          <TouchableOpacity style={S.sendAnotherBtn} onPress={() => setSent(false)}>
            <Ionicons name="create-outline" size={15} color="#AB8BFF" />
            <Text style={S.sendAnotherTxt}>Send another message</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.root}>
      <PageBackHeader />
      <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
        <Text style={S.title}>Contact Support</Text>
        <Text style={S.subtitle}>Send us a message and we'll reply by email.</Text>

        <View style={S.card}>
          <Text style={S.label}>Full Name</Text>
          <View style={[S.inputWrap, !!errors.name && S.inputWrapErr]}>
            <Ionicons name="person-outline" size={16} color={errors.name ? "#ef4444" : "#AB8BFF"} style={S.inputIcon} />
            <TextInput style={S.input} value={name}
              onChangeText={v => { setName(v); setErrors(p => ({ ...p, name: "" })); }}
              placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.3)" autoCapitalize="words"
              {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
          </View>
          {!!errors.name && <Text style={S.fieldErr}>{errors.name}</Text>}

          <Text style={[S.label, { marginTop: 14 }]}>Email Address</Text>
          <View style={[S.inputWrap, !!errors.email && S.inputWrapErr]}>
            <Ionicons name="mail-outline" size={16} color={errors.email ? "#ef4444" : "#AB8BFF"} style={S.inputIcon} />
            <TextInput style={S.input} value={email}
              onChangeText={v => { setEmail(v); setErrors(p => ({ ...p, email: "" })); }}
              placeholder="you@example.com" placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none" keyboardType="email-address"
              {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
          </View>
          {!!errors.email && <Text style={S.fieldErr}>{errors.email}</Text>}

          <Text style={[S.label, { marginTop: 14 }]}>Message</Text>
          <View style={[S.inputWrap, S.messageWrap, !!errors.message && S.inputWrapErr]}>
            <TextInput style={[S.input, S.messageInput]} value={message}
              onChangeText={v => { setMessage(v); setErrors(p => ({ ...p, message: "" })); }}
              placeholder="How can we help? Describe your issue in detail."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline textAlignVertical="top"
              {...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {})} />
          </View>
          {!!errors.message && <Text style={S.fieldErr}>{errors.message}</Text>}
          <Text style={S.charCount}>{message.length} characters</Text>

          <TouchableOpacity style={[S.sendBtn, sending && { opacity: 0.6 }]} onPress={submit} disabled={sending} activeOpacity={0.85}>
            {sending
              ? <ActivityIndicator size="small" color="#0f0f12" />
              : <><Ionicons name="paper-plane-outline" size={17} color="#0f0f12" /><Text style={S.sendTxt}>Send Message</Text></>}
          </TouchableOpacity>

          <View style={S.directRow}>
            <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.25)" />
            <Text style={S.directTxt}>
              Or email directly at <Text style={{ color: "#AB8BFF" }}>chidiokwu795@gmail.com</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#0f0f12" },
  content:       { padding: 20, paddingBottom: 120 },
  title:         { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 6 },
  subtitle:      { color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 20 },
  card:          { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 16, padding: 16, width: "100%", maxWidth: 760, alignSelf: "center" },
  label:         { color: "#AB8BFF", fontSize: 12, fontWeight: "800", marginBottom: 6, letterSpacing: 0.5 },
  inputWrap:     { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 10, paddingHorizontal: 10, minHeight: 46 },
  inputWrapErr:  { borderColor: "rgba(239,68,68,0.5)", backgroundColor: "rgba(239,68,68,0.04)" },
  inputIcon:     { marginRight: 8, flexShrink: 0 },
  input:         { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 11 },
  messageWrap:   { alignItems: "flex-start", paddingTop: 10 },
  messageInput:  { minHeight: 110, paddingVertical: 0 },
  fieldErr:      { color: "#ef4444", fontSize: 11, marginTop: 4, marginLeft: 2, marginBottom: 2 },
  charCount:     { color: "rgba(255,255,255,0.2)", fontSize: 10, textAlign: "right", marginTop: 4, marginBottom: 4 },
  sendBtn:       { marginTop: 14, backgroundColor: "#AB8BFF", borderRadius: 11, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  sendTxt:       { color: "#0f0f12", fontWeight: "900", fontSize: 14 },
  directRow:     { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 14 },
  directTxt:     { color: "rgba(255,255,255,0.25)", fontSize: 11, flex: 1, lineHeight: 16 },
  successWrap:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  successIcon:   { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(74,222,128,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  successTitle:  { color: "#fff", fontSize: 24, fontWeight: "900", textAlign: "center" },
  successSub:    { color: "rgba(255,255,255,0.45)", fontSize: 14, textAlign: "center", lineHeight: 22 },
  sendAnotherBtn:{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 20, borderWidth: 1.5, borderColor: "rgba(171,139,255,0.35)", marginTop: 6 },
  sendAnotherTxt:{ color: "#AB8BFF", fontWeight: "800", fontSize: 14 },
});