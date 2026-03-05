// components/SectionHeader.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

const SectionHeader = ({ title, subtitle, onSeeAll }: SectionHeaderProps) => (
  <View style={styles.container}>
    <View style={styles.left}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll} style={styles.seeAllBtn} activeOpacity={0.7}>
        <Text style={styles.seeAllText}>See all</Text>
        <Ionicons name="chevron-forward" size={13} color="#AB8BFF" />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
    marginTop: 32,
  },
  left: { flex: 1 },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(171,139,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(171,139,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  seeAllText: {
    color: '#AB8BFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SectionHeader;