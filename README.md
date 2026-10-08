Absolutely — here is a **~20% shorter version** while keeping the important project story, architecture, demo scenarios, and future screenshot section.

```markdown
# FinGuard AI

> **Autonomous Multi-Agent Banking Fraud Investigation & Response Platform**

**Status:** 🚧 Active Development — Phase 2 Complete  
**Project:** 24-Hour Hackathon Prototype  
**Data:** Synthetic Banking Data Only

---

## 🚨 About FinGuard AI

FinGuard AI is an AI-powered fraud investigation platform designed to go beyond simple fraud scoring.

Instead of asking only:

> **“Is this transaction fraudulent?”**

FinGuard AI asks:

> **“Why is it suspicious, what evidence supports it, how are the signals connected, and what should happen next?”**

### Core Workflow

```text
Detect → Investigate → Correlate → Assess Risk → Decide → Act → Human Review
```

---

## 🎯 Problem

Fraud signals are often disconnected.

A transaction may look normal by itself, while its surrounding context reveals suspicious behavior.

```text
₹85,000 Transaction
       +
New Device
       +
02:13 AM
       +
Multiple Failed Logins
       +
Bengaluru → Mumbai
       ↓
Potential Account Takeover
```

The challenge is connecting these signals and understanding the complete situation.

---

## 💡 Our Solution

FinGuard AI uses specialized investigation agents to analyze different aspects of a transaction.

```text
Incoming Transaction
        ↓
Transaction Detection
        ↓
 ┌──────────────┬──────────────┬──────────────┐
 ↓              ↓              ↓
Behavior    Device/Login    Location
Agent          Agent          Agent
 └──────────────┴──────────────┴──────────────┘
                    ↓
            Evidence Correlation
                    ↓
             Risk Assessment
                    ↓
                Decision
              ↙          ↘
      Simulated Action   Human Review
```

---

## 🤖 Multi-Agent Investigation

The architecture includes:

- **Transaction Detection Agent**
- **Behavior Investigation Agent**
- **Device & Login Agent**
- **Location Agent**
- **Evidence Correlation**
- **Risk Assessment Agent**
- **Decision Agent**

Each component investigates a specific part of the transaction before the final decision.

---

## 📊 Deterministic Risk Engine

Security-sensitive decisions are handled by deterministic code rather than relying entirely on generative AI.

| Signal | Weight |
|---|---:|
| New Device | +15 |
| Multiple Failed Logins | +20 |
| Unusual Hour | +10 |
| High Amount Deviation | +20 |
| New City | +5 |
| Impossible Travel | +20 |
| Suspicious Network Link | +15 |

### Risk Bands

| Score | Risk | Decision |
|---:|---|---|
| 0–30 | LOW | `ALLOW` |
| 31–70 | MEDIUM | `STEP_UP_VERIFICATION` |
| 71–90 | HIGH | `BLOCK_AND_REVIEW` |
| 91–100 | CRITICAL | `BLOCK_AND_CREATE_CASE` |

The score is deterministic and capped at 100.

---

## 🛡️ AI Safety

External transaction data is treated as **untrusted input**.

Prompt injection must not be able to change security-sensitive decisions.

```text
Untrusted Input
      ↓
Validation
      ↓
Evidence
      ↓
Deterministic Risk Engine
      ↓
Decision
```

Gemini is intended mainly for explanations and summaries, while scoring and decisions remain controlled.

---

## 👤 Human-in-the-Loop

High-impact investigations can be escalated to human investigators.

Investigators can review:

- Transaction details
- Customer behavior
- Device and login history
- Location evidence
- Network relationships
- Risk score
- Investigation findings
- Case history

They can provide feedback such as:

```text
Confirm Fraud
```

or

```text
Mark Legitimate
```

---

## 🧪 Demo Scenarios

### 1. Legitimate Transaction

```text
₹1,500
Known Device
Normal Location
→ LOW → ALLOW
```

### 2. Suspicious Transaction

```text
Unusual Amount
Unusual Time
→ MEDIUM → STEP-UP VERIFICATION
```

### 3. Coordinated Account Takeover

```text
Customer C1003
₹85,000
New Device
02:13 AM
Multiple Failed Logins
Bengaluru → Mumbai
→ CRITICAL → BLOCK + CREATE CASE
```

### 4. Legitimate Frequent Traveller

Demonstrates that a new location does not automatically mean fraud.

### 5. Synthetic Fraud Ring

Demonstrates correlated activity across multiple synthetic identities.

### 6. Prompt Injection

Demonstrates AI safety against malicious untrusted input.

---

## 📈 Synthetic Dataset

| Data | Count |
|---|---:|
| Customers | 28 |
| Accounts | 13 |
| Devices | 32 |
| Login Events | 28 |
| Merchants | 12 |
| Network Signals | 7 |
| Transactions | 66 |
| Scenarios | 6 |

All data is synthetic.

---

## 🗂️ Data Architecture

```text
customers
accounts
transactions
devices
login_events
merchants
network_signals
evidence
correlations
investigations
cases
case_notes
audit_logs
feedback
scenario_runs
system_metrics
```

Audit logs are designed to be append-only.

---

## 🎨 Product Experience

The frontend is designed as a modern fraud-operations console rather than a basic dashboard.

The vision includes:

- Premium light/white interface
- Interactive fraud intelligence network
- Investigation timeline
- Live activity
- Risk visualization
- Evidence cards
- Customer intelligence
- Case management
- Smooth animations

---

## 📸 Product Screenshots

> **Screenshots will be added after the frontend is completed and final browser QA is finished.**

### Command Center

![FinGuard AI Command Center](docs/screenshots/command-center.png)

### Live Investigation

![FinGuard AI Investigation](docs/screenshots/investigation.png)

### Risk Assessment

![FinGuard AI Risk Assessment](docs/screenshots/risk-assessment.png)

### Investigation Case

![FinGuard AI Case Management](docs/screenshots/case-management.png)

### Customer Intelligence

![FinGuard AI Customer Intelligence](docs/screenshots/customer-intelligence.png)

### Fraud Intelligence Network

![FinGuard AI Fraud Network](docs/screenshots/fraud-network.png)

> **Note:** These image paths are placeholders until the final website screenshots are captured.

---

## 🛠️ Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React

### Backend
- Firebase Authentication
- Firebase Firestore

### AI
- Multi-Agent Architecture
- Deterministic TypeScript Risk Engine
- Gemini

### Development
- Google Antigravity
- Firebase CLI / MCP
- Git / GitHub
- gstack

---

## 📁 Project Structure

```text
FinGuard AI/
│
├── docs/
├── src/
│   ├── data/
│   ├── firebase/
│   ├── lib/
│   ├── pages/
│   ├── risk/
│   └── types/
│
├── firestore.rules
├── .env.local
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Development

```bash
npm install
npm run dev
```

TypeScript:

```bash
npx tsc --noEmit
```

Build:

```bash
npm run build
```

---

## 🔮 Vision

FinGuard AI aims to transform fraud detection from:

```text
Transaction → Fraud Score
```

into:

```text
Transaction
     ↓
Investigate
     ↓
Correlate Evidence
     ↓
Explain Risk
     ↓
Decide
     ↓
Respond
     ↓
Human Review
```

> **Don't just detect fraud. Investigate it. Understand it. Explain it. Respond to it.**

---

## ⚠️ Disclaimer

FinGuard AI is a hackathon prototype using **synthetic data only**.

It does not process real banking transactions, move real money, or provide production banking, security, compliance, or financial services.

---

# FinGuard AI

### **Detect → Investigate → Correlate → Explain → Decide → Act**
```
