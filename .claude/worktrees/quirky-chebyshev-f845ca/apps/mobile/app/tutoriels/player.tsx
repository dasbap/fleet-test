import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Image } from 'expo-image';
import { getTutorialById, tutorials } from '@/features/tutorials/catalog';
import { downloadTutorial, getCompletedTutorials, getLocalPath, isDownloaded, markCompleted } from '@/features/tutorials/storage';
import { formatDuration, getNextTutorial } from '@/features/tutorials/utils';

const screenWidth = Dimensions.get('window').width;
const videoHeight = Math.round((screenWidth * 9) / 16);

export default function TutorialPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tutorial = useMemo(() => (id ? getTutorialById(id) : null), [id]);
  const nextTutorial = useMemo(() => (tutorial ? getNextTutorial(tutorials, tutorial.id) : null), [tutorial]);

  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [completed, setCompleted] = useState(() => (tutorial ? getCompletedTutorials().includes(tutorial.id) : false));
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    if (!tutorial) {
      return;
    }
    isDownloaded(tutorial).then((ok) => {
      if (ok) {
        getLocalPath(tutorial).then(setLocalUri);
      }
    });
  }, [tutorial]);

  const toggleFullscreen = useCallback(async () => {
    const nextLandscape = !landscape;
    setLandscape(nextLandscape);
    await ScreenOrientation.lockAsync(
      nextLandscape ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  }, [landscape]);

  const onPlaybackStatusUpdate = useCallback(
    (playbackStatus: AVPlaybackStatus) => {
      setStatus(playbackStatus);
      if (!tutorial || completed || !playbackStatus.isLoaded || !playbackStatus.durationMillis) {
        return;
      }
      const ratio = playbackStatus.positionMillis / playbackStatus.durationMillis;
      if (ratio >= 0.8) {
        markCompleted(tutorial.id);
        setCompleted(true);
      }
      if (playbackStatus.didJustFinish && nextTutorial) {
        router.replace({ pathname: '/tutoriels/player', params: { id: nextTutorial.id } });
      }
    },
    [completed, tutorial, nextTutorial],
  );

  const handleDownload = useCallback(async () => {
    if (!tutorial || downloading) {
      return;
    }
    try {
      setDownloading(true);
      const uri = await downloadTutorial(tutorial, setDownloadProgress);
      setLocalUri(uri);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }, [downloading, tutorial]);

  if (!tutorial) {
    return (
      <View style={styles.centered}>
        <Text style={styles.text}>Tutoriel introuvable.</Text>
      </View>
    );
  }

  const progressPercent =
    status?.isLoaded && status.durationMillis
      ? Math.round((status.positionMillis / status.durationMillis) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: tutorial.title }} />
      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: localUri ?? tutorial.videoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={onPlaybackStatusUpdate}
          useNativeControls
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>{tutorial.title}</Text>
        <Text style={styles.meta}>⏱ {formatDuration(tutorial.duration)} {completed ? ' • ✓ Vu' : ''}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <Text style={styles.description}>{tutorial.description}</Text>

        <Text style={styles.subtitle}>Chapitres</Text>
        {tutorial.chapters.map((chapter) => (
          <TouchableOpacity
            key={chapter.id}
            style={styles.chapter}
            onPress={() => videoRef.current?.setPositionAsync(chapter.startSec * 1000)}
          >
            <Text style={styles.chapterText}>
              {formatDuration(chapter.startSec)} — {chapter.title}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.action} onPress={toggleFullscreen}>
          <Text style={styles.actionText}>
            {landscape ? 'Quitter plein écran (portrait)' : 'Passer en plein écran (paysage)'}
          </Text>
        </TouchableOpacity>

        {localUri ? (
          <View style={styles.offlineReady}>
            <Text style={styles.offlineReadyText}>📥 Disponible hors ligne</Text>
          </View>
        ) : downloading ? (
          <View style={styles.downloadBox}>
            <ActivityIndicator color="#10b981" />
            <Text style={styles.text}>Téléchargement {downloadProgress}%</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.action} onPress={handleDownload}>
            <Text style={styles.actionText}>📥 Télécharger pour hors ligne</Text>
          </TouchableOpacity>
        )}

        {nextTutorial ? (
          <TouchableOpacity
            style={styles.nextCard}
            onPress={() => router.replace({ pathname: '/tutoriels/player', params: { id: nextTutorial.id } })}
          >
            <Image source={{ uri: nextTutorial.thumbnailUrl }} style={styles.nextThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.subtitle}>Suivant</Text>
              <Text style={styles.nextTitle}>{nextTutorial.title}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  videoWrapper: { width: screenWidth, height: videoHeight, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  body: { padding: 14, gap: 10, paddingBottom: 32 },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  meta: { color: '#94a3b8', fontSize: 12 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#334155', overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#10b981' },
  description: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  subtitle: { color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', fontWeight: '700' },
  chapter: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 10 },
  chapterText: { color: '#e2e8f0', fontSize: 12 },
  action: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, alignItems: 'center' },
  actionText: { color: '#f8fafc', fontWeight: '600', fontSize: 13 },
  offlineReady: { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.35)', borderWidth: 1, borderRadius: 10, padding: 10 },
  offlineReadyText: { color: '#10b981', fontWeight: '600' },
  downloadBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { color: '#cbd5e1' },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  nextThumb: { width: 68, height: 42, borderRadius: 6, backgroundColor: '#334155' },
  nextTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
});
