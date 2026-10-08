# FinGuard AI — Technical Architecture

## 1. Technology Stack
- **Frontend Framework**: React 18 / 19 with Vite
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS (dark fintech theme)
- **Backend / BaaS**: Firebase (Project: `finguard-ai-prototype`)
  - **Firebase Authentication**: Email/Password & Anonymous demo investigator sign-in
  - **Cloud Firestore**: Persistent document store for the 7 permitted collections
  - **Firebase Hosting**: SPA hosting target (`dist`)

## 2. Architectural Guidelines
- **Small-Module Architecture**: Keep files small, focused, and single-purpose.
- **Single Firebase Initialization Module**: All Firebase service instances (`app`, `auth`, `db`) are exported from a single module (`src/firebase/config.ts`).
- **No Heavy State-Management Libraries**: Rely on lightweight React context or custom hooks for authentication and data subscriptions.
- **Strict Typing**: Zero `any` types unless genuinely unavoidable for third-party interop.
- **Client Secrets Protection**: All public Firebase keys accessed via `import.meta.env` (`VITE_FIREBASE_*`). No backend secrets or Gemini keys exposed on the client.

## 3. Directory Layout
```
src/
  components/       # Reusable, atomic UI components (Shell, Buttons, Badges)
  pages/            # View-level page components (LoginPage, DashboardShell)
  firebase/         # Firebase initialization and typed collection references
  types/            # Shared TypeScript domain interfaces
  lib/              # Deterministic utilities and helper functions
  hooks/            # Custom React hooks (e.g. useAuth)
```

## 4. Separation of Concerns
1. **Deterministic Logic**: All math, risk heuristics, velocity counts, and signal triggers live in pure functions (`src/lib/`).
2. **AI Layer (Future Phase 5)**: Gemini will only be called to generate natural language explanations and summaries based on calculated deterministic facts.
3. **Data Layer**: Direct Firestore hooks with strongly-typed converters.
