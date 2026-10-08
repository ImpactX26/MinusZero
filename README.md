# FinGuard AI

> Autonomous Multi-Agent Banking Fraud Investigation Platform

**Status:** 🚧 Active Development — Phase 2 Complete

## Overview

FinGuard AI is a synthetic banking fraud-investigation prototype that goes beyond simple fraud scoring.

It investigates:

**Detect → Investigate → Correlate → Explain → Decide → Act**

The system analyzes:

- Customer behavior
- Transactions
- Devices
- Login activity
- Location
- Network signals

and produces an explainable risk assessment and simulated response.

## Key Features

- 🤖 Multi-agent fraud investigation
- 📊 Deterministic risk scoring
- 🔍 Evidence correlation
- 🧠 AI-assisted explanations
- 🚨 Automated simulated decisions
- 👤 Human-in-the-loop review
- 🗂️ Investigation cases
- 🔐 Firebase Authentication & Firestore
- 🧪 Synthetic banking data
- 🛡️ Prompt-injection awareness

## Risk Decisions

| Score | Risk | Decision |
|---|---|---|
| 0–30 | LOW | ALLOW |
| 31–70 | MEDIUM | STEP_UP_VERIFICATION |
| 71–90 | HIGH | BLOCK_AND_REVIEW |
| 91–100 | CRITICAL | BLOCK_AND_CREATE_CASE |

## Demo Scenarios

1. **Legitimate Transaction** → LOW
2. **Suspicious Transaction** → MEDIUM
3. **Account Takeover** → CRITICAL
4. **Frequent Traveller** → Legitimate
5. **Synthetic Fraud Ring** → High Risk
6. **Prompt Injection** → AI Safety Test

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Firebase Auth
- Firebase Firestore
- Gemini
- Antigravity IDE

## Project Structure

```text
src/
├── data/
├── firebase/
├── lib/
├── pages/
├── risk/
└── types/

docs/
firestore.rules
README.md
