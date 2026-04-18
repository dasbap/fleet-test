import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { tutorials } from '@/features/tutorials/catalog';
import { getCompletedTutorials, isDownloaded } from '@/features/tutorials/storage';
import { formatDuration } from '@/features/tutorials/utils';
import type { Tutorial } from '@/features/tutorials/types';

const categories = [
  { id: 'all', label: 'Tous' },
  { id: 'creneau', label: 'Créneau' },
  { id: 'incident', label: 'Incident' },
  { id: 'maintenance', label: 'Entretien' },
  { id: 'rapports', label: 'Rapports' },
  { id: 'parametres', label: 'Paramètres' },
] as const;

export default function TutorialsScreen() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]['id']>('all');
  const [completed, setCompleted] = useState<string[]>(() => getCompletedTutorials());
  const [downloaded, setDownloaded] = useState<string[]>([]);

  useEffect(() => {
    Promise.all(tutorials.map(async (tutorial) => ({ id: tutorial.id, ok: await isDownloaded(tutorial) }))).then(
      (rows) => setDownloaded(rows.filter((row) => row.ok).map((row) => row.id)),
    );
    setCompleted(getCompletedTutorials());
  }, []);

  const filtered = useMemo(() => {
    if (activeCategory === 'all') {
      return tutorials;
    }
    return tutorials.filter((tutorial) => tutorial.category === activeCategory);
  }, [activeCategory]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Tutoriels vidéo terrain' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBar}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryChip, activeCategory === category.id && styles.categoryChipActive]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text style={[styles.categoryText, activeCategory === category.id && styles.categoryTextActive]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {completed.length}/{tutorials.length} tutoriels terminés
        </Text>
      </View>

      <FlashList
        data={filtered}
        estimatedItemSize={110}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TutorialRow
            tutorial={item}
            isCompleted={completed.includes(item.id)}
            isDownloaded={downloaded.includes(item.id)}
            onPress={() => router.push({ pathname: '/tutoriels/player', params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

function TutorialRow({
  tutorial,
  isCompleted,
  isDownloaded,
  onPress,
}: {
  tutorial: Tutorial;
  isCompleted: boolean;
  isDownloaded: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: tutorial.thumbnailUrl }} style={styles.thumbnail} contentFit="cover" />
      <View style={styles.content}>
        <Text style={styles.title}>{tutorial.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {tutorial.description}
        </Text>
        <View style={styles.badges}>
          <Text style={styles.duration}>⏱ {formatDuration(tutorial.duration)}</Text>
          {isCompleted ? <Text style={styles.done}>✓ Vu</Text> : null}
          {isDownloaded ? <Text style={styles.offline}>📥 Offline</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 12, paddingTop: 12 },
  categoryBar: { gap: 8, paddingBottom: 12 },
  categoryChip: { backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  categoryChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  categoryText: { color: '#94a3b8', fontSize: 12 },
  categoryTextActive: { color: '#f8fafc' },
  progressContainer: { marginBottom: 8 },
  progressText: { color: '#cbd5e1', fontSize: 12 },
  card: { flexDirection: 'row', gap: 10, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 10, marginVertical: 6 },
  thumbnail: { width: 120, height: 78, borderRadius: 8, backgroundColor: '#334155' },
  content: { flex: 1, gap: 5 },
  title: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
  description: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  badges: { flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  duration: { color: '#cbd5e1', fontSize: 11 },
  done: { color: '#10b981', fontSize: 11, fontWeight: '700' },
  offline: { color: '#e2e8f0', fontSize: 11 },
});
