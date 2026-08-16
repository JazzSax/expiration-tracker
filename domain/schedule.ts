import { addDays, buildDigest, warnDaysFor } from './expiry';
import type { BatchWithProduct, Digest, IsoDate, Settings } from './types';

/**
 * iOS keeps at most 64 pending local notifications and silently drops the
 * rest. We stay well under that so a future feature (a backup reminder, say)
 * still has room.
 */
export const MAX_SCHEDULED = 40;

/** How many product names the notification body lists before summarising. */
const NAMES_IN_BODY = 3;

export interface Clock {
  today: IsoDate;
  /** Local hour, 0–23. Decides whether today's notification has already passed. */
  currentHour: number;
}

export interface ScheduledDigest {
  date: IsoDate;
  hour: number;
  title: string;
  body: string;
  counts: Digest['counts'];
}

/**
 * Every future day on which some batch changes state. Nothing runs in the
 * background on the device, so each day's message has to be composed now and
 * scheduled ahead of time.
 */
function candidateDates(batches: BatchWithProduct[], settings: Settings): IsoDate[] {
  const dates = new Set<IsoDate>();
  for (const batch of batches) {
    dates.add(addDays(batch.expiresAt, -warnDaysFor(batch, settings))); // enters 'soon'
    dates.add(addDays(batch.expiresAt, -1)); // enters 'urgent'
    dates.add(batch.expiresAt); // last day of sale
    dates.add(addDays(batch.expiresAt, 1)); // now expired
  }
  return [...dates];
}

function titleFor(counts: Digest['counts']): string {
  const parts: string[] = [];
  if (counts.expired > 0) parts.push(`${counts.expired} expired`);
  if (counts.urgent > 0) parts.push(`${counts.urgent} expiring now`);
  if (counts.soon > 0) parts.push(`${counts.soon} expiring soon`);
  return parts.join(' · ');
}

function bodyFor(digest: Digest): string {
  const names = digest.groups.map((group) => group.product.name);
  const shown = names.slice(0, NAMES_IN_BODY).join(', ');
  const rest = names.length - NAMES_IN_BODY;
  return rest > 0 ? `${shown} and ${rest} more` : shown;
}

/**
 * Builds the full notification schedule from scratch. The caller cancels
 * everything already pending and replaces it with this, so the schedule can
 * never drift out of step with the database.
 */
export function computeSchedule(
  batches: BatchWithProduct[],
  settings: Settings,
  clock: Clock,
): ScheduledDigest[] {
  if (!settings.notificationsEnabled) return [];

  const active = batches.filter((batch) => batch.status === 'active');
  if (active.length === 0) return [];

  const earliest = clock.currentHour < settings.notifyHour ? clock.today : addDays(clock.today, 1);

  const dates = candidateDates(active, settings)
    .filter((date) => date >= earliest)
    .sort();

  const schedule: ScheduledDigest[] = [];
  for (const date of dates) {
    const digest = buildDigest(active, settings, date);
    if (digest.groups.length === 0) continue;

    schedule.push({
      date,
      hour: settings.notifyHour,
      title: titleFor(digest.counts),
      body: bodyFor(digest),
      counts: digest.counts,
    });

    if (schedule.length === MAX_SCHEDULED) break;
  }

  return schedule;
}
