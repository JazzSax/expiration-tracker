import { describe, expect, test } from 'vitest';
import { MAX_SCHEDULED, computeSchedule } from './schedule';
import type { BatchWithProduct, Product, Settings } from './types';

const TODAY = '2026-08-16';

const settings: Settings = {
  defaultWarnDays: 14,
  notifyHour: 8,
  notificationsEnabled: true,
  lastExportAt: null,
};

/** Before the 08:00 notify hour, so "today" is still schedulable. */
const morning = { today: TODAY, currentHour: 6 };

function product(id: number, name: string, over: Partial<Product> = {}): Product {
  return { id, name, barcode: null, unit: 'pc', warnDays: null, category: 'other', isSample: false, ...over };
}

function batch(id: number, expiresAt: string, p: Product, over: Partial<BatchWithProduct> = {}): BatchWithProduct {
  return {
    id,
    productId: p.id,
    expiresAt,
    quantity: 10,
    location: null,
    status: 'active',
    discardedAt: null,
    discardedQuantity: null,
    createdAt: '2026-08-01',
    isSample: false,
    product: p,
    ...over,
  };
}

const milk = product(1, 'Evaporated Milk');
const bread = product(2, 'Pandesal', { warnDays: 2 });

describe('computeSchedule', () => {
  test('schedules a notification on the day a batch enters the warn window', () => {
    // 14-day warn window on a batch expiring Sept 4 → enters 'soon' on Aug 21.
    const schedule = computeSchedule([batch(1, '2026-09-04', milk)], settings, morning);

    expect(schedule.map((s) => s.date)).toContain('2026-08-21');
  });

  test('schedules on the expiry day and the day after it lapses', () => {
    const schedule = computeSchedule([batch(1, '2026-08-20', milk)], settings, morning);
    const dates = schedule.map((s) => s.date);

    expect(dates).toContain('2026-08-20');
    expect(dates).toContain('2026-08-21');
  });

  test('fires at the hour chosen in settings', () => {
    const schedule = computeSchedule([batch(1, '2026-08-20', milk)], { ...settings, notifyHour: 17 }, morning);

    expect(schedule.every((s) => s.hour === 17)).toBe(true);
  });

  test('emits one entry per date, not one per batch', () => {
    const schedule = computeSchedule(
      [batch(1, '2026-08-20', milk), batch(2, '2026-08-20', bread), batch(3, '2026-08-20', product(3, 'Tofu'))],
      settings,
      morning,
    );
    const dates = schedule.map((s) => s.date);

    expect(new Set(dates).size).toBe(dates.length);
  });

  test('never schedules a date in the past', () => {
    const schedule = computeSchedule([batch(1, '2026-08-01', milk)], settings, morning);

    expect(schedule.every((s) => s.date >= TODAY)).toBe(true);
  });

  test("includes today when the notify hour hasn't passed yet", () => {
    const schedule = computeSchedule([batch(1, '2026-08-16', milk)], settings, morning);

    expect(schedule[0]?.date).toBe(TODAY);
  });

  test('drops today once the notify hour has passed', () => {
    const schedule = computeSchedule([batch(1, '2026-08-16', milk)], settings, { today: TODAY, currentHour: 9 });

    expect(schedule.map((s) => s.date)).not.toContain(TODAY);
  });

  test('returns dates in chronological order', () => {
    const schedule = computeSchedule(
      [batch(1, '2026-09-04', milk), batch(2, '2026-08-18', bread)],
      settings,
      morning,
    );
    const dates = schedule.map((s) => s.date);

    expect([...dates].sort()).toEqual(dates);
  });

  test('caps the schedule below the iOS pending-notification limit', () => {
    const batches = Array.from({ length: 200 }, (_, i) =>
      batch(i + 1, `2027-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, '0')}`, product(i + 1, `Item ${i}`)),
    );

    const schedule = computeSchedule(batches, settings, morning);

    expect(schedule.length).toBeLessThanOrEqual(MAX_SCHEDULED);
    expect(MAX_SCHEDULED).toBeLessThanOrEqual(50);
  });

  test('keeps the nearest dates when it has to cap', () => {
    const batches = Array.from({ length: 120 }, (_, i) =>
      batch(i + 1, `2026-${i < 60 ? '09' : '12'}-${String((i % 28) + 1).padStart(2, '0')}`, product(i + 1, `Item ${i}`)),
    );

    const schedule = computeSchedule(batches, settings, morning);

    expect(schedule.every((s) => s.date < '2026-12-01')).toBe(true);
  });

  test('describes the state of the store on that future date, not today', () => {
    const schedule = computeSchedule([batch(1, '2026-08-20', milk)], settings, morning);
    const onExpiryDay = schedule.find((s) => s.date === '2026-08-20');

    expect(onExpiryDay?.counts.urgent).toBe(1);
    expect(onExpiryDay?.title).toContain('1 expiring now');
  });

  test('counts a lapsed batch as expired on the following day', () => {
    const schedule = computeSchedule([batch(1, '2026-08-20', milk)], settings, morning);
    const dayAfter = schedule.find((s) => s.date === '2026-08-21');

    expect(dayAfter?.counts.expired).toBe(1);
    expect(dayAfter?.title).toContain('1 expired');
  });

  test('names the affected products in the body', () => {
    const schedule = computeSchedule([batch(1, '2026-08-20', milk)], settings, morning);
    const onExpiryDay = schedule.find((s) => s.date === '2026-08-20');

    expect(onExpiryDay?.body).toContain('Evaporated Milk');
  });

  test('summarises the remainder when many products are affected', () => {
    const batches = Array.from({ length: 6 }, (_, i) =>
      batch(i + 1, '2026-08-20', product(i + 1, `Item ${i}`)),
    );

    const onExpiryDay = computeSchedule(batches, settings, morning).find((s) => s.date === '2026-08-20');

    expect(onExpiryDay?.body).toContain('3 more');
  });

  test('ignores discarded batches', () => {
    const schedule = computeSchedule(
      [batch(1, '2026-08-20', milk, { status: 'discarded', discardedAt: '2026-08-16' })],
      settings,
      morning,
    );

    expect(schedule).toEqual([]);
  });

  test('schedules nothing when notifications are turned off', () => {
    const schedule = computeSchedule(
      [batch(1, '2026-08-20', milk)],
      { ...settings, notificationsEnabled: false },
      morning,
    );

    expect(schedule).toEqual([]);
  });

  test('schedules nothing when there is no stock', () => {
    expect(computeSchedule([], settings, morning)).toEqual([]);
  });

  test('skips dates where nothing needs attention', () => {
    // A batch far in the future: no date before its warn window should appear.
    const schedule = computeSchedule([batch(1, '2027-01-01', milk)], settings, morning);

    expect(schedule.every((s) => s.counts.expired + s.counts.urgent + s.counts.soon > 0)).toBe(true);
  });
});
