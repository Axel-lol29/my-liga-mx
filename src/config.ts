export const APP_CONFIG = {
  leagueId: 262,
  season: Number(process.env.EXPO_PUBLIC_LEAGUE_SEASON ?? 2024),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  hasSupabase: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
} as const;
export const QUERY_CONFIG = { staleTime: 1000 * 60 * 5, retry: 1 } as const;
