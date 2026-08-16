import type { Stage } from '../domain/expiry';

/**
 * Stage colors live here and nowhere else. Tailwind mirrors these in
 * tailwind.config.js for className use; this map is for the places that need a
 * raw value (SVG, notification accents, inline borders).
 */
export const stageColor: Record<Stage, string> = {
  expired: '#8E1F2F',
  urgent: '#C24E00',
  soon: '#8A6D0B',
  ok: '#2F6B4F',
};

export const stageSoftColor: Record<Stage, string> = {
  expired: '#F3DEE0',
  urgent: '#F8E4D3',
  soon: '#F3EBD1',
  ok: '#DDEAE2',
};

/** Short label shown on the stage pill. Color is never the only signal. */
export const stageLabel: Record<Stage, string> = {
  expired: 'Expired',
  urgent: 'Urgent',
  soon: 'Soon',
  ok: 'Good',
};

export const palette = {
  paper: '#EFF1EA',
  card: '#FBFCF8',
  ink: '#16201B',
  muted: '#5E6B62',
  line: '#D6DACE',
} as const;
