import { APP_CONFIG } from '../../config';
import { Team } from '../../types';
import { footballRequest } from './apiFootballClient';
import { mapTeam } from './mappers';
interface ApiResponse { response?: unknown[]; }
export async function getTeams(): Promise<Team[]> { const response = await footballRequest<ApiResponse>({ resource: 'teams', params: { league: APP_CONFIG.leagueId, season: APP_CONFIG.season } }); return Array.isArray(response.response) ? response.response.map(mapTeam).filter((team) => team.id > 0) : []; }
export async function getTeam(id: number): Promise<Team | null> { const response = await footballRequest<ApiResponse>({ resource: 'teams', params: { id } }); const raw = response.response?.[0]; return raw ? mapTeam(raw) : null; }
