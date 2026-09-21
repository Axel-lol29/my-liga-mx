import { Team } from '../../types';

export const SPORTS_DB_LEAGUE_ID = '4350';
export const SPORTS_DB_SEASON = '2026-2027';

export interface TeamCatalogEntry {
  internalId: string | null;
  sportsDbId: string;
  canonicalName: string;
  aliases: readonly string[];
}

export const LIGA_MX_TEAM_CATALOG: readonly TeamCatalogEntry[] = [
  { internalId: null, sportsDbId: '134193', canonicalName: 'América', aliases: ['america', 'club america', 'cf america'] },
  { internalId: '2283', sportsDbId: '134195', canonicalName: 'Atlas', aliases: ['atlas', 'atlas fc'] },
  { internalId: '2314', sportsDbId: '136856', canonicalName: 'Atlético de San Luis', aliases: ['atletico de san luis', 'atletico san luis', 'san luis'] },
  { internalId: null, sportsDbId: '134206', canonicalName: 'CD Guadalajara', aliases: ['chivas', 'guadalajara', 'guadalajara chivas', 'cd guadalajara'] },
  { internalId: null, sportsDbId: '134196', canonicalName: 'Cruz Azul', aliases: ['cruz azul'] },
  { internalId: null, sportsDbId: '136855', canonicalName: 'Juárez', aliases: ['juarez', 'fc juarez', 'bravos de juarez'] },
  { internalId: '2289', sportsDbId: '134207', canonicalName: 'León', aliases: ['leon', 'club leon', 'leon fc'] },
  { internalId: '2282', sportsDbId: '134198', canonicalName: 'Monterrey', aliases: ['monterrey', 'rayados', 'cf monterrey'] },
  { internalId: null, sportsDbId: '135662', canonicalName: 'Necaxa', aliases: ['necaxa', 'club necaxa'] },
  { internalId: null, sportsDbId: '134191', canonicalName: 'Pachuca', aliases: ['pachuca', 'club pachuca'] },
  { internalId: '2291', sportsDbId: '134199', canonicalName: 'Puebla', aliases: ['puebla', 'club puebla'] },
  { internalId: null, sportsDbId: '134201', canonicalName: 'Pumas UNAM', aliases: ['pumas', 'pumas unam', 'unam pumas', 'u.n.a.m. - pumas'] },
  { internalId: null, sportsDbId: '134194', canonicalName: 'Querétaro', aliases: ['queretaro', 'queretaro fc', 'gallos blancos'] },
  { internalId: null, sportsDbId: '134192', canonicalName: 'Santos Laguna', aliases: ['santos', 'santos laguna'] },
  { internalId: '2279', sportsDbId: '134197', canonicalName: 'Tigres UANL', aliases: ['tigres', 'tigres uanl', 'uanl tigres'] },
  { internalId: null, sportsDbId: '134202', canonicalName: 'Tijuana', aliases: ['tijuana', 'club tijuana', 'xolos'] },
  { internalId: '2281', sportsDbId: '134204', canonicalName: 'Toluca', aliases: ['toluca', 'deportivo toluca', 'deportivo toluca fc'] },
  { internalId: null, sportsDbId: '134203', canonicalName: 'Atlante', aliases: ['atlante', 'atlante fc'] },
];

export const LIGA_MX_TEAM_MAPPING = LIGA_MX_TEAM_CATALOG;

export function normalizeTeamName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export type TeamIdentifier = string | number | { id?: string | number | null; name?: string | null };

export function resolveTeam(identifier: TeamIdentifier): TeamCatalogEntry | null {
  const receivedValue = typeof identifier === 'object' ? identifier.id : identifier;
  const receivedName = typeof identifier === 'object' ? identifier.name : null;
  const idValue = receivedValue === null || receivedValue === undefined ? '' : String(receivedValue).trim();
  const sportsDbMatch = LIGA_MX_TEAM_CATALOG.find((entry) => entry.sportsDbId === idValue);
  if (sportsDbMatch) return sportsDbMatch;
  const internalMatch = LIGA_MX_TEAM_CATALOG.find((entry) => entry.internalId === idValue);
  if (internalMatch) return internalMatch;
  const nameValue = typeof identifier === 'string' ? identifier : receivedName ?? '';
  const normalizedName = normalizeTeamName(nameValue);
  if (!normalizedName) return null;
  return LIGA_MX_TEAM_CATALOG.find((entry) => normalizeTeamName(entry.canonicalName) === normalizedName || entry.aliases.some((alias) => normalizeTeamName(alias) === normalizedName)) ?? null;
}

export function getSportsDbTeamId(team: Pick<Team, 'id' | 'name'>): string | null {
  return resolveTeam(team)?.sportsDbId ?? null;
}
