import { APP_CONFIG } from '../../config';
import { Fixture } from '../../types';
import { footballRequest } from './apiFootballClient';
import { mapFixture } from './mappers';
interface ApiResponse { response?: unknown[]; }
export async function getFixtures(params: { teamId?: number; status?: string } = {}): Promise<Fixture[]> { const response = await footballRequest<ApiResponse>({ resource: 'fixtures', params: { league: APP_CONFIG.leagueId, season: APP_CONFIG.season, ...params } }); return Array.isArray(response.response) ? response.response.map(mapFixture).filter((fixture) => fixture.id > 0) : []; }
export async function getFixture(id: number): Promise<Fixture | null> { const response = await footballRequest<ApiResponse>({ resource: 'fixtures', params: { id } }); const raw = response.response?.[0]; return raw ? mapFixture(raw) : null; }
