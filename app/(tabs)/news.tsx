import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, Screen, StateView } from '../../components/ui';
import { NewsArticleCard } from '../../components/NewsArticleCard';
import { NewsSaveButton } from '../../components/NewsSaveButton';
import { useAuth } from '../../src/context/AuthProvider';
import { getTeamByInternalId, LigaMxTeam } from '../../src/constants/ligaMxTeams';
import { useNews } from '../../src/hooks/useData';
import { NewsArticle } from '../../src/types';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useSavedNews } from '../../src/hooks/useSavedNews';

type NewsMode = 'team' | 'league';

export default function NewsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { profile, loading: authLoading, session } = useAuth();
  const savedNews = useSavedNews();
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
              {visibleArticles.map((article) => {
                const isSaved = savedNews.isSaved(article.url);
                return <NewsArticleCard
                  key={article.id}
                  article={article}
                  onPress={() => void openArticle(article.url)}
                  saveControl={<NewsSaveButton
                    isSaved={isSaved}
                    pending={savedNews.toggleMutation.isPending && savedNews.toggleMutation.variables?.article.url === article.url}
                    disabled={!session || savedNews.isLoading || savedNews.isError}
                    onPress={() => savedNews.toggleMutation.mutate({ article, shouldSave: !isSaved })}
                  />}
                />;
              })}
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

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', padding: 4, borderWidth: 1, borderRadius: 14, marginTop: 18, marginBottom: 16, gap: 4 },
  staleNotice: { marginBottom: 9 },
  segmentButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingHorizontal: 8 },
  skeletonCard: { padding: 0, overflow: 'hidden', marginBottom: 14 },
  skeletonImage: { height: 168, width: '100%' },
  skeletonCopy: { padding: 14, gap: 10 },
  skeletonLine: { height: 11, borderRadius: 6, width: '100%' },
  skeletonTitle: { height: 17, width: '88%' },
  skeletonMeta: { width: '50%' },
});
