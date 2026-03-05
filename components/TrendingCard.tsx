// components/TrendingCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import MaskedView from '@react-native-masked-view/masked-view';
import { images } from '../constants/images';
import { Ionicons } from '@expo/vector-icons';

const TrendingCard = ({
  movie: { movie_id, title, poster_url },
  index,
}: TrendingCardProps) => {
  return (
    <Link href={`/movies/${movie_id}`} asChild>
      <TouchableOpacity style={styles.card} activeOpacity={0.85}>
        {/* Poster */}
        <View style={styles.posterWrapper}>
          <Image
            source={{ uri: poster_url }}
            style={styles.poster}
            resizeMode="cover"
          />
          {/* Rank number - bottom left, overflows */}
          <View style={styles.rankWrapper}>
            <MaskedView
              maskElement={
                <Text style={styles.rankText}>{index + 1}</Text>
              }
            >
              <Image
                source={images.rankingGradient}
                style={{ width: 52, height: 60 }}
                resizeMode="cover"
              />
            </MaskedView>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        {/* Trending indicator */}
        <View style={styles.trendingRow}>
          <Ionicons name="trending-up" size={10} color="#AB8BFF" />
          <Text style={styles.trendingText}>Trending #{index + 1}</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );
};

const styles = StyleSheet.create({
  card: { width: 120, paddingBottom: 4 },
  posterWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  poster: {
    width: 120,
    height: 170,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  rankWrapper: {
    position: 'absolute',
    bottom: -14,
    left: -6,
  },
  rankText: {
    fontSize: 60,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 64,
  },
  title: {
    color: '#d4d4d4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    lineHeight: 16,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendingText: {
    color: '#AB8BFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default TrendingCard;