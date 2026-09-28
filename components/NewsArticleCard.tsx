import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { NewsArticle } from '../src/types';
import { useTheme } from '../src/theme/ThemeProvider';
import { AppText, Card } from './ui';

export function NewsArticleCard({ article, onPress, saveControl }: { article: NewsArticle; onPress?: () => void; saveControl?: React.ReactNode }): React.JSX.Element {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(article.image && !imageFailed);
  const openArticle = async (): Promise<void> => {
    if (onPress) {
      onPress();
      return;
    }
    try {
      await Linking.openURL(article.url);
    } catch (error) {
      console.warn('No se pudo abrir la noticia guardada:', error);
    }
  };

  return <Card style={styles.articleCard}>
    <Pressable accessibilityRole="link" accessibilityLabel={`Abrir noticia: ${article.title}`} onPress={() => void openArticle()} style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}>
      <View style={[styles.articleImage, { backgroundColor: colors.surface }]}>
        {showImage
          ? <Image source={{ uri: article.image as string }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImageFailed(true)} />
          : <View style={styles.imagePlaceholder}><AppText size={20} weight="bold" color={colors.primary}>MX</AppText><AppText size={11} color={colors.muted}>My Liga MX</AppText></View>}
      </View>
      <View style={styles.articleCopy}>
        <AppText size={17} weight="bold">{article.title}</AppText>
        <AppText size={12} color={colors.muted}>{article.sourceName} · {formatPublishedAt(article.publishedAt)}</AppText>
        {article.description ? <Text numberOfLines={3} style={{ color: colors.muted, fontSize: 13 }}>{article.description}</Text> : null}
      </View>
    </Pressable>
    {saveControl ? <View style={styles.saveControl}>{saveControl}</View> : null}
  </Card>;
}

function formatPublishedAt(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Fecha no disponible';
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (elapsed < 60 * 60_000) return `Hace ${Math.max(1, minutes)} min`;
  const hours = Math.floor(elapsed / (60 * 60_000));
  if (elapsed < 24 * 60 * 60_000) return `Hace ${hours} h`;
  const publishedDay = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (publishedDay.toDateString() === yesterday.toDateString()) return 'Ayer';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(publishedDay);
}

const styles = StyleSheet.create({
  articleCard: { padding: 0, overflow: 'hidden', marginBottom: 14, borderRadius: 18, position: 'relative' },
  articleImage: { width: '100%', height: 168, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder: { alignItems: 'center', gap: 4 },
  articleCopy: { padding: 14, gap: 7 },
  saveControl: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
});
