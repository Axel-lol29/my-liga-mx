import { MatchStatistic } from '../../types';
import { footballRequest } from './apiFootballClient';
import { mapStatistics } from './mappers';
interface ApiResponse { response?: unknown[]; }
export async function getFixtureStatistics(id: number): Promise<MatchStatistic[]> { const response = await footballRequest<ApiResponse>({ resource: 'fixtures/statistics', params: { fixture: id } }); return mapStatistics(response); }
