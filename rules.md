# FinGuard AI — Engineering & Decision Rules

## 1. System Responsibility Division
- **Deterministic Application Logic Owns**:
  - Arithmetic calculations
  - Velocity and behavioral signals
  - Risk score calculation (0–100 scale)
  - Final decision classification recommendation
- **Gemini (Future Phase)**:
  - Evidence interpretation and plain-English narrative
  - Executive case summary generation
  - Contextual explanations for human auditors
  - *Gemini NEVER modifies or decides the risk score.*

## 2. Fraud Risk Bands & Decision Matrix
The scoring system maps deterministic composite score (0–100) to dispositions:
- **0–30: LOW** → `ALLOW` (Transaction proceeds normally)
- **31–70: MEDIUM** → `STEP_UP_VERIFICATION` (Prompt for OTP / biometric step-up)
- **71–90: HIGH** → `BLOCK_AND_REVIEW` (Hold transaction, queue for investigator)
- **91–100: CRITICAL** → `BLOCK_AND_CREATE_CASE` (Immediate freeze & case escalation)

## 3. Fraud Heuristic Rules
- **Rule of Isolation**: A new IP address or unfamiliar city *alone* must NEVER be flagged as fraud. Travel, dynamic ISPs, and corporate VPNs are normal occurrences.
- **Corroborating Signals Required**: High risk requires multiple correlated anomalies (e.g. impossible travel velocity, rapid amount jump over baseline, uncharacteristic high-risk merchant category).
- **Human Authority**: All high-impact decisions (account suspensions, transaction forfeitures) require human investigator sign-off.

## 4. Engineering Standards
- **Strict TypeScript**: `noImplicitAny: true`, strict null checks.
- **Zero Redundant Abstractions**: Do not build enterprise service layers or micro-frameworks for simple operations.
- **Synthetic Data Integrity**: All mock data must remain clearly labeled and synthetic.
