// components/ComingSoonCard.tsx
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TMDB_IMAGE } from '../services/api';

const CARD_W = 148;

const Card = ({ item }: { item: any }) => {
  const router = useRouter();
  let month = '—';
  let day: number | string = '—';
  try {
    const d = new Date(item.release_date);
    month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    day = d.getDate();
  } catch (_) {}

  return (
    <TouchableOpacity
      onPress={() => router.push(`/movies/${item.id}`)}
      activeOpacity={0.85}
      style={styles.card}
    >
      <Image
        source={{ uri: TMDB_IMAGE(item.poster_path) ?? 'https://placehold.co/148x210/1a1a2e/fff' }}
        style={styles.poster}
        resizeMode="cover"
      />

      {/* Date badge */}
      <LinearGradient colors={['#AB8BFF', '#7c3aed']} style={styles.dateBadge}>
        <Text style={styles.monthText}>{month}</Text>
        <Text style={styles.dayText}>{day}</Text>
      </LinearGradient>

      {/* Coming soon pill */}
      <View style={styles.pill}>
        <Ionicons name="time-outline" size={9} color="#AB8BFF" />
        <Text style={styles.pillText}>COMING SOON</Text>
      </View>

      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
    </TouchableOpacity>
  );
};

interface ComingSoonCardRowProps {
  data: any[];
}

const ComingSoonCardRow = ({ data }: ComingSoonCardRowProps) => (
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={data}
    contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
    keyExtractor={(item) => item.id.toString()}
    renderItem={({ item }) => <Card item={item} />}
  />
);

const styles = StyleSheet.create({
  card: { width: CARD_W },
  poster: {
    width: CARD_W,
    height: 210,
    borderRadius: 16,
  },
  dateBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignItems: 'center',
    shadowColor: '#AB8BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  monthText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  dayText: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  pill: {
    position: 'absolute',
    bottom: 34,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pillText: { color: '#AB8BFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  title: {
    color: '#e2e2e2',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
});

export { Card as ComingSoonCard };
export default ComingSoonCardRow;