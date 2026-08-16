import type { IsoDate } from '../domain/types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The date as it's stamped on a carton: 04 SEP 26. */
export function formatStamp(date: IsoDate): string {
  const [year, month, day] = date.split('-');
  return `${day} ${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
}

/** Plain-language time remaining, for the pill next to a batch. */
export function formatCountdown(daysLeft: number): string {
  if (daysLeft < 0) {
    const over = Math.abs(daysLeft);
    return over === 1 ? '1 day over' : `${over} days over`;
  }
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `${daysLeft} days`;
}

/** Long form for detail rows: Fri 4 Sep 2026. */
export function formatFullDate(date: IsoDate): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
