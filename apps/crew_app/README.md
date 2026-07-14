# Junkhaul Crew App

Flutter app for Junkhaul Calgary's field crews. Handles clocking in/out,
the full 9-step job execution flow, live truck tracking, offline-first
mutations, and push notifications.

## Prerequisites

- Flutter SDK `>=3.12.2` (stable channel)
- Dart `>=3.12.2`
- Android Studio / Xcode (for platform tooling)
- Java 17 (Android builds)
- A Supabase project with the migrations from `supabase/migrations/` applied
- Access to the Next.js backend repo (`/Users/hammadbhatti/Junkhaul`)

## Quick start

```bash
cd apps/crew_app

# Install dependencies
flutter pub get

# Generate Freezed / Hive / Riverpod codegen
dart run build_runner build --delete-conflicting-outputs

# Copy the secrets template and fill in your tokens
cp lib/src/core/secrets.dart.example lib/src/core/secrets.dart
# Edit secrets.dart with your MAPBOX_ACCESS_TOKEN

# Run in debug mode (defaults to production backend)
flutter run
```

## Environment variables

All config is passed via `--dart-define` at build time. No `.env` files.

| Variable | Required | Default | Description |
|---|---|---|---|
| `BASE_URL` | no | `https://www.junkhaul.ca` | Next.js backend URL |
| `MAPBOX_ACCESS_TOKEN` | yes | — | Mapbox access token for the schedule map |
| `SUPABASE_URL` | yes | — | Supabase project URL (for realtime subscriptions) |
| `SUPABASE_ANON_KEY` | yes | — | Supabase anon key |
| `SENTRY_DSN` | no | empty (no-op) | Sentry DSN for crash reporting |
| `FLAVOR` | no | `production` | Build environment label for Sentry |

### Secrets file

`lib/src/core/secrets.dart` is gitignored. Copy from `secrets.dart.example`
and fill in the Mapbox token. For Supabase/Sentry, prefer `--dart-define`
so secrets aren't committed:

```bash
flutter run \
  --dart-define=BASE_URL=http://localhost:3000 \
  --dart-define=MAPBOX_ACCESS_TOKEN=pk.abc123 \
  --dart-define=SUPABASE_URL=https://xyz.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ... \
  --dart-define=SENTRY_DSN=https://...@sentry.io/123 \
  --dart-define=FLAVOR=development
```

### Local development

Point at a local backend:

```bash
flutter run --dart-define=BASE_URL=http://localhost:3000
```

The Next.js backend must be running (`npm run dev` from the repo root).

## Architecture

Clean architecture with three layers under `lib/src/`:

```
lib/src/
├── core/              # App-wide: theme, animations, error widget, secrets
├── data/
│   ├── api/           # Dio HTTP client + typed EmployeeApi
│   ├── offline/       # Hive-backed offline queue + connectivity monitor
│   ├── repositories/  # Auth repository (cookie-based session)
│   └── supabase/      # Realtime subscriptions (table changes + broadcasts)
├── domain/
│   ├── models/        # Freezed data classes (booking, employee, shift, etc.)
│   └── providers/     # Riverpod providers (schedule, job, permissions, core)
├── presentation/
│   ├── features/      # Screen-level widgets organized by feature
│   │   ├── job/       # 9-step job execution flow (see below)
│   │   ├── login/     # Phone + password login
│   │   ├── onboard/   # First-time onboarding
│   │   ├── permissions/ # Permission gate (blocking UI)
│   │   ├── schedule/  # Today's schedule + Mapbox map + bottom sheet
│   │   ├── splash/    # Auth check + redirect
│   │   └── verification/ # Pending verification state
│   └── shared/        # Reusable cards, buttons, skeleton loaders
└── router/            # GoRouter config with auth guards
```

### State management

Uses **Riverpod 3.x** (`flutter_riverpod: ^3.3.2`). Key providers:

