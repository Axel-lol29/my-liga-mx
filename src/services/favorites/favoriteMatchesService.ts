import { supabase, getSupabaseConfigError } from '../../lib/supabase';
import { Fixture } from '../../types';
import { localMatchDateTimeParts } from '../../utils/matchDateTime';

export interface FavoriteMatch {
  id: string;
  userId: string;
  eventId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamBadge: string | null;
  awayTeamBadge: string | null;
  eventDate: string | null;
  eventTime: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: string;
}

interface FavoriteMatchRow {
  id: string;
  user_id: string;
  event_id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_badge: string | null;
  away_team_badge: string | null;
  event_date: string | null;
  event_time: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
}

function favoriteFromRow(row: FavoriteMatchRow): FavoriteMatch {
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    homeTeamName: row.home_team_name,
    awayTeamName: row.away_team_name,
    homeTeamBadge: row.home_team_badge,
    awayTeamBadge: row.away_team_badge,
    eventDate: row.event_date,
    eventTime: row.event_time,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    createdAt: row.created_at,
  };
}

function fixtureSnapshot(userId: string, fixture: Fixture): Omit<FavoriteMatchRow, 'id' | 'created_at'> {
  const eventId = fixture.idEvent?.trim();
  if (!eventId) throw new Error('Este partido no tiene un idEvent válido.');

  const { date: eventDate, time: eventTime } = localMatchDateTimeParts(fixture.timestamp, fixture.date);
  return {
    user_id: userId,
    event_id: eventId,
    home_team_name: fixture.homeTeam.name,
    away_team_name: fixture.awayTeam.name,
    home_team_badge: fixture.homeTeam.logo,
    away_team_badge: fixture.awayTeam.logo,
    event_date: eventDate,
    event_time: eventTime,
    status: fixture.statusShort || fixture.status,
    home_score: fixture.homeGoals,
    away_score: fixture.awayGoals,
  };
}

function ensureSupabase() {
  if (!supabase) throw getSupabaseConfigError();
  return supabase;
}

export async function getFavoriteMatches(userId: string): Promise<FavoriteMatch[]> {
  const client = ensureSupabase();
  const { data, error } = await client.from('favorite_matches').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'No pudimos cargar tus partidos guardados.');
  return ((data ?? []) as FavoriteMatchRow[]).map(favoriteFromRow);
}

export async function isFavoriteMatch(userId: string, eventId: string): Promise<boolean> {
  const client = ensureSupabase();
  const { data, error } = await client.from('favorite_matches').select('id').eq('user_id', userId).eq('event_id', eventId).maybeSingle();
  if (error) throw new Error(error.message || 'No pudimos consultar el partido guardado.');
  return Boolean(data);
}

export async function addFavoriteMatch(userId: string, fixture: Fixture): Promise<void> {
  const client = ensureSupabase();
  const { error } = await client.from('favorite_matches').upsert(fixtureSnapshot(userId, fixture), { onConflict: 'user_id,event_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message || 'No pudimos guardar el partido.');
}

export async function removeFavoriteMatch(userId: string, eventId: string): Promise<void> {
  const client = ensureSupabase();
  const { error } = await client.from('favorite_matches').delete().eq('user_id', userId).eq('event_id', eventId);
  if (error) throw new Error(error.message || 'No pudimos quitar el partido guardado.');
}
