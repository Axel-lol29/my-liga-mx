import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppText, Card, Screen, StateView } from '../../components/ui';
import { useAuth } from '../../src/context/AuthProvider';
import { getTeamByInternalId, LigaMxTeam } from '../../src/constants/ligaMxTeams';
import { useNews } from '../../src/hooks/useData';
import { NewsArticle } from '../../src/types';
import { useTheme } from '../../src/theme/ThemeProvider';

type NewsMode = 'team' | 'league';

export default function NewsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { profile, loading: authLoading } = useAuth();
  const favoriteTeam = getTeamByInternalId(profile?.favoriteTeamId);
  const [manualMode, setManualMode] = useState<NewsMode | null>(null);
  const mode: NewsMode = manualMode ?? (favoriteTeam ? 'team' : 'league');
  const missingFavorite = mode === 'team' && !favoriteTeam;
  const request = mode === 'team' && favoriteTeam
    ? { mode: 'team' as const, teamName: favoriteTeam.canonicalName, teamAliases: newsAliases(favoriteTeam) }
    : mode === 'league' ? { mode: 'league' as const } : undefined;
  const query = useNews(request, !authLoading && !missingFavorite);
  const [lastValidArticles, setLastValidArticles] = useState<NewsArticle[]>([]);
  useEffect(() => {
    if (query.data?.length) setLastValidArticles(query.data);
    else if (query.data && !query.isError) setLastValidArticles([]);
  }, [query.data, query.isError]);
  const showingPreviousArticles = Boolean(query.isError && !query.data?.length && lastValidArticles.length);
  const visibleArticles = query.data?.length ? query.data : showingPreviousArticles ? lastValidArticles : [];

  const openArticle = async (url: string): Promise<void> => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('No se pudo abrir el artículo:', error);
    }
  };

  return <Screen
    refreshing={query.isRefetching}
    onRefresh={missingFavorite ? undefined : () => void query.refetch()}
  >
    <AppText size={30} weight="bold">NOTICIAS</AppText>
    <AppText color={colors.muted}>Lo último alrededor de la Liga MX</AppText>

    <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SegmentButton label="Mi equipo" active={mode === 'team'} onPress={() => setManualMode('team')} />
      <SegmentButton label="Liga MX" active={mode === 'league'} onPress={() => setManualMode('league')} />
    </View>

    {authLoading
      ? <NewsLoading />
      : missingFavorite
      ? <StateView kind="empty" message="Selecciona un equipo favorito para ver sus noticias." />
      : query.isLoading
        ? <NewsLoading />
        : query.isError && !visibleArticles.length
          ? <StateView kind="error" message="No pudimos cargar las noticias." onRetry={() => void query.refetch()} />
          : !visibleArticles.length
            ? <StateView kind="empty" message="No encontramos noticias recientes." />
            : <>
              {showingPreviousArticles ? <AppText size={12} color={colors.muted} style={styles.staleNotice}>No se pudieron actualizar; se conservan las noticias anteriores.</AppText> : null}
              {visibleArticles.map((article) => <ArticleCard key={article.id} article={article} onPress={() => void openArticle(article.url)} />)}
            </>}
  </Screen>;
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  return <Pressable
    accessibilityRole="tab"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[styles.segmentButton, active ? { backgroundColor: colors.primary } : null]}
  >
    <AppText size={13} weight="bold" color={active ? '#FFFFFF' : colors.muted}>{label}</AppText>
  </Pressable>;
}

function ArticleCard({ article, onPress }: { article: NewsArticle; onPress: () => void }): React.JSX.Element {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(article.image && !imageFailed);

  return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}>
    <Card style={styles.articleCard}>
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
    </Card>
  </Pressable>;
}

function NewsLoading(): React.JSX.Element {
  const { colors } = useTheme();
  return <View accessibilityLabel="Cargando noticias">
    {[0, 1, 2].map((item) => <Card key={item} style={styles.skeletonCard}>
      <View style={[styles.skeletonImage, { backgroundColor: colors.surface }]} />
      <View style={styles.skeletonCopy}>
        <View style={[styles.skeletonLine, styles.skeletonTitle, { backgroundColor: colors.surface }]} />
        <View style={[styles.skeletonLine, styles.skeletonMeta, { backgroundColor: colors.surface }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.surface }]} />
      </View>
    </Card>)}
  </View>;
}

function newsAliases(team: LigaMxTeam): string[] {
  const extraAliases: Record<string, string[]> = {
    'américa': ['Club América', 'Club America'],
    'cd guadalajara': ['Chivas', 'Guadalajara Chivas'],
    'pumas unam': ['Pumas', 'UNAM'],
    'atlético de san luis': ['Atlético San Luis', 'Atletico San Luis'],
    'puebla': ['Club Puebla', 'Puebla FC'],
  };
  return [...new Set([team.canonicalName, ...team.aliases, ...(extraAliases[team.canonicalName.toLocaleLowerCase('es-MX')] ?? [])])];
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
  segment: { flexDirection: 'row', padding: 4, borderWidth: 1, borderRadius: 14, marginTop: 18, marginBottom: 16, gap: 4 },
  staleNotice: { marginBottom: 9 },
  segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 8 },
  articleCard: { padding: 0, overflow: 'hidden', marginBottom: 14, borderRadius: 18 },
  articleImage: { width: '100%', height: 168, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholder: { alignItems: 'center', gap: 4 },
  articleCopy: { padding: 14, gap: 7 },
  skeletonCard: { padding: 0, overflow: 'hidden', marginBottom: 14 },
  skeletonImage: { height: 168, width: '100%' },
  skeletonCopy: { padding: 14, gap: 10 },
  skeletonLine: { height: 11, borderRadius: 6, width: '100%' },
  skeletonTitle: { height: 17, width: '88%' },
  skeletonMeta: { width: '50%' },
});