| Provider | Type | Purpose |
|---|---|---|
| `authRepositoryProvider` | `NotifierProvider` | Auth state (unknown → unauthenticated → needsOnboarding → needsVerification → authenticated) |
| `dioClientProvider` | `FutureProvider` | Dio HTTP client with cookie persistence + retry |
| `employeeApiProvider` | `FutureProvider` | Typed API wrapper for all `/api/employee/*` endpoints |
| `todayScheduleProvider` | `FutureProvider` | Today's bookings for the schedule screen |
| `jobStepProvider` | `Provider.family` | Job step controller (manages the 9-step flow per booking) |
| `isOnlineProvider` | `StreamProvider` | Network connectivity status |
| `offlineQueueProvider` | `FutureProvider` | Hive-backed offline action queue |
| `locationPermissionProvider` | `NotifierProvider` | Location permission status |
| `supabaseRealtimeProvider` | `FutureProvider` | Supabase realtime service |

### API layer

`lib/src/data/api/dio_client.dart` — Dio HTTP client with:
- **Cookie-based auth**: `jh_employee_session` cookie persisted via `PersistCookieJar` in the app documents directory, mirrored to `FlutterSecureStorage` for survival across restarts
- **Retry interceptor**: Network/timeout errors retried up to 3 times with exponential backoff (1s, 2s, 4s). 4xx responses are never retried.
- **Typed exceptions**: `NetworkException`, `AuthException` (401/403), `ApiException` (4xx), `ServerException` (5xx)

`lib/src/data/api/employee_api.dart` — Typed methods for all employee endpoints:
- Schedule: `GET /api/employee/schedule`, `GET /api/employee/shifts`
- Clock: `POST /api/employee/clock-in`, `POST /api/employee/clock-out`, `POST /api/employee/job-clock`
- Incidents: `GET/POST /api/employee/incidents`
- Receipts: `GET/POST /api/employee/receipts`
- Truck checks: `GET/POST /api/employee/truck-check`
- Storage drops: `GET/POST /api/employee/storage-drop`
- Signatures: `POST /api/employee/signature`
- Location: `POST /api/employee/location`
- Issues: `POST /api/employee/issues`
- Landfill: `GET /api/employee/landfill`
- Pay stubs: `GET /api/employee/pay-stubs`
- Notifications: `GET/POST /api/employee/notifications`
- Crew: `POST /api/crew/item-conditions`, `POST /api/crew/resend-payment-link`

## Offline queue architecture

The app is offline-first for all mutating actions. When network is unavailable,
actions are queued locally and flushed automatically on reconnect.

**How it works:**

1. **Enqueue**: Any mutating API call that fails due to network issues is
   serialized as an `OfflineAction` (type, payload, optional file paths) and
   stored in a Hive box (`offline_queue`).

2. **Persist**: Hive stores actions in the app's documents directory. The
   queue survives app restarts. File paths for multipart uploads (photos,
   signatures) are stored as local file paths and read at flush time.

3. **Flush**: `OfflineQueueService.flush()` processes the queue in insertion
   order. Each action's `attempts` counter is incremented before processing.
   On success, the action is removed. On failure, it stays in the queue for
   the next flush attempt.

4. **Auto-trigger**: `connectivity_provider.dart` uses `connectivity_plus`
   to monitor network state changes. When connectivity is restored,
   `queue.flush()` is called automatically (best-effort — errors are caught
   silently to avoid crashing the connectivity listener).

**Queued action types and their endpoints:**

| Action type | Endpoint |
|---|---|
| `clock_in` | `POST /api/employee/clock-in` |
| `clock_out` | `POST /api/employee/clock-out` |
| `location` | `POST /api/employee/location` |
| `job_clock` | `POST /api/employee/job-clock` |
| `signature` | `POST /api/employee/signature` |
| `incident` | `POST /api/employee/incidents` |
| `issue` | `POST /api/employee/issues` |
| `receipt` | `POST /api/employee/receipts` |
| `truck_check` | `POST /api/employee/truck-check` |
| `storage_drop` | `POST /api/employee/storage-drop` |

