// components/HorizontalPosterRow.tsx
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TMDB_IMAGE } from '../services/api';

interface HorizontalPosterRowProps {
  data: any[];
  cardWidth?: number;
  cardHeight?: number;
}

const HorizontalPosterRow = ({
  data,
  cardWidth = 120,
  cardHeight = 180,
}: HorizontalPosterRowProps) => {
  const router = useRouter();

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => router.push(`/movies/${item.id}`)}
          activeOpacity={0.85}
          style={{ width: cardWidth }}
        >
          <View style={styles.imageWrapper}>
            <Image
              source={{
                uri:
                  TMDB_IMAGE(item.poster_path) ??
                  'https://placehold.co/120x180/1a1a2e/ffffff',
              }}
              style={{ width: cardWidth, height: cardHeight, borderRadius: 14 }}
              resizeMode="cover"
            />
            {/* Rating overlay */}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={9} color="#f5c518" />
              <Text style={styles.ratingText}>{(item.vote_average / 2).toFixed(1)}</Text>
            </View>
          </View>
          <Text style={[styles.title, { width: cardWidth }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.year}>{item.release_date?.split('-')[0]}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  imageWrapper: { position: 'relative' },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingText: { color: '#f5c518', fontSize: 10, fontWeight: '800' },
  title: {
    color: '#e2e2e2',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  year: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
});

export default HorizontalPosterRow;