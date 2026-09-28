import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LigaMxTeam } from '../../constants/ligaMxTeams';
import { Fixture, MatchReminderMinutes } from '../../types';
import { formatMatchTime } from '../../utils/matchDateTime';

const STORAGE_KEY = '@my-liga-mx/match-notifications';
const MANUAL_REMINDERS_KEY = '@my-liga-mx/manual-match-reminders';
const CHANNEL_ID = 'match-reminders';
const REMINDER_TYPE = 'match-start';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

interface StoredMatchNotification {
  eventId: string;
  reminderType: typeof REMINDER_TYPE;
  notificationId: string;
  userId: string;
  startsAt: number;
  reminderMinutes: MatchReminderMinutes;
  title: string;
  body: string;
}

interface DesiredMatchNotification {
  eventId: string;
  userId: string;
  startsAt: number;
  reminderMinutes: MatchReminderMinutes;
  title: string;
  body: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let operationQueue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(() => undefined, () => undefined);
  return result;
}

function isNative(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function permissionState(response: Notifications.NotificationPermissionsStatus): NotificationPermissionState {
  if (response.granted) return 'granted';
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function getMatchNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNative()) return 'unsupported';
  try {
    return permissionState(await Notifications.getPermissionsAsync());
  } catch (error) {
    console.warn('No se pudo consultar el permiso de notificaciones locales.', error);
    return 'denied';
  }
}

export async function requestMatchNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNative()) return 'unsupported';
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de partidos',
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: true,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    return permissionState(await Notifications.requestPermissionsAsync());
  } catch (error) {
    console.warn('No se pudieron solicitar permisos de notificaciones locales.', error);
    return 'denied';
  }
}

function readStoredNotifications(): Promise<StoredMatchNotification[]> {
  return AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const validItems: StoredMatchNotification[] = [];
      parsed.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const record = item as Record<string, unknown>;
        const reminderType = record.reminderType;
        const reminderMinutes = record.reminderMinutes;
        if (typeof record.eventId !== 'string'
          || (reminderType !== REMINDER_TYPE && reminderType !== 'one-hour')
          || typeof record.notificationId !== 'string'
          || typeof record.userId !== 'string'
          || typeof record.startsAt !== 'number'
          || typeof record.title !== 'string'
          || typeof record.body !== 'string'
          || (reminderMinutes !== undefined && reminderMinutes !== 15 && reminderMinutes !== 30 && reminderMinutes !== 60)) return;
        validItems.push({
          eventId: record.eventId,
          reminderType: REMINDER_TYPE,
          notificationId: record.notificationId,
          userId: record.userId,
          startsAt: record.startsAt,
          reminderMinutes: reminderMinutes === 15 || reminderMinutes === 30 || reminderMinutes === 60 ? reminderMinutes : 60,
          title: record.title,
          body: record.body,
        });
      });
      return validItems;
    } catch {
      return [];
    }
  });
}

function eventTimestamp(fixture: Fixture): number | null {
  const timestamp = typeof fixture.timestamp === 'number' && Number.isFinite(fixture.timestamp) ? fixture.timestamp : Date.parse(fixture.date);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isUpcomingStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLowerCase();
  return normalized === 'ns'
    || normalized === 'scheduled'
    || normalized === 'not started'
    || normalized === 'not started yet'
    || normalized === 'tbd';
}

export function canSetMatchReminder(fixture: Fixture | null | undefined): boolean {
  if (!fixture || fixture.status !== 'scheduled' || !fixture.idEvent?.trim()) return false;
  if (!isUpcomingStatus(fixture.statusShort)) return false;
  const startsAt = eventTimestamp(fixture);
  return startsAt !== null && startsAt > Date.now();
}

function manualReminderStorageKey(userId: string): string {
  return `${MANUAL_REMINDERS_KEY}:${userId}`;
}

export async function getManualMatchReminderIds(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(manualReminderStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))];
  } catch {
    return [];
  }
}

export function setManualMatchReminder(userId: string, eventId: string, enabled: boolean): Promise<void> {
  return serialize(async () => {
    const normalizedEventId = eventId.trim();
    if (!normalizedEventId) throw new Error('El partido no tiene un idEvent válido.');
    const current = await getManualMatchReminderIds(userId);
    const next = enabled
      ? [...new Set([...current, normalizedEventId])]
      : current.filter((id) => id !== normalizedEventId);
    const key = manualReminderStorageKey(userId);
    if (next.length) await AsyncStorage.setItem(key, JSON.stringify(next));
    else await AsyncStorage.removeItem(key);
  });
}

function formatLocalTime(timestamp: number): string {
  return formatMatchTime(timestamp) ?? 'Hora no disponible';
}

function reminderDurationLabel(minutes: MatchReminderMinutes): string {
  return minutes === 60 ? '1 hora' : `${minutes} minutos`;
}