**Key files:**
- `lib/src/data/offline/offline_queue_service.dart` — Queue service (Hive persistence, flush logic)
- `lib/src/data/offline/offline_action.dart` — Action model
- `lib/src/data/offline/connectivity_provider.dart` — Network monitor + auto-flush trigger

## Job execution flow (9 steps)

The core of the app is a 9-step stepper for each booking, managed by
`JobStepController` in `lib/src/domain/providers/job_provider.dart`.

| Step | Widget file | What happens |
|---|---|---|
| 1. En Route | `steps/en_route_step.dart` | Crew confirms they're heading to the job. Calls `POST /api/employee/job-clock` with `action: 'in'`. Shows customer name, address, time window, price, notes. |
| 2. Arrived | `steps/arrived_step.dart` | Mark arrival. Record item conditions (Good/Damaged/Missing) per itemized item with damage notes. Calls `POST /api/crew/item-conditions`. |
| 3. Before/After | `steps/before_after_step.dart` | Capture "Before" photo of customer space. "After" photo is captured at step 9. |
| 4. Payment | `steps/payment_step.dart` | Cash: recorded at signature. Card: sends Stripe payment link via `POST /api/crew/resend-payment-link`. Shows balance due. |
| 5. Load Truck | `steps/load_truck_step.dart` | Checklist of itemized items — check each as loaded onto the truck. Shows quantity per item. |
| 6. Truck Fullness | `steps/truck_fullness_step.dart` | Photo of truck bed + select fullness level (Empty, 1/4, 1/2, 3/4, Full). If >=75%, landfill is recommended in step 7. |
| 7. Route Decision | `steps/route_decision_step.dart` | Continue to next job OR find nearest landfill (`GET /api/employee/landfill`). Opens directions via `url_launcher`. |
| 8. Drop Flow | `steps/drop_flow_step.dart` | Select storage facility, log items being dropped, capacity estimate slider. Calls `POST /api/employee/storage-drop`. |
| 9. Signature | `steps/signature_step.dart` | Capture "After" photo. Customer signature pad + typed name. Amount confirmation. Calls `POST /api/employee/signature` with payment method. Completes the job. |

A horizontal progress bar in `job_screen.dart` shows completed (green),
current (orange), and pending (gray) steps.

## Mapbox map

`lib/src/presentation/features/schedule/schedule_map.dart` — Mapbox map on
the schedule screen showing:
- **Truck marker**: Custom truck icon (`assets/images/truck_marker_medium.png`)
  at the crew's current position
- **Job markers**: Numbered orange circles (1, 2, 3...) at each booking's
  address coordinates
- **Camera**: Auto-fits to show all markers with padding. Fly animation
  duration 800ms.

Map style: `mapbox://styles/mapbox/streets-v12`. Default center: Calgary
downtown (-114.0719, 51.0447). Zoom: 11.0.

Token is set via `MapboxOptions.setAccessToken()` in `main.dart` from
`secrets.dart` or `--dart-define=MAPBOX_ACCESS_TOKEN`.

## Supabase realtime

`lib/src/data/supabase/supabase_realtime_service.dart` provides:
- **Table change subscriptions**: `watchTable(table, columnFilter)` —
  subscribe to INSERT/UPDATE/DELETE on any table with optional column filter
  (e.g., filter by `employee_id`)
- **Broadcast notifications**: `watchCrewNotifications(employeeId)` —
  subscribes to `crew-notifications:{employeeId}` channel for push-style
  messages from the backend

Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` via `--dart-define`.

## Sentry error reporting

Configured in `lib/main.dart`:
- DSN via `--dart-define=SENTRY_DSN` (no-op if empty)
- Environment via `--dart-define=FLAVOR` (default: `production`)
- 20% trace sample rate for performance monitoring
- Captures silent Flutter errors and failed HTTP requests
- `SentryNavigatorObserver` added to GoRouter for navigation tracking
- Custom `ErrorWidget.builder` shows branded error screen instead of the
  default red error screen (`lib/src/core/app_error_widget.dart`)

## Permissions

The app requests three permissions, managed by
`lib/src/domain/providers/permission_provider.dart`:

| Permission | Blocking? | Purpose |
|---|---|---|
| Location (when in use + always) | Yes | Customer tracking map, navigation, arrival times, background tracking during jobs |
| Camera | No (features won't work) | Job photos, before/after photos, truck checks, document scans |
| Notifications | No | New jobs, route changes, manager messages |

If location is denied, the app redirects to a full-screen permission gate
(`lib/src/presentation/features/permissions/permission_gate_screen.dart`)
with explanations and "Try Again" / "Open Settings" buttons.

## Building

### Code generation

After changing any Freezed model, Hive adapter, or Riverpod annotation:

```bash
dart run build_runner build --delete-conflicting-outputs
```

For watch mode during development:

```bash
dart run build_runner watch --delete-conflicting-outputs
```

### Android

```bash
# Debug
flutter build apk --debug

