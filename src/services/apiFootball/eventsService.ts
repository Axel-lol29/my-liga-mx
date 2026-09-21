import { FixtureEvent } from '../../types';
import { footballRequest } from './apiFootballClient';
import { mapEvent } from './mappers';
interface ApiResponse { response?: unknown[]; }
export async function getFixtureEvents(id: number): Promise<FixtureEvent[]> { const response = await footballRequest<ApiResponse>({ resource: 'fixtures/events', params: { fixture: id } }); return Array.isArray(response.response) ? response.response.map(mapEvent) : []; }
