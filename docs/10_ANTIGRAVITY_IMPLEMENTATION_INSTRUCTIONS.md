# FinGuard AI V3 — Antigravity Implementation Instructions

## 1. Role

You are the lead engineer, frontend architect, AI systems engineer and QA engineer responsible for evolving the existing FinGuard AI repository into V3.

**Do not perform a blind rewrite.**

The current repository and Firebase setup are valuable working infrastructure.

## 2. Source-of-Truth Hierarchy

Read these files in order:

```text
01_PRD.md
02_ARCHITECTURE.md
03_AGENT_SYSTEM.md
04_DATABASE_MODEL.md
05_RISK_ENGINE.md
06_INVESTIGATOR_WORKFLOW.md
07_UI_UX_SPECIFICATION.md
08_SECURITY_MODEL.md
09_DEMO_SCENARIOS.md
10_ANTIGRAVITY_IMPLEMENTATION_INSTRUCTIONS.md
```

If a requirement conflicts with the existing code:

1. preserve security and working infrastructure
2. preserve the V3 product contract
3. record the conflict in `docs/DECISIONS.md`
4. do not silently invent a replacement architecture

## 3. Non-Negotiable Workspace Rules

```text
- Synthetic data only.
- No real banking/payment integrations.
- No real-money actions.
- Synchronous risk scoring must not depend on an LLM.
- Gemini cannot directly set the risk score or decision band.
- Agents are read-only.
- High-impact actions require explicit human confirmation.
- Every AI finding must reference visible evidence.
- Never expose API secrets in client code.
- TypeScript strict mode.
- Avoid `any`.
- Reuse existing Firebase configuration when compatible.
- Do not delete working features without documenting why.
- Do not add enterprise infrastructure just to imitate production.
- Every major feature must pass build + browser QA.
```

## 4. Phase 0 — Repository Audit (DO THIS FIRST)

Before modifying code:

1. inspect repository tree
2. inspect `package.json`
3. inspect `src/`
4. inspect Firebase configuration
5. inspect Firestore rules
6. inspect current pages/components
7. inspect current agents
8. inspect current data services
9. inspect Gemini integration
10. inspect environment configuration
11. inspect existing tests
12. identify reusable components

Produce an **Implementation Audit artifact** containing:

- current architecture
- what can be reused
- what must change
- risks
- proposed file changes
- dependency changes
- testing plan

**Do not code during the audit.**

## 5. Phase 1 — Foundation

Verify:

- React
- TypeScript
- Tailwind
- Firebase
- Authentication
- Firestore

Implement/verify:

- routing
- application shell
- navigation
- Light/Dark/System theme
- design tokens
- error boundaries
- reusable buttons/cards/badges
- loading/error/empty states

**Light is the default theme.**

## 6. Phase 2 — Domain Model

Create typed models for:

- customers
- accounts
- transactions
- devices
- login events
- merchants
- network signals
- investigations
- agent logs
- evidence
- correlations
- cases
- notes
- feedback
- audit logs

Do not create a second incompatible data model.

Map V3 concepts onto existing Firestore collections where possible.

## 7. Phase 3 — Deterministic Risk Engine

Implement first.

Requirements:

- central rule configuration
- fixed score bands
- no randomness
- no Gemini dependency
- scenario unit tests

Required outcomes:

```text
Legitimate → LOW
Suspicious → MEDIUM
ATO → CRITICAL
Traveller → not automatically critical
```

The engine must expose contribution/reason-code data for the UI.

## 8. Phase 4 — Agent System

Implement:

1. Transaction
2. Behaviour
3. Device
4. Identity/Login
5. Location
6. Network
7. History
8. Correlator
9. Challenger
10. Verifier
11. Narrator

Merchant, advanced graph and Copilot features can follow after the hero workflow works.

Every agent must return typed structured output.

Every finding must have evidence IDs.

## 9. Phase 5 — Orchestration

Implement:

```text
event
 ↓
context
 ↓
agents
 ↓
correlation
 ↓
verification
 ↓
risk enrichment
 ↓
recommendation
 ↓
case
```

Show live progress in the UI.

If an agent fails, preserve previous results and mark it as failed/fallback.

## 10. Phase 6 — Investigation Workspace

This is the highest-priority UI.

Build:

- case header
- risk score
- AI brief
- agent timeline
- evidence cards
- correlation view
- challenger
- explanation
- recommended action
- action dialog
- notes
- case status
- audit/history

Do not move to decorative work until this workflow is functional.

## 11. Phase 7 — Command Center

Implement:

- KPI cards
- critical alerts
- active investigations
- risk distribution
- recent events
- agent health
- demo scenario launcher

## 12. Phase 8 — Secondary Intelligence

Implement after the core flow:

- Live Events
- Customer Intelligence
- Entity Graph
- Case Management
- Analytics
- Copilot

Copilot must be read-only.

## 13. Phase 9 — Gemini

