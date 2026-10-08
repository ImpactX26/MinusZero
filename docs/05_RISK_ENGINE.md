# FinGuard AI V3 — Risk Engine

## 1. Objective

Produce a **deterministic, explainable risk assessment** quickly enough for the demo, then enrich the case with agent evidence.

The LLM never directly sets the numerical risk score.

## 2. MVP Pipeline

```text
Event
 ↓
Normalize / Enrich
 ↓
Deterministic Features
 ↓
Hard Rules
 ↓
Weighted Signal Rules
 ↓
Correlation Bonuses / Penalties
 ↓
Score 0–100
 ↓
Risk Band
 ↓
Policy
 ↓
Recommendation
```

## 3. Signal Families

### Transaction
- amount vs customer baseline
- transaction velocity
- new beneficiary
- unusual merchant
- balance-drain-like ratio

### Behaviour
- unusual hour
- deviation from typical transaction behaviour
- unusual session/navigation indicators where seeded

### Device
- first-seen device
- device age
- device/customer mismatch
- emulator/root/remote-access indicator where available

### Identity/Login
- failed-login burst
- password reset
- profile change
- MFA anomaly
- reset → new device → payee → transfer sequence

### Location
- new city
- country mismatch
- impossible-travel style transition
- VPN/proxy indicator where available

### Network
- shared device/IP/entity
- proximity to known flagged entities
- relationship strength

### History
- previous cases
- customer tenure
- prior legitimate travel
- prior confirmed fraud labels

## 4. Example Rule Configuration

```ts
const riskRules = {
  newDevice: 15,
  multipleFailedLogins: 20,
  unusualHour: 10,
  highAmountDeviation: 20,
  newCity: 5,
  impossibleTravel: 20,
  suspiciousNetworkLink: 15,
};
```

Weights are illustrative. Final weights must be tested against the fixed scenarios and stored in one configuration module.

## 5. Correlation

A single weak signal should not create a critical decision.

Example:

```text
new device                    +15
failed logins                 +20
high amount deviation         +20
unusual hour                  +10
impossible travel             +20
network relationship          +15
                              ───
                              100
```

The engine should cap or normalize contributions so the final score remains 0–100.

## 6. Bands

| Score | Band | Default policy |
|---:|---|---|
| 0–30 | LOW | ALLOW / MONITOR |
| 31–70 | MEDIUM | STEP_UP_VERIFICATION |
| 71–90 | HIGH | HOLD / BLOCK + REVIEW |
| 91–100 | CRITICAL | CREATE CASE + HUMAN REVIEW |

## 7. Explanation

Every score should expose:

- base score
- positive contributions
- negative/exonerating contributions
- top reason codes
- confidence
- evidence references
- recommendation

Example:

```ts
{
  score: 96,
  level: "CRITICAL",
  reasons: [
    { code: "NEW_DEVICE", points: 15, evidenceId: "E-04" },
    { code: "FAILED_LOGIN_BURST", points: 20, evidenceId: "E-05" },
    { code: "IMPOSSIBLE_TRAVEL", points: 20, evidenceId: "E-07" }
  ]
}
```

## 8. Counterfactuals

Where practical, show simple deterministic statements:

> "If the device were known and there were no failed-login burst, the score would fall below the high-risk threshold."

Do not invent precise counterfactual numbers unless the engine actually recomputes them.

## 9. Investigated Score

After agents finish, structured findings may adjust the score:

```text
initial score
+
verified suspicious findings
-
verified benign evidence
=
investigated score
```

The adjustment must be deterministic and derived from structured findings, not LLM prose.

## 10. Decision Policy

```ts
if (score <= 30) ALLOW
else if (score <= 70) STEP_UP_VERIFICATION
else if (score <= 90) BLOCK_AND_REVIEW
else CREATE_INVESTIGATION
```

High-impact actions are simulated and human-confirmed.

## 11. Production Evolution

A production system can replace/add:

- LightGBM/GBDT
- sequence models
- anomaly models
- graph scores
- calibration
- SHAP
- feature stores

The MVP does not need to train these models to satisfy the demo.

## 12. Tests

The risk engine must pass fixed tests for:

1. Legitimate → LOW / ALLOW
2. Suspicious → MEDIUM / STEP_UP
3. Coordinated high risk → CRITICAL / CREATE CASE
4. Legitimate traveller → does not become critical from new city/device alone
5. Deterministic repeatability → identical input produces identical output
