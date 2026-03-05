// components/Footer.tsx
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import MovieTimeLogo from './MovieTimeLogo';

const LINKS = [
  { label: 'Privacy Policy', icon: 'shield-outline' as const, route: '/legal/privacy' },
  { label: 'Terms of Service', icon: 'document-text-outline' as const, route: '/legal/terms' },
  { label: 'Contact Support', icon: 'chatbubble-outline' as const, route: '/support' },
  { label: 'Help Center', icon: 'help-circle-outline' as const, route: '/help' },
  { label: 'Careers', icon: 'briefcase-outline' as const, route: '/careers' },
];

const SOCIALS = [
  { icon: 'logo-twitter' as const,   color: '#1DA1F2', link: 'https://x.com/chidi_03' },
  { icon: 'logo-facebook' as const,  color: '#1877F2', link: 'https://web.facebook.com/profile.php?id=61588136693676' },
  { icon: 'mail-outline' as const,   color: '#AB8BFF', link: 'mailto:chidiokwu795@gmail.com' },
  { icon: 'logo-whatsapp' as const,  color: '#25D366', link: 'https://wa.me/2348079379510' },
];

const Footer = () => {
  const router = useRouter();
  return (
    <View style={styles.container}>
    {/* Top accent line */}
    <LinearGradient
      colors={['transparent', '#AB8BFF', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.accentLine}
    />

    {/* Brand */}
    <View style={styles.brandRow}>
      <MovieTimeLogo size="md" />
      <View style={styles.poweredBadge}>
        <Text style={styles.poweredText}>Powered by TMDB</Text>
      </View>
    </View>

    <Text style={styles.tagline}>
      Experience the best of cinema from the comfort of your palm.{'\n'}
      Unlimited streaming, premium quality.
    </Text>

    {/* Social Icons */}
    <View style={styles.socialsRow}>
      {SOCIALS.map((s, i) => (
        <TouchableOpacity key={i} style={styles.socialBtn} activeOpacity={0.7} onPress={() => Linking.openURL(s.link).catch(() => {})}>
          <Ionicons name={s.icon} size={20} color={s.color} />
        </TouchableOpacity>
      ))}
    </View>

    {/* Divider */}
    <View style={styles.divider} />

    {/* Links */}
    <View style={styles.linksGrid}>
      {LINKS.map((link, i) => (
        <TouchableOpacity key={i} style={styles.linkRow} activeOpacity={0.7} onPress={() => router.push(link.route as any)}>
          <Ionicons name={link.icon} size={15} color="rgba(255,255,255,0.25)" />
          <Text style={styles.linkText}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* Copyright */}
    <View style={styles.copyrightRow}>
      <Ionicons name="film-outline" size={12} color="rgba(255,255,255,0.2)" />
      <Text style={styles.copyright}>© 2026 MovieTime Inc. All rights reserved.</Text>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0e',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  accentLine: {
    height: 1,
    marginBottom: 28,
    opacity: 0.6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  poweredBadge: {
    backgroundColor: 'rgba(171,139,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(171,139,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  poweredText: { color: '#AB8BFF', fontSize: 10, fontWeight: '700' },
  tagline: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  socialsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  linksGrid: { gap: 14, marginBottom: 28 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  copyrightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  copyright: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default Footer;
