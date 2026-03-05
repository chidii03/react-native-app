// components/GenreChipRow.tsx — includes Fantasy & Family
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';

export const GENRES = [
  { key: 'action',    label: 'Action'     },
  { key: 'comedy',    label: 'Comedy'     },
  { key: 'thriller',  label: 'Thriller'   },
  { key: 'romance',   label: 'Romance'    },
  { key: 'scifi',     label: 'Sci-Fi'     },
  { key: 'horror',    label: 'Horror'     },
  { key: 'animation', label: 'Animation'  },
  { key: 'drama',     label: 'Drama'      },
  { key: 'crime',     label: 'Crime'      },
  { key: 'adventure', label: 'Adventure'  },
  { key: 'fantasy',   label: 'Fantasy'    },
  { key: 'family',    label: 'Family'     },
];

interface Props {
  activeGenre: string;
  onSelect: (key: string) => void;
}

const GenreChipRow = ({ activeGenre, onSelect }: Props) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row}
  >
    {GENRES.map(({ key, label }) => {
      const active = key === activeGenre;
      return (
        <TouchableOpacity
          key={key}
          onPress={() => onSelect(key)}
          activeOpacity={0.75}
          style={[styles.chip, active && styles.chipActive]}
        >
          <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: 10 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: '#AB8BFF',
    borderColor: '#AB8BFF',
    shadowColor: '#AB8BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  label:       { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  labelActive: { color: '#fff', fontWeight: '800' },
});

export default GenreChipRow;