Use Gemini only for grounded text:

- summaries
- concise explanations
- investigator-readable narratives
- evidence interpretation

Input should contain only the required synthetic evidence/context.

On failure:

- use deterministic fallback
- continue the workflow

Do not expose hidden chain-of-thought.

## 14. Phase 10 — Visual Design

Follow `07_UI_UX_SPECIFICATION.md`.

Required:

- Light default
- Dark
- System
- white/light surfaces
- controlled colourful accents
- semantic risk colours
- polished typography
- subtle shadows/borders
- restrained glass effects

Do not make the interface dark-only.

## 15. Phase 11 — Motion

Use Framer Motion only where it communicates state:

- agent progress
- score change
- evidence reveal
- correlation highlight
- page transitions
- case state
- loading

Respect reduced motion.

## 16. Phase 12 — Graph / Relationship Visualization

Implement 2D first.

If the existing project can support it cleanly, use Cytoscape.js or SVG.

3D is optional.

**Never let 3D delay the working investigation flow.**

## 17. Phase 13 — Security

Before deployment:

- review Firestore rules
- verify authentication
- verify Gemini secret handling
- inspect production bundle
- check `.gitignore`
- test unauthorized access
- test malicious text/prompt injection
- test that agents cannot execute actions
- verify audit records

## 18. Phase 14 — Testing

Minimum tests:

### Unit
- risk rules
- score bands
- agent contracts
- correlation
- case transitions

### Integration
- scenario → agents → risk → case
- Gemini fallback
- Firestore persistence

### Browser
- run Scenario C
- inspect investigation
- confirm simulated action
- refresh
- verify case persistence
- run legitimate scenario

## 19. Phase 15 — Browser QA

Use the real browser.

Check:

- no console errors
- navigation
- buttons
- forms
- tables
- evidence
- graph
- loading
- errors
- theme switching
- responsive layout
- persistence

Do not claim success from compilation alone.

## 20. Phase 16 — Performance

Prioritize:

- fast initial render
- minimal Firestore reads
- memoized expensive UI
- lightweight charts
- controlled animations
- lazy loading secondary screens

Avoid large dependencies unless justified.

## 21. Phase 17 — Demo Readiness

The default demo sequence is:

```text
Command Center
 ↓
Scenario C
 ↓
Agent Timeline
 ↓
Evidence
 ↓
Correlation
 ↓
Risk
 ↓
Recommendation
 ↓
Human Confirmation
 ↓
Case
 ↓
Refresh / Persistence
 ↓
Legitimate Scenario
```

The demo must work even if Gemini is unavailable by using fallback explanations.

## 22. Work-Gate Process

For every major phase:

1. inspect
2. write implementation plan
3. implement
4. run tests
5. run build
6. run browser QA
7. fix issues
8. create verification note
9. continue

Do not launch a giant uncontrolled rewrite.

## 23. Priority Order

If time is limited, use this order:

```text
P0 — Firebase/Auth/working app
P1 — Risk engine
P2 — Agent workflow
P3 — Investigation Workspace
P4 — Case persistence
P5 — Command Center
P6 — Evidence/correlation visualization
P7 — Gemini polish
P8 — Analytics/Copilot
P9 — Decorative extras
```

## 24. Definition of Done

V3 is ready when:

- app starts cleanly
- authentication works
- Firestore works
- deterministic risk engine works
- all core agents return valid output
- evidence is visible
- correlation is visible
- investigation workspace works
- case is persisted
- human decision is explicit
- audit history is recorded
- Light/Dark/System works
- Gemini fallback works
- browser QA passes
- production build passes
- all fixed demo scenarios pass

## 25. Initial Antigravity Prompt

```text
You are upgrading an existing FinGuard AI repository to V3.

First read every file in /docs:
01_PRD.md
02_ARCHITECTURE.md
03_AGENT_SYSTEM.md
04_DATABASE_MODEL.md
05_RISK_ENGINE.md
06_INVESTIGATOR_WORKFLOW.md
07_UI_UX_SPECIFICATION.md
08_SECURITY_MODEL.md
09_DEMO_SCENARIOS.md
10_ANTIGRAVITY_IMPLEMENTATION_INSTRUCTIONS.md

Then audit the existing repository before changing code.

Do NOT perform a blind rewrite.

Produce an Implementation Audit artifact containing:
1. current architecture
2. reusable code
3. obsolete code
4. required changes
5. proposed file changes
6. Firebase/Firestore compatibility
7. Gemini integration risks
8. testing plan
9. implementation order

Do not start implementation until the audit is complete.

After approval, implement Phase 1 and stop for verification.
```

## 26. Final Instruction

Build a **credible working prototype first**.

Do not confuse enterprise architecture with enterprise infrastructure.

The goal is to make FinGuard look and behave like a sophisticated fraud-intelligence platform while keeping the implementation small, deterministic, testable and honest about what is simulated.
