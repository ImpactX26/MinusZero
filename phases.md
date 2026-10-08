# FinGuard AI — Implementation Phases

## Phase 1 — Project Foundation (Current)
- Firebase project verification (`finguard-ai-prototype`)
- Authentication foundation (Demo investigator login & session management)
- Cloud Firestore foundation (Rules for 7 permitted collections)
- Clean project structure with Vite, React, TypeScript, and Tailwind CSS
- Protected route verification & minimal app shell

## Phase 2 — Synthetic Data & Seed Scenarios
- Data models for 7 collections (`customers`, `transactions`, `devices`, `login_events`, `investigations`, `agent_logs`, `feedback`)
- Seed script with canonical fraud scenarios:
  - Account Takeover (ATO)
  - Card-Not-Present (CNP) anomaly
  - False-positive traveler scenario (testing Isolation Rule)
  - Rapid velocity attack

## Phase 3 — Deterministic Scoring Engine
- Pure function risk calculators (0–100)
- Velocity, amount anomaly, and device mismatch rule evaluators
- Decision band classification (`ALLOW`, `STEP_UP`, `BLOCK_AND_REVIEW`, `BLOCK_AND_CREATE_CASE`)

## Phase 4 — Investigator Investigation UI & Case Management
- Investigation triage table
- Deep dive case drawer/page
- Timeline of transactions and telemetry
- Case disposition workflow

## Phase 5 — Gemini Explanation Layer
- Server-side or secured Cloud Function / backend explanation endpoint
- Audit trail narrative and executive summary generation

## Phase 6 — Hardening, E2E Verification & Presentation Polish
- Full test pass, offline resilience, demonstration readiness.
