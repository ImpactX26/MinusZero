# FinGuard AI V3 — Product Requirements Document

> **Source of truth:** This document defines product scope. It deliberately combines the strongest product ideas from the expanded enterprise specification with the constraints of the existing 24-hour hackathon prototype.

## 1. Product Identity

**Name:** FinGuard AI  
**Version:** V3 — Hackathon Master Specification  
**Product type:** AI-powered fraud intelligence and multi-agent investigation prototype  
**Primary users:** Fraud investigators and fraud-operations teams  
**Data:** Synthetic/demo banking data only  
**Existing foundation:** React + TypeScript + Tailwind + Firebase + Gemini  
**Primary objective:** Move beyond a simple fraud score into explainable, multi-signal investigation while keeping a human in control of high-impact actions.

## 2. Product Vision

FinGuard AI should answer four questions:

1. **What happened?**
2. **Why is it risky?**
3. **How are the signals connected?**
4. **What should the investigator do next?**

The product is an investigation layer, not a banking core and not a real-money transaction processor.

## 3. Problem

Traditional fraud systems may surface a score while leaving investigators to manually connect transaction, device, login, location, behaviour and relationship evidence. FinGuard combines those domains into one investigation workflow.

## 4. Goals

1. Detect suspicious financial events using deterministic, explainable signals.
2. Investigate multiple evidence domains with specialized agents.
3. Correlate independent signals rather than treating one signal as proof.
4. Produce an explainable risk assessment and recommended response.
5. Give investigators a premium workspace with evidence provenance.
6. Persist cases, feedback and audit history in Firestore.
7. Demonstrate legitimate, suspicious, high-risk and false-positive scenarios.
8. Support Light, Dark and System themes, with **Light as the default**.
9. Make the architecture credible enough to explain how it scales to production.
10. Keep the actual MVP small enough to finish and test reliably.

## 5. Non-Goals

Do **not** build or claim:

- real-money transaction processing
- live bank integrations
- real customer data
- regulatory compliance certification
- autonomous irreversible financial actions
- cross-bank intelligence using private customer data
- production-scale Kubernetes/Kafka/Temporal infrastructure in the MVP
- model training pipelines as a requirement for demo completion
- AI certainty that an event is definitely fraud

## 6. Core Workflow

```text
Financial Event
      ↓
Context & Deterministic Signals
      ↓
Agent Orchestrator
      ↓
Specialized Agents
      ↓
Evidence Correlation + Challenger
      ↓
Deterministic Risk Intelligence
      ↓
Explanation + Recommendation
      ↓
Human Review for High-Impact Cases
      ↓
Simulated Action / Case Disposition
      ↓
Feedback + Audit History
```

## 7. Intelligence Domains

The V3 design supports:

- Transaction
- Behaviour
- Device
- Identity/Login
- Location
- Network/IP
- Merchant
- Velocity
- History
- Entity relationships
- Fraud-ring relationships where demo data supports them

The MVP prioritizes Transaction, Behaviour, Device/Login, Location, Network, History and Correlation. Merchant and advanced ring features are secondary unless already supported by the repository.

## 8. MVP Screens

### Primary
1. Command Center
2. Live Event Monitor
3. Investigation Workspace
4. Case Management

### Secondary
5. Customer Intelligence
6. Entity/Graph Explorer
7. Analytics
8. Settings / Theme

If schedule pressure occurs, the Investigation Workspace and Command Center take priority.

## 9. Investigation Workspace

The core screen must make the decision understandable without opening multiple pages.

It should expose:

- event summary
- customer context
- agent progress
- evidence
- correlated signals
- benign/alternative hypothesis
- risk score and band
- confidence
- explanation
- recommended action
- action preview
- case state
- investigator notes
- audit/history

## 10. Risk Bands

Use configurable bands:

| Score | Band | Default recommendation |
|---:|---|---|
| 0–30 | LOW | ALLOW / MONITOR |
| 31–70 | MEDIUM | STEP-UP VERIFICATION |
| 71–90 | HIGH | BLOCK/ HOLD + REVIEW |
| 91–100 | CRITICAL | CREATE CASE + HUMAN REVIEW |

The score must be deterministic for the fixed demo scenarios. Thresholds and weights live in one configuration module.

A new city, IP or device alone must never prove fraud.

## 11. Human-in-the-Loop

The UI must distinguish:

- **Risk assessment** — system output
- **Recommendation** — system suggestion
- **Simulated action** — demo-only execution
- **Investigator decision** — human outcome

High-impact actions require explicit investigator confirmation. The product must never imply that a real account or transaction was blocked.

## 12. AI Boundaries

Gemini may provide:

- evidence summaries
- concise contextual explanations
- investigator-readable narratives
- relationship interpretation grounded in supplied evidence

Gemini must not control:

- authentication
- Firestore authorization
- deterministic arithmetic
- score thresholds
- final risk band
- database integrity
- irreversible actions

If Gemini fails, the product must remain usable with deterministic/template explanations.

## 13. Success Criteria

A judge should be able to:

1. Open the application.
2. Run a fixed scenario.
3. Watch agents investigate.
4. Inspect evidence from multiple domains.
5. See correlation between signals.
6. Understand the risk score.
7. See a recommended response.
8. Open the case.
9. Make a human decision.
10. Refresh and see persisted case history.

## 14. Production Evolution Boundary

The architecture should **explain**, but the MVP should not implement, a future migration to:

```text
Event bus → feature store → real-time risk engine
         → durable workflow → agents → graph
         → case service → enterprise data/audit plane
```

Future technologies may include Kafka/Redpanda, Redis, Neo4j, Temporal, PostgreSQL, ClickHouse, object storage and enterprise observability. They are architectural evolution targets, not MVP prerequisites.

## 15. Product Principles

- Evidence before conclusions
- Correlation over single-signal decisions
- Deterministic scoring over LLM arithmetic
- Human oversight for high-impact actions
- Provenance for AI statements
- Light-first premium UX
- Motion communicates state, not decoration
- Synthetic data clearly labeled
- Build the smallest credible system first
