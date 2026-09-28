import React from 'react';
import { View } from 'react-native';
import { NewsArticleCard } from '../../components/NewsArticleCard';
import { NewsSaveButton } from '../../components/NewsSaveButton';
import { AppText, Screen, StateView } from '../../components/ui';
import { useAuth } from '../../src/context/AuthProvider';
import { useSavedNews } from '../../src/hooks/useSavedNews';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function SavedNewsScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { session } = useAuth();
  const savedNews = useSavedNews();

  if (!session) return <Screen><AppText size={30} weight="bold">Noticias guardadas</AppText><StateView kind="error" message="Inicia sesión para consultar tus noticias guardadas." /></Screen>;
  if (savedNews.isLoading) return <Screen><AppText size={30} weight="bold">Noticias guardadas</AppText><StateView kind="loading" /></Screen>;
  if (savedNews.isError) return <Screen><AppText size={30} weight="bold">Noticias guardadas</AppText><AppText color={colors.muted}>Tus artículos para leer después.</AppText><StateView kind="error" message="No pudimos cargar tus noticias guardadas." onRetry={() => void savedNews.refetch()} /></Screen>;

  return <Screen refreshing={savedNews.isRefetching} onRefresh={() => void savedNews.refetch()}>
    <AppText size={30} weight="bold">Noticias guardadas</AppText>
    <AppText color={colors.muted} style={{ marginBottom: 16 }}>Tus artículos para leer después.</AppText>
    {savedNews.data?.length
      ? savedNews.data.map((article) => <NewsArticleCard
        key={article.url}
        article={article}
        saveControl={<NewsSaveButton
          isSaved
          pending={savedNews.toggleMutation.isPending && savedNews.toggleMutation.variables?.article.url === article.url}
          onPress={() => savedNews.toggleMutation.mutate({ article, shouldSave: false })}
        />}
      />)
      : <View style={{ minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <AppText size={14} weight="bold">No tienes noticias guardadas.</AppText>
        <AppText color={colors.muted} style={{ textAlign: 'center' }}>Guarda noticias para leerlas después.</AppText>
      </View>}
  </Screen>;
}
