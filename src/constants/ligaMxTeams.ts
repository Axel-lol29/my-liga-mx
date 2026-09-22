import { Team } from '../types';

export interface LigaMxTeam {
  internalId: string;
  sportsDbId: string;
  canonicalName: string;
  name: string;
  displayName: string;
  aliases: readonly string[];
  city: string | null;
  badge: string | null;
  stadium: string | null;
}

export const LIGA_MX_TEAMS: readonly LigaMxTeam[] = [
  { internalId: '2281', sportsDbId: '134204', canonicalName: 'Toluca', name: 'Toluca', displayName: 'Toluca', aliases: ['Toluca'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/y64wy91523913186.png/tiny', stadium: null },
  { internalId: '2282', sportsDbId: '134198', canonicalName: 'Monterrey', name: 'Monterrey', displayName: 'Monterrey', aliases: ['Monterrey', 'Rayados'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/yglj911721542561.png/tiny', stadium: null },
  { internalId: '2283', sportsDbId: '134195', canonicalName: 'Atlas', name: 'Atlas', displayName: 'Atlas', aliases: ['Atlas'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/svvyvw1473541813.png/tiny', stadium: null },
  { internalId: '2279', sportsDbId: '134197', canonicalName: 'Tigres UANL', name: 'Tigres UANL', displayName: 'Tigres UANL', aliases: ['Tigres', 'Tigres UANL'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/lh80fx1701423708.png/tiny', stadium: null },
  { internalId: '2289', sportsDbId: '134207', canonicalName: 'León', name: 'León', displayName: 'León', aliases: ['León', 'Leon'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/pc9gro1752393439.png/tiny', stadium: null },
  { internalId: '2291', sportsDbId: '134199', canonicalName: 'Puebla', name: 'Puebla', displayName: 'Puebla', aliases: ['Puebla'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/h0jgg51593451845.png/tiny', stadium: null },
  { internalId: '2314', sportsDbId: '136856', canonicalName: 'Atlético de San Luis', name: 'Atlético de San Luis', displayName: 'Atlético de San Luis', aliases: ['Atlético de San Luis', 'Atletico de San Luis', 'Atlético San Luis'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/9kgjme1593448412.png/tiny', stadium: null },
  { internalId: '2287', sportsDbId: '134193', canonicalName: 'América', name: 'América', displayName: 'América', aliases: ['América', 'America', 'Club America'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/amy1xs1581857392.png/tiny', stadium: null },
  { internalId: '2278', sportsDbId: '134206', canonicalName: 'CD Guadalajara', name: 'CD Guadalajara', displayName: 'CD Guadalajara', aliases: ['CD Guadalajara', 'Guadalajara', 'Guadalajara Chivas', 'Chivas'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/mp1box1593452087.png/tiny', stadium: null },
  { internalId: '2295', sportsDbId: '134196', canonicalName: 'Cruz Azul', name: 'Cruz Azul', displayName: 'Cruz Azul', aliases: ['Cruz Azul'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/wcd2yi1781543370.png/tiny', stadium: null },
  { internalId: '2286', sportsDbId: '134201', canonicalName: 'Pumas UNAM', name: 'Pumas UNAM', displayName: 'Pumas UNAM', aliases: ['Pumas UNAM', 'U.N.A.M. - Pumas', 'Pumas'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/o01nvl1695734937.png/tiny', stadium: null },
  { internalId: '2292', sportsDbId: '134191', canonicalName: 'Pachuca', name: 'Pachuca', displayName: 'Pachuca', aliases: ['Pachuca', 'CF Pachuca'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/k9duyw1747334895.png/tiny', stadium: null },
  { internalId: '2285', sportsDbId: '134192', canonicalName: 'Santos Laguna', name: 'Santos Laguna', displayName: 'Santos Laguna', aliases: ['Santos Laguna', 'Santos'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/kg9gzh1779771734.png/tiny', stadium: null },
  { internalId: '2290', sportsDbId: '134194', canonicalName: 'Querétaro', name: 'Querétaro', displayName: 'Querétaro', aliases: ['Querétaro', 'Queretaro', 'Club Queretaro'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/024n481781543211.png/tiny', stadium: null },
  { internalId: '2280', sportsDbId: '134202', canonicalName: 'Tijuana', name: 'Tijuana', displayName: 'Tijuana', aliases: ['Tijuana', 'Club Tijuana', 'Xolos'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/b0mky81779772352.png/tiny', stadium: null },
  { internalId: '2298', sportsDbId: '136855', canonicalName: 'Juárez', name: 'Juárez', displayName: 'Juárez', aliases: ['Juárez', 'Juarez', 'FC Juarez'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/b4oy071567446336.png/tiny', stadium: null },
  { internalId: '2288', sportsDbId: '135662', canonicalName: 'Necaxa', name: 'Necaxa', displayName: 'Necaxa', aliases: ['Necaxa'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/tqdk9e1779772432.png/tiny', stadium: null },
  { internalId: '2312', sportsDbId: '134203', canonicalName: 'Atlante', name: 'Atlante', displayName: 'Atlante', aliases: ['Atlante', 'Atlante FC'], city: null, badge: 'https://r2.thesportsdb.com/images/media/team/badge/wcf2r51754018201.png/tiny', stadium: null },
];

export function normalizeLigaMxTeamName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getTeamByInternalId(identifier: string | number | null | undefined): LigaMxTeam | null {
  if (identifier === null || identifier === undefined) return null;
  return LIGA_MX_TEAMS.find((team) => team.internalId === String(identifier).trim()) ?? null;
}

export function getTeamBySportsDbId(identifier: string | number | null | undefined): LigaMxTeam | null {
  if (identifier === null || identifier === undefined) return null;
  return LIGA_MX_TEAMS.find((team) => team.sportsDbId === String(identifier).trim()) ?? null;
}

export function getTeamByAlias(name: string | null | undefined): LigaMxTeam | null {
  if (!name) return null;
  const normalized = normalizeLigaMxTeamName(name);
  return LIGA_MX_TEAMS.find((team) => normalizeLigaMxTeamName(team.canonicalName) === normalized || team.aliases.some((alias) => normalizeLigaMxTeamName(alias) === normalized)) ?? null;
}

export function toAppTeam(team: LigaMxTeam): Team {
  return { id: Number(team.internalId), name: team.displayName, code: null, logo: team.badge, country: 'México', founded: null, venue: team.stadium, city: team.city };
}

export const LOCAL_LIGA_MX_TEAMS: readonly Team[] = LIGA_MX_TEAMS.map(toAppTeam);
