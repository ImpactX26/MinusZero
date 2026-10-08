# FinGuard AI V3 — Multi-Agent Investigation System

## 1. Agent Philosophy

FinGuard uses narrow, evidence-oriented specialists instead of one giant autonomous prompt.

Every agent:

- has a narrow mission
- receives only the context it needs
- returns typed structured output
- cites visible evidence
- may fail independently
- cannot execute financial actions

## 2. Orchestrator

The Orchestrator owns:

- investigation lifecycle
- agent selection
- execution order
- context passing
- status updates
- retries/fallbacks
- result aggregation

For the deterministic MVP, use a fixed order so demos are repeatable.

## 3. Agent Topology

```text
                 ORCHESTRATOR
                      │
       ┌───────┬──────┼──────┬────────┐
       ▼       ▼      ▼      ▼        ▼
 Transaction Behavior Device Identity Location
       │       │      │      │        │
       └───────┴──────┼──────┴────────┘
                      ▼
                  Network
                      │
                  History
                      │
                      ▼
                 CORRELATOR
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
     CHALLENGER                VERIFIER
          │                       │
          └───────────┬───────────┘
                      ▼
                 NARRATOR
                      │
                      ▼
              RISK INTELLIGENCE
```

Merchant and advanced graph/ring specialists may be enabled when their data exists.

## 4. Agent Catalog

| Agent | Mission |
|---|---|
| Transaction | Amount deviation, velocity, payee/merchant patterns |
| Behaviour | Customer baseline, time-of-day, navigation/session anomalies |
| Device | New device, device age, fingerprint, emulator/root/remote-access signals |
| Identity/Login | Failed logins, password resets, MFA/profile changes, ATO sequence |
| Location | Geo-velocity, city/country mismatch, VPN/proxy context |
| Network | Shared IP/device/entity relationships |
| History | Prior cases, customer baseline, prior fraud outcomes |
| Merchant | Merchant risk and transaction patterns when merchant data exists |
| Correlator | Merge findings, causal chains, contradictions |
| Challenger | Benign explanations and exonerating evidence |
| Verifier | Validate claims and evidence references |
| Narrator | Grounded investigator summary and recommendation |
| Copilot | Read-only investigator Q&A over case evidence |

## 5. Finding Contract

```ts
type Finding = {
  findingId: string;
  agent: string;
  category: string;
  title: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  direction: "SUSPICIOUS" | "BENIGN" | "NEUTRAL";
  claims: {
    text: string;
    evidenceIds: string[];
  }[];
  metrics?: Record<string, number | string | boolean>;
  relatedEntityIds?: string[];
  recommendedChecks?: string[];
};
```

**Rule:** a claim without evidence IDs is invalid and must be removed or replaced by a fallback template.

## 6. Evidence Grounding

Agents see tool/context output as **data**, not instructions.

The MVP can use typed local/Firebase service functions as the tool layer. A future MCP-style tool server can expose the same contracts.

Every evidence record should contain:

- evidence ID
- source
- timestamp/as-of
- value/snapshot
- related entity
- severity/category

## 7. Agent Execution

Preferred MVP order:

```text
Transaction
→ Behaviour
→ Device
→ Identity/Login
→ Location
→ Network
→ History
→ Correlator
→ Challenger
→ Verifier
→ Narrator
```

Agents may be parallelized later, but the initial implementation should prioritize deterministic visibility and debugging.

## 8. Challenger

The Challenger asks:

> What is the strongest legitimate explanation for this event?

Examples:

- customer travelling
- newly replaced phone
- legitimate large purchase
- known beneficiary
- device migration after official restore

The UI must show both suspicious evidence and exonerating evidence.

## 9. Verifier

The Verifier checks:

- evidence IDs exist
- claims match evidence
- metrics are not invented
- contradictory findings are marked
- unsupported claims are removed

## 10. Gemini Boundary

Gemini may summarize supplied evidence.

Gemini must not:

- calculate the final risk score
- invent evidence
- override deterministic policy
- execute actions
- directly write Firestore case outcomes

## 11. Copilot Boundary

Copilot is read-only.

It may:

- summarize
- answer evidence questions
- find similar cases
- request re-investigation

It may not:

- freeze accounts
- block beneficiaries
- modify risk
- approve actions
- alter evidence

## 12. Evaluation

Minimum MVP evaluation:

- fixed scenario correctness
- evidence coverage
- schema validity
- fallback behaviour
- no unsupported claims
- human action flow

Production evolution can add larger labeled evaluation sets, agent cost metrics, contradiction rates and red-team suites.
