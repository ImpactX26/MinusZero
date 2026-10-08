# FinGuard AI V3 — UI/UX Specification

## 1. Design Direction

FinGuard should look like a **premium modern fintech investigation platform**, not a generic chatbot.

### Theme strategy

- **Light:** default
- **Dark:** optional
- **System:** follows OS preference

The Light theme should use a clean white foundation with controlled blue, cyan, purple, green, amber and red accents.

Do not use dark mode as the only visual identity.

## 2. Visual Principles

- clarity under pressure
- strong hierarchy
- evidence provenance
- progressive disclosure
- colour + icon + label for risk
- subtle glass/soft-surface treatment
- restrained gradients
- polished micro-interactions
- accessible contrast
- no excessive neon/glow
- no decorative 3D that harms usability

## 3. Navigation

```text
Command Center
Live Events
Investigations
Cases
Customer Intelligence
Entity Graph
Analytics
Settings
```

Hide secondary navigation when it is not useful.

## 4. Command Center

Show:

- total events
- critical alerts
- investigations active
- cases awaiting review
- risk distribution
- recent event stream
- agent health
- scenario launcher for demo mode

Hero area:

> **From transaction signal to explainable investigation.**

## 5. Investigation Workspace

Preferred desktop layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Case header / score / status / customer / amount        │
├──────────────┬───────────────────────────┬───────────────┤
│ AI Brief     │ Timeline / Evidence /     │ Entities      │
│              │ Correlation / Explanation │ / Copilot    │
│ Why          │                           │               │
│ Recommendation                           │               │
│ Confidence   │                           │               │
└──────────────┴───────────────────────────┴───────────────┘
│ Action bar: Review / Hold / Step-up / Simulated Block   │
└──────────────────────────────────────────────────────────┘
```

## 6. AI Brief

Must show:

- verdict
- confidence
- score
- top 3–5 reasons
- recommendation
- benign hypothesis
- open questions

Every reason should link to evidence.

## 7. Agent Timeline

Display agents as a sequence:

```text
Transaction ✓
Behaviour ✓
Device ✓
Identity ✓
Location ✓
Network ✓
History ✓
Correlation ✓
Verification ✓
```

Use short progress animations, approximately 300–500 ms per state change.

The timeline should communicate work without pretending the LLM is doing hidden reasoning.

## 8. Evidence

Evidence cards should show:

- severity
- agent
- claim
- evidence chip
- source
- as-of time
- related entity

Clicking an evidence chip opens a side drawer with the underlying synthetic record.

## 9. Correlation View

Use 2D relationship visualization first.

Example:

```text
Customer ── Device ── IP
    │          │
    │          └── Other Account
    │
Transaction ── Beneficiary ── Merchant
```

Use Cytoscape.js or SVG if useful.

3D is optional and must not be required for the core workflow.

## 10. Explanation

Show:

- score
- contribution waterfall/bar
- reason codes
- positive evidence
- benign evidence
- confidence
- simple counterfactuals

## 11. Action Dialog

Every simulated action should show:

- impact preview
- recommendation rationale
- evidence
- simulated label
- confirmation

## 12. Motion

Use Framer Motion for:

1. agent progress
2. score transition
3. evidence reveal
4. correlation highlight
5. page transitions
6. case status updates
7. loading/error states

Respect `prefers-reduced-motion`.

## 13. Accessibility

- keyboard focus
- semantic labels
- colour never the sole signal
- readable contrast
- accessible charts where practical
- reduced-motion support

## 14. Responsive

Primary judging target:

- desktop ≥ 1280px

Tablet:

- stacked investigation panels

Mobile:

- read-only/alert-review experience is acceptable for MVP.

## 15. Microcopy

Prefer:

> "Device first seen 4 minutes ago."

over:

> "Dangerous device!"

Prefer:

> "AI assessment: 92% confidence; location evidence conflicts with recent history."

over:

> "Fraud confirmed."

## 16. Visual Acceptance Criteria

The application should feel:

- premium
- clean
- colourful but controlled
- enterprise
- fast
- trustworthy

It should not feel:

- like a gaming dashboard
- like a chatbot
- like a stock template
- overloaded with animations
