# Expiration Tracker

Stops the daily manual expiry check in a grocery store. Stock is recorded **once**, when a shipment
arrives, as a *batch* — product, expiry date, quantity, shelf. The phone then schedules its own
alerts ahead of time and tells you when something needs attention.

You open the app for two reasons only: a delivery arrived, or an alert said something is expiring.
Nothing is updated per sale.

**Fully offline.** Everything lives in a local SQLite database on the device. No server, no account,
no hosting bill, no network calls — it works in airplane mode.

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `a` / `i` for an emulator. Local notifications work in Expo
Go on both platforms.

```bash
npm test        # 69 unit tests — expiry logic, scheduling, database
npm run typecheck
```

## How it's built

| Layer | Location | Depends on |
| --- | --- | --- |
| Pure expiry logic | `domain/` | nothing — no I/O, no React, no SQLite |
| Storage | `db/` | `expo-sqlite`, via a driver interface |
| Alert scheduling | `notify/` | `domain/` + `expo-notifications` |
| Screens | `app/`, `components/` | hooks in `hooks/useStock.ts` |

`domain/expiry.ts` holds `computeStage` — the single definition of "about to expire" in the app.
The dashboard counts, the list pills, and the notification text all call it, so they cannot disagree.

Because `domain/` and `db/` never import React or Expo, the whole core is tested off-device:
`db/testDriver.ts` runs the real query layer against Node's built-in SQLite, so constraints, joins,
and transactions are genuinely exercised.

### Stages

| Stage | Meaning |
| --- | --- |
| `expired` | The expiry date has passed |
| `urgent` | Expires today or tomorrow |
| `soon` | Inside the warn window — the product's own `warnDays`, else the global default (14) |
| `ok` | Beyond the warn window |

### Notification scheduling

Local notifications must be scheduled in advance with their text baked in, and iOS keeps at most 64
pending. So the app does **not** schedule one per batch. `domain/schedule.ts` finds every future date
on which some batch changes state, and emits **one digest per date** (capped at 40), with the message
composed as the store will look on that day.

`notify/scheduler.ts` cancels everything pending and rebuilds the whole schedule after every
mutation and whenever the app returns to the foreground. The schedule is derived state — replacing
it wholesale is what stops it drifting from the database or double-firing.

### Backup

Data lives only on the phone, so Alerts → Export writes the full database to a JSON file and opens
the share sheet. Restore validates the file with Zod, confirms what it contains, then replaces
everything in one transaction and reschedules alerts.

## Design

A stockroom instrument rather than a dashboard: light "carton paper" ground for readability under
fluorescent light, Archivo throughout, and IBM Plex Mono reserved entirely for dates. Every batch
shows its expiry as an ink-stamped block like the EXP code printed on a real carton. Stage colors
always sit next to a text label, so the app never relies on color alone.
