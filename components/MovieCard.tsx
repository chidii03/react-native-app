// components/MovieCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type MovieCardProps = Movie & { desktopWidthOverride?: number };

const MovieCard = ({
  id,
  poster_path,
  title,
  vote_average,
  release_date,
  desktopWidthOverride,
}: MovieCardProps) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1100;
  const isTablet = width >= 768 && width < 1100;
  const cardWidth = isDesktop
    ? desktopWidthOverride ?? 180
    : isTablet
      ? desktopWidthOverride ?? 160
      : undefined;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/movies/${id}`)}
      style={[styles.card, isDesktop && { width: cardWidth }, isTablet && { width: cardWidth }]}
      activeOpacity={0.85}
    >
      {/* Poster */}
      <View style={styles.posterWrapper}>
        <Image
          source={{
            uri: poster_path
              ? `https://image.tmdb.org/t/p/w500${poster_path}`
              : 'https://placehold.co/100x150/1a1a2e/ffffff',
          }}
          style={styles.poster}
          resizeMode="cover"
        />
        {/* Rating badge */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={9} color="#f5c518" />
          <Text style={styles.ratingText}>{(vote_average / 2).toFixed(1)}</Text>
        </View>
      </View>

      {/* Info */}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.year}>{release_date?.split('-')[0]}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { width: '30%', minWidth: 96 },
  posterWrapper: { position: 'relative' },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 14,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  ratingText: { color: '#f5c518', fontSize: 10, fontWeight: '800' },
  title: {
    color: '#e8e8e8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 16,
  },
  year: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});

export default MovieCard;
