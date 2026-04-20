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

## Pending/Future Tasks
- P1: Clean up deprecated DeviceLinking.jsx and other unused Firebase files (firebase.js, firebaseSync.js, syncService.js, AuthContext.js, LoginScreen.jsx, SyncStatus.jsx, SyncDebugPanel.jsx, authService.js)
