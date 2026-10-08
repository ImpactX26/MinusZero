# FinGuard AI V3 — Investigator Workflow

## 1. Principle

> **AI prepares; the human decides.**

The investigator should receive a ready-to-understand case rather than a blank screen.

## 2. Case Lifecycle

```text
NEW
 ↓
INVESTIGATING
 ↓
READY
 ↓
IN_REVIEW
 ↓
ACTIONED
 ↓
CLOSED
```

Optional:

```text
ESCALATED
REOPENED
```

## 3. Queue

Display:

- priority
- case ID
- risk score/band
- typology
- customer
- amount
- SLA/demo timer
- status
- AI verdict

Filters:

- risk band
- typology
- status
- amount
- assignee

## 4. Investigator Journey

1. Open/claim case.
2. Read AI brief.
3. Review transaction.
4. Watch/inspect agent findings.
5. Inspect evidence.
6. Review correlated story.
7. Check benign hypotheses.
8. Explore entities/relationships.
9. Review explanation.
10. Select a simulated action.
11. Confirm human decision.
12. Add notes.
13. Close/disposition case.
14. Capture feedback.

## 5. AI Brief

The brief must show:

- verdict
- risk score
- band
- confidence
- top reasons
- exposure/amount
- recommended action
- open questions
- alternative explanation

## 6. Evidence Workspace

Each finding should show:

- agent
- severity
- confidence
- claim
- evidence ID
- source
- timestamp/as-of
- related entity

Unverified findings should be clearly marked.

## 7. Challenger

Show:

```text
Could this be legitimate?
```

Examples:

- customer is travelling
- customer replaced phone
- transaction matches a known pattern
- beneficiary has prior legitimate history

The investigator can mark a hypothesis as:

- ruled out
- plausible
- confirmed

## 8. Action Matrix

| Action | MVP behaviour |
|---|---|
| Allow/release | simulated, low impact |
| Step-up | simulated |
| Hold | simulated |
| Block/review | simulated + human confirmation |
| Freeze account | simulated, approval-style dialog |
| Escalate | case status change |
| Close | disposition required |

Never imply a real banking action occurred.

## 9. Action Dialog

Show:

- what will happen
- affected entity
- why it is recommended
- evidence supporting it
- simulated label
- confirmation

For high-impact actions, require explicit confirmation.

## 10. Feedback

Capture:

- Confirm Fraud
- Mark Legitimate
- Inconclusive
- analyst note
- override reason

Feedback becomes demo data for future tuning; it does not automatically retrain a model in the MVP.

## 11. Copilot

Read-only questions:

- "Summarize this case."
- "Why is this high risk?"
- "What evidence supports the device finding?"
- "Could this be legitimate?"
- "Show related entities."

Answers must point to case evidence.

## 12. Success Criteria

A new investigator should understand a standard high-risk case in under three minutes during testing.

The core screen should not require excessive navigation or hidden state.
