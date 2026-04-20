# Petrol Pump Management App - PRD

## Overview
React-based petrol pump management application with Firebase Auth (Email/Password) and Firestore real-time cloud sync. Uses user-scoped localStorage for offline persistence.

## Tech Stack
- Frontend: React.js, TailwindCSS, Shadcn/UI
- Auth: Firebase Email/Password
- Database: Firebase Firestore (cloud sync) + localStorage (offline)
- Process Control: Supervisor

## Core Features
- Sales tracking with nozzle/fuel type management
- Customer management with case-insensitive duplicate detection
- Credit sales and payment tracking
- Stock management (MPP Stock)
- Income/Expense tracking
- Settlement management
- Daily reports with PDF/print export
- Auto backup (weekly)
- Pro Mode for advanced features

## Completed Work
- Case-insensitive duplicate customer name validation
- Settings UI fixes (scrolling, layout reordering)
- QR backup features removed
- Delete Data restricted to Pro Mode
- Merge Backup repositioned above Auto Backup
- MPP checkbox always visible in Add Sale form
- MPP-tagged sales excluded from stock calculations (MPPStock.jsx)
- MPP section removed from dashboard summary (only non-MPP data shown)

## Pending/Future Tasks
- P1: Clean up deprecated DeviceLinking.jsx component
