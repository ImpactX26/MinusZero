# FinGuard AI — Minimum Viable Product (MVP)

## 1. Hackathon MVP Objectives
Deliver a functional, high-fidelity fraud investigation cockpit demonstrating:
1. Investigator access control (Firebase Auth).
2. Synthetic fraud investigation cases (Firestore).
3. Deterministic rule-based scoring with visual risk classification.
4. Explainable triage view with synthetic signals (login telemetry, device history, transaction anomaly).
5. Investigator disposition actions (Allow, Step-Up, Block & Review, Block & Case).

## 2. Permitted Firestore Collections
Only the following 7 collections are permitted in the MVP database schema:
1. `customers` — Synthetic customer profiles and baseline behavior.
2. `transactions` — Financial records with merchant, amount, category, channel.
3. `devices` — Known customer devices, fingerprints, trust status.
4. `login_events` — Authentication telemetry (IP, location, timestamp, user agent).
5. `investigations` — Active and closed investigation cases with risk score and status.
6. `agent_logs` — Audit log of analysis steps and future AI explanations.
7. `feedback` — Analyst verdict and feedback on case risk assessments.

*Note: No additional application collections are permitted.*

## 3. Mandatory Disclaimers
The application must prominently display:
> `"Synthetic data - demo prototype"`
across all operational views.

## 4. Non-Goals
- Real banking integrations (Plaid, Stripe, core banking).
- Live payment settlement.
- Cross-bank data sharing.
- SMS/Email notification dispatch.
- Complex multi-tenant enterprise RBAC (single investigator role is sufficient for demo).
