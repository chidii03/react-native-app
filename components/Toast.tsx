// components/Toast.tsx 
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id:      string;
  type:    ToastType;
  title:   string;
  message?: string;
  anim:    Animated.Value;
}

interface ToastContextType {
  show: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  show: () => {}, success: () => {}, error: () => {}, info: () => {}, warning: () => {},
});

export const useToast = () => useContext(ToastContext);

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; iconName: any }> = {
  success: { bg: "rgba(16,25,14,0.97)", border: "#4ade80", icon: "#4ade80", iconName: "checkmark-circle" },
  error:   { bg: "rgba(25,10,10,0.97)", border: "#ef4444", icon: "#ef4444", iconName: "alert-circle"     },
  warning: { bg: "rgba(25,20,5,0.97)",  border: "#f59e0b", icon: "#f59e0b", iconName: "warning"          },
  info:    { bg: "rgba(10,14,25,0.97)", border: "#AB8BFF", icon: "#AB8BFF", iconName: "information-circle"},
};

const ToastItem = ({ item, onDone }: { item: ToastItem; onDone: (id: string) => void }) => {
  const c = COLORS[item.type];
  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(item.anim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3200),
      Animated.timing(item.anim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone(item.id));
  }, []);

  return (
    <Animated.View style={[
      styles.toast,
      { backgroundColor: c.bg, borderLeftColor: c.border },
      { opacity: item.anim, transform: [{ translateY: item.anim.interpolate({ inputRange:[0,1], outputRange:[-20,0] }) }] }
    ]}>
      <Ionicons name={c.iconName} size={20} color={c.icon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle}>{item.title}</Text>
        {item.message ? <Text style={styles.toastMsg}>{item.message}</Text> : null}
      </View>
    </Animated.View>
  );
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message, anim: new Animated.Value(0) }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((t: string, m?: string) => show("success", t, m), [show]);
  const error   = useCallback((t: string, m?: string) => show("error",   t, m), [show]);
  const info    = useCallback((t: string, m?: string) => show("info",    t, m), [show]);
  const warning = useCallback((t: string, m?: string) => show("warning", t, m), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map(t => <ToastItem key={t.id} item={t} onDone={remove} />)}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 50,
    left: 16, right: 16,
    zIndex: 9999,
    gap: 8,
    pointerEvents: "none" as any,
  },
  toast: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, padding: 14,
    borderLeftWidth: 3,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 32px rgba(0,0,0,0.5)" } as any
      : { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 }
    ),
  },
  toastTitle: { color: "#fff", fontSize: 14, fontWeight: "800", lineHeight: 18 },
  toastMsg:   { color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2, lineHeight: 16 },
});