// components/HeroSlider.tsx 
import {
  View,
  Text,
  ImageBackground,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '../context/LocaleContext';

// Recalculate on every render in case of rotation
const getWidth = () => Dimensions.get('window').width;

const CARD_SIDE_PADDING = 20; 
const CARD_HEIGHT = 420;

const HeroSlider = ({ movies }: { movies: any[] }) => {
  const router = useRouter();
  const { t } = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [screenW, setScreenW] = useState(getWidth());
  const flatListRef = useRef<FlatList>(null);
  const sliced = movies?.slice(0, 5) ?? [];
  const TOTAL = sliced.length;

  // Update width on orientation change
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreenW(window.width);
    });
    return () => sub?.remove();
  }, []);

  // Auto-advance
  useEffect(() => {
    if (TOTAL === 0) return;
    const interval = setInterval(() => {
      const next = (activeIndex + 1) % TOTAL;
      try {
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        setActiveIndex(next);
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeIndex, TOTAL, screenW]);

  if (TOTAL === 0) return null;

  const CARD_W = screenW - CARD_SIDE_PADDING * 2;

  const renderItem = ({ item }: { item: any }) => (
    <View style={{ width: screenW, paddingHorizontal: CARD_SIDE_PADDING }}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => router.push(`/movies/${item.id}`)}
        style={[styles.cardWrapper, { width: CARD_W }]}
      >
        <ImageBackground
          source={{
            uri: `https://image.tmdb.org/t/p/w780${item.backdrop_path || item.poster_path}`,
          }}
          style={styles.card}
          imageStyle={styles.cardImage}
          resizeMode="cover"
        >
          {/* Top vignette */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent']}
            style={styles.topGradient}
          />
          {/* Bottom overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.92)']}
            style={styles.bottomGradient}
          >
            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.badgeTrending}>
                <Text style={styles.badgeText}>{t("trending", "Trending").toUpperCase()}</Text>
              </View>
              <View style={styles.badgeMovie}>
                <Text style={styles.badgeTextDim}>{t("movie", "Movie").toUpperCase()}</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

            {/* Meta */}
            <View style={styles.metaRow}>
              <View style={styles.ratingChip}>
                <Ionicons name="star" size={12} color="#f5c518" />
                <Text style={styles.ratingText}>{(item.vote_average / 2).toFixed(1)}</Text>
              </View>
              <Text style={styles.year}>{item.release_date?.split('-')[0]}</Text>
              {item.original_language && (
                <View style={styles.langChip}>
                  <Text style={styles.langText}>{item.original_language.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* CTA */}
            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => router.push(`/movies/${item.id}`)}
                activeOpacity={0.85}
              >
                <Ionicons name="play" size={16} color="#0f0f12" />
                <Text style={styles.playText}>{t("play_now", "Play Now")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.infoBtn}
                onPress={() => router.push(`/movies/${item.id}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.infoText}>{t("more_info", "More Info")}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={sliced}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: screenW,   // each page = full screen width
          offset: screenW * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 300);
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
          if (idx >= 0 && idx < TOTAL) setActiveIndex(idx);
        }}
        keyExtractor={(item) => item.id.toString()}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {sliced.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  cardWrapper: {
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  card: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  cardImage: { borderRadius: 24 },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  bottomGradient: { padding: 20, paddingTop: 60 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badgeTrending: {
    backgroundColor: '#AB8BFF',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  badgeMovie: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  badgeTextDim: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: {
    color: '#fff', fontSize: 28, fontWeight: '900',
    letterSpacing: -0.5, lineHeight: 34, marginBottom: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(245,197,24,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(245,197,24,0.3)',
  },
  ratingText: { color: '#f5c518', fontSize: 12, fontWeight: '800' },
  year: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  langChip: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  langText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14,
  },
  playText: { color: '#0f0f12', fontWeight: '800', fontSize: 15 },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  infoText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 14 },
  dots: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, marginTop: 14,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: '#AB8BFF' },
  dotInactive: { width: 6, backgroundColor: 'rgba(255,255,255,0.25)' },
});

export default HeroSlider;
