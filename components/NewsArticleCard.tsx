import React from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { NewsArticle } from '../src/types';
import { useTheme } from '../src/theme/ThemeProvider';
import { AppText, Card } from './ui';
import { useNewsSummary } from '../src/hooks/useNewsSummary';

export function NewsArticleCard({ article, onPress, saveControl }: { article: NewsArticle; onPress?: () => void; saveControl?: React.ReactNode }): React.JSX.Element {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = React.useState(false);
  const newsSummary = useNewsSummary(article);
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
    <View style={styles.summarySection}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: newsSummary.expanded, disabled: newsSummary.isFetching }}
        disabled={newsSummary.isFetching}
        onPress={() => {
          if (newsSummary.isError || newsSummary.data?.pending) void newsSummary.load();
          else newsSummary.toggle();
        }}
        style={({ pressed }) => [styles.summaryAction, { borderColor: colors.border, backgroundColor: colors.surface, opacity: newsSummary.isFetching ? 0.65 : pressed ? 0.75 : 1 }]}
      >
        {newsSummary.isFetching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        <AppText size={13} weight="bold" color={colors.primaryLight}>
          {newsSummary.isFetching ? 'Generando resumen…' : newsSummary.isError ? 'Reintentar resumen IA' : newsSummary.data?.pending ? 'Revisar resumen IA' : newsSummary.expanded ? 'Ocultar resumen IA' : newsSummary.data?.summary ? 'Ver resumen IA' : 'Resumir con IA'}
        </AppText>
      </Pressable>
      {newsSummary.expanded ? <View style={[styles.summaryPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AppText size={14} weight="bold">Resumen IA</AppText>
        {newsSummary.isFetching ? <AppText size={13} color={colors.muted}>Generando resumen…</AppText> : null}
        {newsSummary.data?.summary ? <>
          <AppText size={13} color={colors.muted}>{newsSummary.data.summary}</AppText>
          {newsSummary.data.highlights.length > 0 ? <View style={styles.highlights}>
            <AppText size={12} weight="bold">Puntos clave</AppText>
            {newsSummary.data.highlights.map((highlight, index) => <View key={`${newsSummary.data?.generatedAt ?? article.url}-${index}`} style={styles.highlightRow}>
              <AppText size={13} color={colors.primaryLight}>•</AppText>
              <AppText size={12} color={colors.muted} style={styles.highlightText}>{highlight}</AppText>
            </View>)}
          </View> : null}
          <AppText size={11} color={colors.muted}>Generado con IA a partir del contenido disponible. Resumen basado en la información disponible.</AppText>
        </> : null}
        {newsSummary.data?.pending ? <AppText size={12} color={colors.muted}>El resumen se está generando. Intenta de nuevo en un momento.</AppText> : null}
        {newsSummary.isError && !newsSummary.isFetching ? <View style={styles.summaryError}>
          <AppText size={12} color={colors.danger}>No pudimos generar el resumen.</AppText>
          <Pressable accessibilityRole="button" disabled={newsSummary.isFetching} onPress={() => void newsSummary.load()} hitSlop={8} style={styles.retryAction}>
            <AppText size={12} color={colors.primaryLight} weight="bold">Reintentar</AppText>
          </Pressable>
        </View> : null}
        {!newsSummary.isFetching && !newsSummary.isError && !newsSummary.data?.summary && !newsSummary.data?.pending ? <AppText size={12} color={colors.muted}>No hay un resumen disponible todavía.</AppText> : null}
      </View> : null}
    </View>
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
  summarySection: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  summaryAction: { minHeight: 42, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 },
  summaryPanel: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 14 },
  highlights: { gap: 5, marginTop: 2 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  highlightText: { flex: 1 },
  summaryError: { gap: 4 },
  retryAction: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
  saveControl: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
});
