# FinGuard AI V3 — Data Model

## 1. Storage Decision

The MVP remains on **Cloud Firestore** because the existing project already uses it.

The data model borrows the conceptual separation of the expanded enterprise model without forcing PostgreSQL/Redis/Neo4j/ClickHouse into the hackathon build.

## 2. Collections

Core collections:

```text
customers
accounts
transactions
devices
login_events
merchants
network_signals
investigations
agent_logs
evidence
correlations
cases
case_notes
feedback
audit_logs
```

Optional:

```text
entity_relationships
fraud_rings
scenario_runs
```

## 3. Conceptual Entity Map

```text
customers
   ├── accounts
   ├── devices
   └── login_events

accounts
   └── transactions

transactions
   ├── investigations
   ├── evidence
   └── cases

devices / IPs / beneficiaries / merchants
   └── entity_relationships

cases
   ├── case_notes
   ├── feedback
   └── audit_logs
```

## 4. Core Type Examples

```ts
type Customer = {
  id: string;
  name: string;
  homeCity: string;
  typicalAmountRange: { min: number; max: number };
  usualDevices: string[];
  riskTier: "LOW" | "MEDIUM" | "HIGH";
};

type Transaction = {
  id: string;
  customerId: string;
  amount: number;
  currency: "INR";
  city: string;
  deviceId: string;
  timestamp: string;
  merchantId?: string;
  beneficiaryId?: string;
  ip?: string;
};

type Case = {
  id: string;
  transactionId: string;
  status: "NEW" | "INVESTIGATING" | "READY" | "IN_REVIEW" | "ACTIONED" | "CLOSED";
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  verdict: string;
  recommendation: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};
```

## 5. Evidence

Evidence should be stored independently so multiple findings can reference the same record.

```ts
type Evidence = {
  id: string;
  investigationId: string;
  source: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  asOf: string;
  relatedEntityIds: string[];
};
```

## 6. Agent Logs

Store conclusions, not hidden reasoning:

```ts
type AgentLog = {
  id: string;
  investigationId: string;
  agentId: string;
  status: "running" | "ok" | "fallback" | "error";
  findings: string[];
  evidenceIds: string[];
  summary: string;
  durationMs: number;
  createdAt: string;
};
```

## 7. Correlations

```ts
type Correlation = {
  id: string;
  investigationId: string;
  signalIds: string[];
  title: string;
  explanation: string;
  strength: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};
```

## 8. Audit

Audit records are append-oriented.

```ts
type AuditLog = {
  id: string;
  actor: "SYSTEM" | "AI" | "INVESTIGATOR";
  action: string;
  objectType: string;
  objectId: string;
  details: Record<string, unknown>;
  createdAt: string;
};
```

Never store secrets or raw Gemini credentials.

## 9. Firestore Rules

Minimum requirements:

- authenticated access
- users may only access permitted application data
- client cannot arbitrarily elevate case status
- high-impact action records require server-side validation where feasible
- audit records should not be freely editable/deletable
- synthetic demo data only

The exact deployed rules must be reviewed against the existing Firebase project before release.

## 10. Production Mapping

| Firestore MVP | Production concept |
|---|---|
| transactions | event/transaction store |
| evidence | object/evidence store |
| entity_relationships | graph DB |
| hot context | Redis/feature store |
| cases | PostgreSQL case service |
| audit_logs | append-only/WORM ledger |
| analytics | ClickHouse/warehouse |

## 11. Data Quality

Every important record should include:

- stable ID
- source
- created/updated time
- relationship IDs where relevant
- scenario/demo provenance when seeded

The UI must label synthetic demo data clearly.
