// components/Header.tsx — transparent, scrolls with page, no background
import { View, Image, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { icons } from '../constants/icons';

const PT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) + 6 : 54;

const Header = () => {
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: PT }]}>
      {/* Left: invisible spacer to balance layout */}
      <View style={styles.iconBtn} />

      {/* Center: Logo */}
      <Image source={icons.logo} style={styles.logo} resizeMode="contain" />

      {/* Right: Profile */}
      <TouchableOpacity
        onPress={() => router.push('/profile')}
        style={styles.profileBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="person-outline" size={18} color="#AB8BFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  iconBtn: { width: 38, height: 38 },
  logo: { width: 52, height: 36 },
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(171,139,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(171,139,255,0.4)',
  },
});

export default Header;