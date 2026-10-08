# FinGuard AI V3 — System Architecture

## 1. Architecture Decision

V3 uses a **two-path conceptual architecture** while implementing both paths with the existing React/Firebase foundation.

```text
                         FINANCIAL EVENT
                               │
                    ┌──────────┴──────────┐
                    │                     │
              FAST DECISION          INVESTIGATION
                    │                     │
          deterministic signals      agent orchestrator
                    │                     │
             risk calculation       specialist agents
                    │                     │
                    │               correlation/verifier
                    │                     │
                    └──────────┬──────────┘
                               ▼
                    RISK INTELLIGENCE
                               │
                     RECOMMENDATION
                               │
                       HUMAN REVIEW
                               │
                         CASE / AUDIT
                               │
                           FIRESTORE
```

The **fast path never waits on Gemini**. The investigation path may use Gemini for grounded explanations.

## 2. MVP Technology Stack

- React
- TypeScript strict mode
- Tailwind CSS
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting/App Hosting
- Gemini through a server-side route or Cloud Function where feasible
- Framer Motion
- Recharts or equivalent lightweight charting
- Cytoscape.js or a simple SVG relationship view if graph complexity is needed

## 3. Non-MVP Production Architecture

Do not add these merely for appearance:

- Kafka/Flink
- Temporal
- Kubernetes
- Terraform/ArgoCD
- PostgreSQL/Redis/ClickHouse/Neo4j
- MLflow
- enterprise SIEM

Document them as scale-out replacements where useful.

## 4. Architectural Principles

1. UI contains presentation, not fraud logic.
2. Deterministic scoring is isolated from AI text generation.
3. Agents return typed results.
4. Agents never directly mutate UI state.
5. Database access is isolated behind typed services.
6. Evidence is first-class data.
7. High-impact actions pass through a policy layer.
8. Failures are visible and recoverable.
9. Every demo scenario is deterministic.
10. Existing working Firebase infrastructure is preserved unless a change is necessary.

## 5. Application Layers

```text
src/
├─ app/
├─ components/
├─ pages/
├─ agents/
├─ orchestrator/
├─ correlation/
├─ risk/
├─ cases/
├─ intelligence/
├─ services/
│  ├─ firebase/
│  ├─ gemini/
│  └─ audit/
├─ data/
├─ hooks/
├─ types/
├─ config/
└─ tests/
```

## 6. Event Lifecycle

```text
RECEIVED
  ↓
CONTEXT_LOADING
  ↓
INVESTIGATING
  ↓
CORRELATING
  ↓
RISK_ASSESSING
  ↓
RECOMMENDATION_READY
  ↓
REVIEW_REQUIRED / AUTO_RESOLUTION
  ↓
CLOSED
```

## 7. Production Mapping

| MVP implementation | Production evolution |
|---|---|
| Firestore events | Kafka/event bus |
| Firestore feature/context docs | Redis/online feature store |
| TypeScript risk service | dedicated low-latency risk service |
| Orchestrator module | Temporal/workflow engine |
| Relationship documents | Neo4j/graph service |
| Firestore audit collection | append-only/WORM audit ledger |
| Firebase Storage | object store |
| React app | Next.js/enterprise web app |
| Gemini gateway function | provider-agnostic LLM gateway |

This mapping is explanatory only; do not introduce the production stack into the MVP unless a specific feature cannot be implemented otherwise.

## 8. Agent Contract

```ts
type AgentResult = {
  agentId: string;
  agentName: string;
  status: "running" | "ok" | "fallback" | "error";
  signals: Signal[];
  evidence: EvidenceItem[];
  riskContribution: number;
  confidence: number;
  summary: string;
  startedAt: string;
  completedAt?: string;
};
```

## 9. Evidence Contract

```ts
type EvidenceItem = {
  id: string;
  source: string;
  category: string;
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  value?: string | number | boolean;
  relatedEntityIds?: string[];
  asOf?: string;
};
```

## 10. Failure Handling

If an agent fails:

- preserve completed agents
- mark the failed agent
- continue only if safe
- show degraded state

If Gemini fails:

- use deterministic/template explanation
- do not block the workflow

If Firestore fails:

- preserve local state
- show persistence failure
- retry
- never claim success when the write failed

## 11. Observability

Record:

- event/investigation ID
- agent status and duration
- evidence count
- score and band
- recommendation
- human action
- persistence result
- timestamps

Never store hidden chain-of-thought.

## 12. Architecture Acceptance Test

The implementation is architecturally correct when:

- risk can be calculated without Gemini
- agents can run with mocked data
- one failed agent does not erase other evidence
- cases persist
- human actions are explicit
- the demo works offline/replay-style with seeded scenarios
