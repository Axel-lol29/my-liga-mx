import { Fixture, MatchStatistic } from '../../types';

const STATISTIC_LABELS: Record<string, { label: string; order: number }> = {
  'ball possession': { label: 'Posesión', order: 1 },
  'total shots': { label: 'Tiros totales', order: 2 },
  'shots on goal': { label: 'Tiros a puerta', order: 3 },
  'passes accurate': { label: 'Pases acertados', order: 4 },
  'corner kicks': { label: 'Tiros de esquina', order: 5 },
  fouls: { label: 'Faltas', order: 6 },
  'yellow cards': { label: 'Tarjetas amarillas', order: 7 },
  'red cards': { label: 'Tarjetas rojas', order: 8 },
  'shots insidebox': { label: 'Tiros dentro del área', order: 9 },
  'shots outsidebox': { label: 'Tiros fuera del área', order: 10 },
  'blocked shots': { label: 'Tiros bloqueados', order: 11 },
  'free kicks': { label: 'Tiros libres', order: 12 },
  'goalkeeper saves': { label: 'Atajadas', order: 13 },
  'passes total': { label: 'Pases totales', order: 14 },
  'passes percent': { label: 'Precisión de pases', order: 15 },
};

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Portero',
  keeper: 'Portero',
  defender: 'Defensa',
  'centre back': 'Defensa central',
  'center back': 'Defensa central',
  'right back': 'Lateral derecho',
  'left back': 'Lateral izquierdo',
  midfielder: 'Mediocampista',
  'central midfield': 'Mediocampista central',
  'attacking midfield': 'Mediocampista ofensivo',
  'defensive midfield': 'Mediocampista defensivo',
  'left wing': 'Extremo izquierdo',
  'right wing': 'Extremo derecho',
  forward: 'Delantero',
  striker: 'Delantero',
  'centre forward': 'Delantero centro',
  'center forward': 'Delantero centro',
};

function statisticKey(label: string): string {
  return label.toLowerCase().replace('%', ' percent').replace(/[^a-z0-9]+/g, ' ').trim();
}

function positionKey(position: string): string {
  return position.toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function translatePlayerPosition(position: string | null | undefined): string | null {
  if (!position?.trim()) return null;
  return POSITION_LABELS[positionKey(position)] ?? position.trim();
}

export function translateAndSortStatistics(statistics: MatchStatistic[]): MatchStatistic[] {
  return statistics.map((statistic, index) => {
    const translation = STATISTIC_LABELS[statisticKey(statistic.label)];
    return { ...statistic, label: translation?.label ?? statistic.label, sortOrder: translation?.order ?? 1000, sourceIndex: index };
  }).sort((left, right) => (left.sortOrder as number) - (right.sortOrder as number) || (left.sourceIndex as number) - (right.sourceIndex as number)).map(({ sortOrder: _sortOrder, sourceIndex: _sourceIndex, ...statistic }) => statistic);
}

const STATUS_LABELS: Record<string, string> = { '1H': '1T', HT: 'Descanso', '2H': '2T', FT: 'Final', NS: 'Próximo', AET: 'Final', PEN: 'Final', PST: 'Pospuesto', CANC: 'Cancelado' };

export function getMatchStatusLabel(fixture: Pick<Fixture, 'status' | 'statusShort'>): string {
  const rawStatus = fixture.statusShort.trim().toUpperCase();
  const translated = STATUS_LABELS[rawStatus] ?? rawStatus;
  return fixture.status === 'live' ? (translated && translated !== rawStatus ? `EN VIVO · ${translated}` : 'EN VIVO') : translated || (fixture.status === 'scheduled' ? 'Próximo' : '—');
}