function desiredNotifications(
  userId: string,
  favoriteTeam: LigaMxTeam | null,
  fixtures: Fixture[],
  manualReminderEventIds: string[],
  reminderMinutes: MatchReminderMinutes,
): DesiredMatchNotification[] {
  const now = Date.now();
  const byEvent = new Map<string, DesiredMatchNotification>();
  const fixtureByEvent = new Map(fixtures.flatMap((fixture) => fixture.idEvent ? [[fixture.idEvent, fixture] as const] : []));
  const reminderBeforeMs = reminderMinutes * 60 * 1000;

  const add = (item: DesiredMatchNotification): void => {
    if (!item.eventId || item.startsAt - reminderBeforeMs <= now) return;
    if (!byEvent.has(item.eventId)) byEvent.set(item.eventId, item);
  };

  if (favoriteTeam) {
    const sportsDbId = Number(favoriteTeam.sportsDbId);
    fixtures.forEach((fixture) => {
      const startsAt = eventTimestamp(fixture);
      if (fixture.status !== 'scheduled'
        || !isUpcomingStatus(fixture.statusShort)
        || startsAt === null
        || (fixture.homeTeam.id !== sportsDbId && fixture.awayTeam.id !== sportsDbId)
        || !fixture.idEvent) return;

      add({
        eventId: fixture.idEvent,
        userId,
        startsAt,
        reminderMinutes,
        title: `${favoriteTeam.displayName} juega en ${reminderDurationLabel(reminderMinutes)}`,
        body: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} · ${formatLocalTime(startsAt)}`,
      });
    });
  }

  manualReminderEventIds.forEach((eventId) => {
    const fixture = fixtureByEvent.get(eventId);
    if (!fixture || !canSetMatchReminder(fixture)) return;
    const startsAt = eventTimestamp(fixture);
    if (startsAt === null) return;
    add({
      eventId,
      userId,
      startsAt,
      reminderMinutes,
      title: `Tu partido está por comenzar`,
      body: `${fixture.homeTeam.name} vs ${fixture.awayTeam.name} · ${formatLocalTime(startsAt)}`,
    });
  });

  return [...byEvent.values()];
}

async function persist(items: StoredMatchNotification[]): Promise<void> {
  if (items.length) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  else await AsyncStorage.removeItem(STORAGE_KEY);
}

async function cancelStored(items: StoredMatchNotification[]): Promise<void> {
  if (isNative()) {
    await Promise.all(items.map(async (item) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(item.notificationId);
      } catch (error) {
        console.warn('No se pudo cancelar un recordatorio local de partido.', error);
      }
    }));
  }
}

export function cancelMatchNotification(eventId: string): Promise<void> {
  return serialize(async () => {
    const stored = await readStoredNotifications();
    const retained = stored.filter((item) => item.eventId !== eventId);
    await cancelStored(stored.filter((item) => item.eventId === eventId));
    await persist(retained);
  });
}

export function cancelAllMatchNotifications(): Promise<void> {
  return serialize(async () => {
    const stored = await readStoredNotifications();
    await cancelStored(stored);
    await persist([]);
  });
}

export function syncMatchNotifications(
  userId: string,
  favoriteTeam: LigaMxTeam | null,
  fixtures: Fixture[],
  manualReminderEventIds: string[],
  reminderMinutes: MatchReminderMinutes = 60,
): Promise<void> {
  return serialize(async () => {
    if (!isNative()) return;
    if (await getMatchNotificationPermission() !== 'granted') {
      const stored = await readStoredNotifications();
      await cancelStored(stored);
      await persist([]);
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recordatorios de partidos',
        importance: Notifications.AndroidImportance.DEFAULT,
        enableVibrate: true,
      });
    }

    const now = Date.now();
    const desired = desiredNotifications(userId, favoriteTeam, fixtures, manualReminderEventIds, reminderMinutes);
    const desiredByEvent = new Map(desired.map((item) => [item.eventId, item]));
    const stored = await readStoredNotifications();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((item) => item.identifier));
    const retained: StoredMatchNotification[] = [];

    for (const entry of stored) {
      const target = desiredByEvent.get(entry.eventId);
      const stillScheduled = scheduledIds.has(entry.notificationId);
      const stillRelevant = target
        && entry.userId === userId
        && entry.reminderMinutes === target.reminderMinutes
        && Math.abs(target.startsAt - entry.startsAt) < 60_000
        && target.title === entry.title
        && target.body === entry.body
        && entry.startsAt - target.reminderMinutes * 60 * 1000 > now
        && stillScheduled;
      if (stillRelevant) {
        retained.push(entry);
        desiredByEvent.delete(entry.eventId);
      } else if (stillScheduled) {
        await cancelStored([entry]);
      }
    }

    for (const target of desiredByEvent.values()) {
      const reminderAt = target.startsAt - target.reminderMinutes * 60 * 1000;
      if (reminderAt <= now) continue;
      try {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: target.title,
            body: target.body,
            data: { kind: 'match-reminder', eventId: target.eventId, reminderType: REMINDER_TYPE },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(reminderAt),
            channelId: CHANNEL_ID,
          },
        });
        retained.push({ ...target, reminderType: REMINDER_TYPE, notificationId });
      } catch (error) {
        console.warn('No se pudo programar un recordatorio local de partido.', error);
      }
    }

    await persist(retained);
  });
}
