# FinGuard AI — Project Memory & State Log

## Project Identity
- **Project**: FinGuard AI — Synthetic Banking Fraud-Investigation Prototype
- **Firebase Project ID**: `finguard-ai-prototype`
- **Core Stack**: Vite + React + TypeScript + Tailwind CSS + Firebase (Auth + Firestore + Hosting)

## Key Technical Decisions
1. **Single Firebase Module**: All Firebase services centralized in `src/firebase/config.ts`.
2. **Deterministic-First**: Scoring and decisions are 100% deterministic code. Gemini is an explanatory assistant only.
3. **Strict Collection Boundary**: Only 7 collections allowed (`customers`, `transactions`, `devices`, `login_events`, `investigations`, `agent_logs`, `feedback`).
4. **Synthetic Data**: All data explicitly marked with "Synthetic data - demo prototype".

## Phase Progress
- **Phase 1: Project Foundation**: COMPLETED (2026-10-07)
  - Firebase project verified: `finguard-ai-prototype`
  - Authentication foundation implemented: Firebase Auth enabled via CLI (`anonymous`, `emailPassword`), AuthContext, useAuth hook, protected route gate, LoginPage with demo investigator 1-click access, sign-out capability.
  - Firestore foundation & rules implemented: `firestore.rules` strictly scoped to 7 permitted collections (`customers`, `transactions`, `devices`, `login_events`, `investigations`, `agent_logs`, `feedback`) with authenticated access guard. Speculative indexes avoided; `firestore.indexes.json` validated.
  - Project structure established: Small-module architecture (`src/components`, `src/pages`, `src/firebase`, `src/types`, `src/hooks`, `src/context`), single Firebase config module (`src/firebase/config.ts`), strict TypeScript (`tsconfig.json`), Tailwind CSS dark fintech theme.
  - Build & verification result: TypeScript compilation (`tsc --noEmit`) zero errors. Production build (`npm run build`) succeeded. Client tested against live Firebase Auth (`signInAnonymously`, session state, `signOut`).
  - Remaining configuration: Resolved. Default Firestore database created in `nam5` and rules deployed via Firebase CLI.

- **Phase 2: Synthetic Data & Scenario Foundation**: COMPLETED (2026-10-07)
  - Domain models created: Typed interfaces for all 7 permitted collections (`customers`, `transactions`, `devices`, `login_events`, `investigations`, `agent_logs`, `feedback`), plus `AgentResult`, `Decision`, and `ScenarioDefinition`.
  - Canonical scenarios implemented: Exactly 3 deterministic scenarios in `src/data/scenarios.ts` (Legitimate: INR 1,500 / LOW / ALLOW; Suspicious: INR 25,000 / MEDIUM / STEP_UP_VERIFICATION; High-Risk C1003: INR 85,000 / CRITICAL / BLOCK_AND_CREATE_CASE). Isolation Rule represented contextually (traveler login on known device).
  - Deterministic seed mechanism implemented: `src/data/seeder.ts` atomically batch seeds 3 customers, 5 devices, 10 login events, and 3 canonical transactions using deterministic document IDs (zero duplication).
  - Simulator foundation implemented: `src/lib/simulator.ts` provides `simulateScenario()`, generates pending transactions (`status: PENDING`), persists them to Firestore `transactions` collection, and outputs context for future orchestrator without running agents or risk calculations.
  - Validation & live tests: `src/lib/validateScenarios.ts` verified all acceptance targets. Live test confirmed Firestore write/read for seeder and simulator under authenticated session.
  - Build result: TypeScript compilation (`tsc --noEmit`) passed with 0 errors. Production bundle succeeded (Vite v6).
  - Blockers: None.

- **Phase 2 Visual Overhaul**: COMPLETED (2026-10-07)
  - Frontend redesigned from developer verification console to premium enterprise fintech command center.
  - Design system: Deep obsidian navy (#070B12 root), glassmorphism cards, CSS glow effects, animated status dots, scan-line overlay, grid pattern backgrounds, fade-in-up animations.
  - `src/index.css`: Full premium CSS design system — custom properties, `.glass-card`, `.btn-primary`, `.btn-ghost`, `.badge`, `.input-field`, `.terminal-text`, `.scan-line`, `.bg-grid-pattern`, `.glow-*`, `.text-glow-*`, `.dot-*` utility classes, `@keyframes` for pulse/scan/fadeInUp.
  - `src/components/Header.tsx`: Sticky glassmorphism header with ambient glow logo, live Firestore status indicator, scenario readiness badge, animated synthetic data disclaimer.
  - `src/components/Footer.tsx`: Premium footer with brand, system telemetry, and synthetic data disclaimer.
  - `src/pages/LoginPage.tsx`: Two-panel split login — left brand/stats panel with system status card and feature bullets; right glassmorphism login card with password visibility toggle and animated entry.
  - `src/pages/ApplicationShell.tsx`: Full command center redesign — ambient glow background, cinematic hero section with grid texture, 4-column stat grid, glassmorphism seeder & validation panels, color-coded scenario cards (emerald/amber/rose with hover glows), simulation result panel, phase roadmap strip, Firestore collection schema strip, Phase 3 teaser.
  - TypeScript: 0 errors. Production build: successful.
  - Exact recommended next phase: Phase 3 — Deterministic Scoring Engine & Agent Workflow Pipeline (`src/agents/orchestrator.ts`).

