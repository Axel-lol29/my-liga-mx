export interface SportsDbDateFields {
  strTimestamp?: string | number | null;
  dateEvent?: string | null;
  strTime?: string | null;
}

export interface MatchDateTimeParts {
  date: string;
  time: string;
  timestamp: number | null;
}

function parseSportsDbTimestamp(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;
    return Number.isFinite(new Date(milliseconds).getTime()) ? milliseconds : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;
  if (/^\d{10,13}$/.test(normalized)) {
    const numeric = Number(normalized);
    const milliseconds = normalized.length <= 10 ? numeric * 1000 : numeric;
    return Number.isFinite(new Date(milliseconds).getTime()) ? milliseconds : null;
  }
  const isoDateTime = normalized.replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(isoDateTime)) return null;
  // TheSportsDB normalizes soccer strTimestamp without an offset; its soccer times are UTC.
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(isoDateTime) ? isoDateTime : `${isoDateTime}Z`;
  const timestamp = Date.parse(withZone);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function parseSportsDbEventDate(event: SportsDbDateFields): MatchDateTimeParts {
  let timestamp = parseSportsDbTimestamp(event.strTimestamp);
  if (timestamp === null && event.dateEvent && event.strTime) {
    const date = event.dateEvent.trim();
    const time = event.strTime.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)
      && /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(time)) {
      const dateTime = `${date}T${time}`;
      timestamp = parseSportsDbTimestamp(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(time) ? dateTime : `${dateTime}Z`);
    }
  }
  if (timestamp === null) return { date: '', time: '', timestamp: null };
  const iso = new Date(timestamp).toISOString();
  return { date: iso, time: iso.slice(11, 19), timestamp };
}

export function parseSavedMatchDateTime(date: string | null, time: string | null): number | null {
  if (!date) return null;
  const combined = `${date.trim()}T${time?.trim() || '00:00:00'}`;
  // Saved rows predate canonical timestamps and use wall-clock values; retain their
  // existing local interpretation unless the stored value explicitly carries an offset.
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(combined)) return parseSportsDbTimestamp(combined);
  const legacyLocal = Date.parse(combined);
  return Number.isFinite(legacyLocal) ? legacyLocal : null;
}

export function localMatchDateTimeParts(timestamp: number | null, fallbackDate: string): { date: string | null; time: string | null } {
  const instant = timestamp !== null && Number.isFinite(timestamp)
    ? new Date(timestamp)
    : (() => {
      const parsed = Date.parse(fallbackDate);
      return Number.isFinite(parsed) ? new Date(parsed) : null;
    })();
  if (!instant || !Number.isFinite(instant.getTime())) {
    const [date = '', time = ''] = fallbackDate.split('T');
    return { date: date || null, time: time.match(/^\d{2}:\d{2}(?::\d{2})?/)?.[0] || null };
  }
  const pad = (value: number): string => String(value).padStart(2, '0');
  return {
    date: `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}:${pad(instant.getSeconds())}`,
  };
}

export function formatMatchTime(timestamp: number | null, fallbackDate = ''): string | null {
  const instant = timestamp !== null && Number.isFinite(timestamp)
    ? new Date(timestamp)
    : (() => {
      const parsed = Date.parse(fallbackDate);
      return Number.isFinite(parsed) ? new Date(parsed) : null;
    })();
  if (!instant || !Number.isFinite(instant.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(instant);
}

export function formatCompactMatchDateTime(timestamp: number | null, fallbackDate = ''): string | null {
  const instant = timestamp !== null && Number.isFinite(timestamp)
    ? new Date(timestamp)
    : (() => {
      const parsed = Date.parse(fallbackDate);
      return Number.isFinite(parsed) ? new Date(parsed) : null;
    })();
  if (!instant || !Number.isFinite(instant.getTime())) return null;

  const includeYear = instant.getFullYear() !== new Date().getFullYear();
  const date = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(instant);
  const time = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(instant);
  return `${date} · ${time}`;
}

export function formatMatchDateTime(timestamp: number | null, fallbackDate = ''): string | null {
  const instant = timestamp !== null && Number.isFinite(timestamp)
    ? new Date(timestamp)
    : (() => {
      const parsed = Date.parse(fallbackDate);
      return Number.isFinite(parsed) ? new Date(parsed) : null;
    })();
  if (!instant || !Number.isFinite(instant.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(instant);
}
