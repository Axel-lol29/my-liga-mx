import { Team } from '../../types';
import { getTeamByAlias, getTeamByInternalId, getTeamBySportsDbId, LIGA_MX_TEAMS, normalizeLigaMxTeamName } from '../../constants/ligaMxTeams';

export const SPORTS_DB_LEAGUE_ID = '4350';
export const SPORTS_DB_SEASON = '2026-2027';

export interface TeamCatalogEntry {
  internalId: string;
  sportsDbId: string;
  canonicalName: string;
  aliases: readonly string[];
}

export const LIGA_MX_TEAM_CATALOG: readonly TeamCatalogEntry[] = LIGA_MX_TEAMS.map((team) => ({
  internalId: team.internalId,
  sportsDbId: team.sportsDbId,
  canonicalName: team.canonicalName,
  aliases: team.aliases,
}));

export const LIGA_MX_TEAM_MAPPING = LIGA_MX_TEAM_CATALOG;

export function normalizeTeamName(value: string): string {
  return normalizeLigaMxTeamName(value);
}

export type TeamIdentifier = string | number | { id?: string | number | null; name?: string | null };

export function resolveTeam(identifier: TeamIdentifier): TeamCatalogEntry | null {
  const receivedValue = typeof identifier === 'object' ? identifier.id : identifier;
  const receivedName = typeof identifier === 'object' ? identifier.name : null;
  const idValue = receivedValue === null || receivedValue === undefined ? '' : String(receivedValue).trim();
  const sportsDbMatch = getTeamBySportsDbId(idValue);
  if (sportsDbMatch) return LIGA_MX_TEAM_CATALOG.find((entry) => entry.sportsDbId === sportsDbMatch.sportsDbId) ?? null;
  const internalMatch = getTeamByInternalId(idValue);
  if (internalMatch) return LIGA_MX_TEAM_CATALOG.find((entry) => entry.internalId === internalMatch.internalId) ?? null;
  const nameValue = typeof identifier === 'string' ? identifier : receivedName ?? '';
  const aliasMatch = getTeamByAlias(nameValue);
  return aliasMatch ? LIGA_MX_TEAM_CATALOG.find((entry) => entry.internalId === aliasMatch.internalId) ?? null : null;
}

export function getSportsDbTeamId(team: Pick<Team, 'id' | 'name'>): string | null {
  return resolveTeam(team)?.sportsDbId ?? null;
}
