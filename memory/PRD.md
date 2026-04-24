# Petrol Pump Management App - PRD

## Overview
React-based petrol pump management application. 100% offline with localStorage only. No Firebase, no cloud sync, no login required.

## Tech Stack
- Frontend: React.js, TailwindCSS, Shadcn/UI
- Data Storage: Browser localStorage (fully offline)
- Process Control: Supervisor

## Core Features
- Sales tracking with nozzle/fuel type management
- Customer management with case-insensitive duplicate detection
- Credit sales and payment tracking
- Stock management (MPP Stock)
- Income/Expense tracking
- Settlement management
- Daily reports with PDF/print export
- Manual backup (export/import JSON)
- Auto backup (weekly)
- Pro Mode for advanced features

## Completed Work
- Case-insensitive duplicate customer name validation
- Settings UI fixes (scrolling, layout reordering)
- QR backup features removed
- Delete Data restricted to Pro Mode
- Merge Backup repositioned above Auto Backup
- MPP checkbox always visible in Add Sale form
- MPP-tagged sales excluded from stock calculations
- MPP section removed from dashboard summary
- Fixed "change is not defined" runtime error in Firestore listeners
- **Made app 100% offline**: Removed Firebase Auth, Firestore sync, login screen. App loads directly with localStorage only.
- **PDF optimization**: jsPDF with built-in Helvetica; file size reduced from ~138KB to ~2.5KB (well below 20KB target).
- **PDF font sizes matched to reference PDF (Feb 2026)**: Header title 14pt (bar 14mm), date 9pt, section headings 13pt, table body 9pt, table headers 10pt, footer 8pt.
- **Android wrapper with auto-download + auto-open (Feb 2026)**: `MPumpCalcAndroid.openPdfWithViewer` now saves to public `Downloads/MPumpCalc/` via MediaStore (API 29+) or `Environment.DIRECTORY_DOWNLOADS` (older), and then fires `Intent.ACTION_VIEW` via FileProvider to open the file. Toast confirms "Downloaded: Downloads/MPumpCalc/<filename>".

## Pending/Future Tasks
- Refactor `ZAPTRStyleCalculator.jsx` (>3,500 lines) into smaller logical components.
- Add app icon for Android build.

## Code Review Cleanup (Feb 2026)
- **Deleted dead Firebase/Auth files** (~1500 lines): `services/firebase.js`, `services/firebaseSync.js`, `contexts/AuthContext.js`, `components/{LoginScreen,SyncStatus,DeviceLinking,SyncDebugPanel,AuthScreen}.jsx`, `services/{authService,syncService}.js`. Removed `firebase` npm dep.
- **Slimmed backend to stub** (442 → 38 lines): `server.py` is a minimal typed FastAPI stub serving `/api/status`. Deleted unused `auth_models.py`, `auth_utils.py`, `token_utils.py`, `sync_models.py`. 100% type-hint coverage on remaining functions.
- **Empty catch hardened**: `HeaderSettings.jsx:270` logs via `console.warn`.
- **Perf**: Added `useMemo` for ledger totals in `CustomerLedger.jsx`.
- **Perf + privacy (2nd pass)**: Removed two large `=== DEBUG ===` / `=== MPP CALCULATIONS ===` console-log blocks from `ZAPTRStyleCalculator.jsx` that fired on **every render** via the stats memo (dumped customer data to production console).
- **Hook deps audited** (`use-auto-backup.js`, `use-auto-backup-weekly.js`, `Settlement.jsx`, `ZAPTRStyleCalculator.jsx`): No genuine bugs. All flagged "missing deps" were stable refs (imports, module constants, `useRef`, state setters). ESLint `react-hooks/exhaustive-deps` reports 0 issues. False-positive findings from the review tool.
- **Rejected (by design)**: localStorage encryption — the app is intentionally offline with on-device business data; encryption provides no security benefit since an attacker with device access also has the decrypt key.
- **Deferred to P2**: Component refactor of `ZAPTRStyleCalculator`, `HeaderSettings`, `PaymentReceived`, `CreditSales`; blanket console.log removal.

## WebView Dialog Migration (Feb 2026)
- **Root cause**: `window.confirm` and `window.prompt` are blocked by default inside the Android WebView wrapper, making any destructive action that depended on them silently fail on device (user first reported this via the Receipt bulk-delete button).
- **Fix**: Created a reusable Promise-based confirmation hook at `/app/frontend/src/hooks/use-confirm.jsx`. Usage pattern:
  ```js
  const { confirm, confirmDialog } = useConfirm();
  const ok = await confirm({ title, message, requireTypedText, isDarkMode });
  if (ok) { ...do action... }
  return <div>{ui}{confirmDialog}</div>;
  ```
  Supports a `requireTypedText` mode that keeps the confirm button disabled until the user types an exact phrase (used for Clear-All-Data's "DELETE ALL" gate).
- **Migrated sites** (all now use in-app modals, Android-safe):
  1. `PaymentReceived.jsx` — Receipt bulk delete (in-app modal, earlier fix)
  2. `CreditSalesManagement.jsx:181` — Credit sales bulk delete
  3. `Settlement.jsx:161` — Settlement record delete
  4. `IncomeExpenseCategories.jsx:103` — Category delete
  5. `QRCodeScanner.jsx:54` — Merge-scanned-data confirm
  6. `HeaderSettings.jsx:74` — Clear-All-Data (merged the old 2-step `confirm → prompt` flow into a single modal with inline typed-text gate)
  7. `HeaderSettings.jsx:1026` — Permanent-delete-by-date-range
- Verification: `grep 'window\.confirm(\|window\.prompt('` returns zero hits across `src/`. Lint + build clean. Android assets synced.