# Release (currently uses debug signing — configure a release keystore before publishing)
flutter build apk --release \
  --dart-define=BASE_URL=https://www.junkhaul.ca \
  --dart-define=MAPBOX_ACCESS_TOKEN=pk.abc123 \
  --dart-define=SUPABASE_URL=https://xyz.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ... \
  --dart-define=SENTRY_DSN=https://...@sentry.io/123
```

- Package name: `ca.junkhaul.crew_app`
- minSdk: 24, compileSdk: 36, Java 17
- MultiDex enabled, desugaring enabled

### iOS

```bash
flutter build ios --release \
  --dart-define=BASE_URL=https://www.junkhaul.ca \
  --dart-define=MAPBOX_ACCESS_TOKEN=pk.abc123 \
  --dart-define=SUPABASE_URL=https://xyz.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJ... \
  --dart-define=SENTRY_DSN=https://...@sentry.io/123
```

Open `ios/Runner.xcworkspace` in Xcode to configure signing and submit
to App Store.

## Key dependencies

| Package | Version | Purpose |
|---|---|---|
| `flutter_riverpod` | ^3.3.2 | State management |
| `go_router` | ^17.3.0 | Navigation + auth guards |
| `dio` | ^5.10.0 | HTTP client |
| `supabase_flutter` | 2.15.4 | Realtime subscriptions |
| `mapbox_maps_flutter` | 2.25.1 | Schedule map |
| `geolocator` | ^14.0.3 | GPS positioning |
| `flutter_foreground_task` | ^9.2.2 | Background location service |
| `camera` | ^0.12.0+1 | Job photos |
| `sentry_flutter` | 9.23.0 | Crash reporting |
| `permission_handler` | ^12.0.3 | Runtime permissions |
| `hive` | ^2.2.3 | Offline queue persistence |
| `firebase_messaging` | ^16.4.1 | Push notifications |
| `flutter_local_notifications` | ^22.0.1 | Local notification display |
| `signature` | — | Customer signature capture |

## Troubleshooting

**Mapbox map is blank**: Ensure `MAPBOX_ACCESS_TOKEN` is set (either in
`secrets.dart` or via `--dart-define`). Check the token has the right
scopes for the `mapbox://styles/mapbox/streets-v12` style.

**App can't connect to backend**: Verify `BASE_URL` points to a running
Next.js instance. For local dev, use `http://localhost:3000` and ensure
the backend is running (`npm run dev` from repo root).

**Offline actions not syncing**: Check that `connectivity_plus` is
reporting online status. The queue flushes on reconnect — if actions are
stuck, restart the app (Hive reinitializes and flush is called on startup).

**Sentry not receiving events**: Confirm `SENTRY_DSN` is set and the DSN
matches your Sentry project. Events are sent in release builds by default;
in debug, Flutter errors are captured but HTTP failures may be filtered.

**Code generation errors**: Run `dart run build_runner build
--delete-conflicting-outputs` after pulling changes. If Freezed/Hive
adapters are out of sync, delete `.dart_tool/` and `flutter pub get`
before re-running build_runner.

**iOS build fails on Mapbox**: Run `cd ios && pod install` after
`flutter pub get`. Mapbox Maps SDK requires CocoaPods and a valid access
token configured at build time.
