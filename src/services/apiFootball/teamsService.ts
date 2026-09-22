import { APP_CONFIG } from '../../config';
import { Team } from '../../types';
import { footballRequest } from './apiFootballClient';
import { mapTeam } from './mappers';
interface ApiResponse { response?: unknown[]; }
export async function getTeams(): Promise<Team[]> {
  const league = APP_CONFIG.legacyTeamCatalogLeagueId;
  const season = APP_CONFIG.legacyTeamCatalogSeason;
  console.log('SELECT TEAM LEGACY REQUEST', { league, season });
  try {
    const response = await footballRequest<ApiResponse>({ resource: 'teams', params: { league, season } });
    const teams = Array.isArray(response.response) ? response.response.map(mapTeam).filter((team) => team.id > 0) : [];
    console.log('SELECT TEAM LEGACY RESPONSE', { count: teams.length, teams });
    return teams;
  } catch (error) {
    console.error('SELECT TEAM LEGACY ERROR', error);
    throw error;
  }
}
export async function getTeam(id: number): Promise<Team | null> { const response = await footballRequest<ApiResponse>({ resource: 'teams', params: { id } }); const raw = response.response?.[0]; return raw ? mapTeam(raw) : null; }
