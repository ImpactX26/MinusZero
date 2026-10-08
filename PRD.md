# FinGuard AI — Product Requirements Document (PRD)

## 1. Executive Summary
FinGuard AI is a synthetic banking fraud-investigation prototype built for hackathon demonstration. It empowers fraud analysts and investigators to review suspicious transactions, examine cross-channel contextual signals (device, location, transaction pattern), and generate clear audit-ready risk assessments.

## 2. Core Value Proposition
- **Explainable Fraud Investigation**: Fast triaging of flagged banking events with transparent evidence breakdown.
- **Deterministic Risk Scoring**: Risk scoring and fraud classifications are calculated by strict, deterministic mathematical rules, not hallucinated by LLMs.
- **AI-Assisted Synthesis**: Future Gemini integration will summarize evidence and explain decisions without controlling the score.
- **Human-in-the-Loop**: High-impact decisions (account freezes, transaction blocks) require explicit investigator confirmation.

## 3. User Persona
- **Fraud Analyst / Investigator**: Bank operational specialist investigating suspicious activity, reviewing customer profiles, and rendering case disposition.

## 4. System Boundaries & Non-Goals
- **Synthetic Data Only**: All customer records, card numbers, accounts, and transactions are strictly synthetic demo data.
- **No Real Banking Integrations**: No direct Core Banking System (CBS), payment gateway, or SWIFT/ACH network connectivity.
- **No Real Payments / Transfers**: No real money movement.
- **No Regulatory Compliance Claims**: This is a hackathon prototype, not PCI-DSS, SOC2, or GDPR certified production software.
- **No Cross-Bank Data Sharing**: Operates within a single synthetic institution scope.
- **No Notification Delivery Systems**: No real SMS/email dispatch engines.

## 5. Scope by Phase
- **Phase 1**: Project Foundation (Firebase, Auth, Firestore, strict TypeScript structure, minimal auth shell).
- **Phase 2**: Synthetic Data Models & Seed Scenarios.
- **Phase 3**: Deterministic Scoring & Signal Engine.
- **Phase 4**: Analyst Investigation UI & Case Management.
- **Phase 5**: Gemini Explanation Layer.
- **Phase 6**: End-to-End Verification & Polish.
