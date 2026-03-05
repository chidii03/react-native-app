// components/BentoGrid.tsx
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TMDB_IMAGE } from '../services/api';

interface BentoGridProps {
  movies: any[];
}

const BentoItem = ({
  item,
  style,
  titleSize = 14,
}: {
  item: any;
  style: object;
  titleSize?: number;
}) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(`/movies/${item.id}`)}
      activeOpacity={0.88}
      style={[{ borderRadius: 18, overflow: 'hidden' }, style]}
    >
      <ImageBackground
        source={{
          uri:
            TMDB_IMAGE(item.backdrop_path, 'w780') ??
            TMDB_IMAGE(item.poster_path) ??
            '',
        }}
        style={StyleSheet.absoluteFill}
        imageStyle={{ borderRadius: 18 }}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.92)']}
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', padding: 12, borderRadius: 18 }]}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: titleSize, letterSpacing: -0.2 }} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="star" size={10} color="#f5c518" />
          <Text style={{ color: '#f5c518', fontSize: 10, fontWeight: '800' }}>
            {(item.vote_average / 2).toFixed(1)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 2 }}>
            {item.release_date?.split('-')[0]}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const BentoGrid = ({ movies }: BentoGridProps) => {
  if (!movies || movies.length < 5) return null;

  return (
    <View style={styles.container}>
      {/* Row 1: wide + narrow */}
      <View style={[styles.row, { height: 210 }]}>
        <BentoItem item={movies[0]} style={{ flex: 2 }} titleSize={16} />
        <BentoItem item={movies[1]} style={{ flex: 1 }} titleSize={12} />
      </View>

      {/* Row 2: three equal */}
      <View style={[styles.row, { height: 145 }]}>
        <BentoItem item={movies[2]} style={{ flex: 1 }} titleSize={11} />
        <BentoItem item={movies[3]} style={{ flex: 1 }} titleSize={11} />
        <BentoItem item={movies[4]} style={{ flex: 1 }} titleSize={11} />
      </View>

      {/* Row 3: narrow + wide (if data exists) */}
      {movies[5] && movies[6] && (
        <View style={[styles.row, { height: 175 }]}>
          <BentoItem item={movies[5]} style={{ flex: 1 }} titleSize={12} />
          <BentoItem item={movies[6]} style={{ flex: 2 }} titleSize={15} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
});

export default BentoGrid;