# FinGuard AI V3 — Change Log

## What changed

V3 is the merged master specification created from the existing FinGuard MVP constraints and the expanded V2 architecture.

### Kept from the expanded architecture
- two-path fast decision / investigation concept
- specialized agents
- evidence-first findings
- Correlator + Challenger + Verifier
- deterministic risk engine
- investigator workspace
- security/prompt-injection controls
- relationship/graph concepts
- richer demo scenarios

### Kept from the existing project
- React + TypeScript + Tailwind
- Firebase Auth
- Firestore
- Gemini
- synthetic data
- deterministic scenarios
- human-in-the-loop
- practical hackathon scope

### Deliberately deferred
- Kafka/Flink
- Temporal
- Kubernetes
- PostgreSQL/Redis/ClickHouse/Neo4j
- MLflow
- enterprise SIEM
- production ML training

Those technologies remain documented as production-evolution targets rather than MVP dependencies.

### UI decision
The product is **Light-first**, with Light/Dark/System themes. The visual language is premium, colourful and modern while remaining enterprise and readable.

### Implementation rule
Antigravity must audit the current repository before modifying it and must not perform a blind rewrite.
