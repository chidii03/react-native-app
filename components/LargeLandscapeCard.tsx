// components/LargeLandscapeCard.tsx
// FIX: On desktop (web, width >= 768), switches to ScrollView and centers
// cards when they fit within the viewport. Falls back to scrollable on mobile.
import {
  Dimensions, FlatList, ScrollView, Text, TouchableOpacity,
  ImageBackground, View, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TMDB_IMAGE } from '../services/api';

const CARD_W_RATIO = 0.70; // 70% of screen width on mobile
const CARD_W_DESKTOP = 380; // fixed width on desktop
const CARD_H = 165;
const GAP    = 14;

const Card = ({ item, cardWidth }: { item: any; cardWidth: number }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/movies/${item.id}`)}
      activeOpacity={0.88}
      style={[styles.card, { width: cardWidth }]}
    >
      <ImageBackground
        source={{
          uri:
            TMDB_IMAGE(item.backdrop_path, 'w780') ??
            TMDB_IMAGE(item.poster_path)             ??
            '',
        }}
        style={styles.bg}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gradient}>
          <View style={styles.genreTag}>
            <Ionicons name="film-outline" size={10} color="#AB8BFF" />
            <Text style={styles.genreText}>{item.release_date?.split('-')[0]}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={styles.meta}>
            <Ionicons name="star" size={11} color="#f5c518" />
            <Text style={styles.rating}>{(item.vote_average / 2).toFixed(1)}</Text>
            <View style={styles.dot} />
            {item.adult === false && (
              <View style={styles.pgBadge}>
                <Text style={styles.pgText}>PG</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

interface LargeLandscapeCardRowProps {
  data: any[];
}

const LargeLandscapeCardRow = ({ data }: LargeLandscapeCardRowProps) => {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  // Card width: fixed on desktop, proportional on mobile
  const cardWidth = isDesktop ? CARD_W_DESKTOP : Math.round(width * CARD_W_RATIO);

  // Determine if all cards fit on screen without scrolling
  const totalW = data.length * cardWidth + (data.length - 1) * GAP + 40; // 40 = padding
  const shouldCenter = isDesktop && totalW <= width;

  // ── Desktop: centered ScrollView ──────────────────────────────────
  if (isDesktop) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.desktopContent,
          shouldCenter && styles.desktopContentCentered,
        ]}
      >
        {data.map((item) => (
          <Card key={item.id.toString()} item={item} cardWidth={cardWidth} />
        ))}
      </ScrollView>
    );
  }

  // ── Mobile: FlatList ───────────────────────────────────────────────
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      contentContainerStyle={{ paddingHorizontal: 20, gap: GAP }}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <Card item={item} cardWidth={cardWidth} />}
    />
  );
};

const styles = StyleSheet.create({
  // Desktop scroll container
  desktopContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: GAP,
  },
  desktopContentCentered: {
    // When all cards fit, center them in the viewport
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Card
  card: {
    height: CARD_H,
    borderRadius: 18,
    overflow: 'hidden',
    ...(Platform.OS !== 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }
      : ({
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        } as any)),
  },
  bg:       { flex: 1, justifyContent: 'flex-end' },
  image:    { borderRadius: 18 },
  gradient: { padding: 14 },
  genreTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  genreText:{ color: '#AB8BFF', fontSize: 11, fontWeight: '700' },
  title:    { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: -0.3, marginBottom: 6 },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating:   { color: '#f5c518', fontSize: 12, fontWeight: '800' },
  dot:      { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },
  pgBadge:  { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  pgText:   { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '700' },
});

export { Card as LandscapeCard };
export default LargeLandscapeCardRow;