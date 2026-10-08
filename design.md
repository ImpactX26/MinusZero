# FinGuard AI — Design System & Visual Guidelines

## 1. Aesthetic Direction
- **Theme**: Dark navy / near-black enterprise fintech cockpit.
- **Tone**: Serious, institutional, high-precision, audit-grade.
- **Avoid**: Playful consumer colors, candy gradients, bubbly borders, chatbot-style conversational wrappers.

## 2. Palette Tokens
- **Background Root**: `bg-[#0B0F17]` (Deepest Obsidian Navy)
- **Card / Surface Background**: `bg-[#131B2E]` (Dark Slate Navy)
- **Border**: `border-[#1F2B48]` (Subtle steel blue border)
- **Primary Text**: `text-[#E2E8F0]` (Crisp Off-White Slate)
- **Muted Text**: `text-[#94A3B8]` (Medium Slate)
- **Accent / Focus**: `text-[#38BDF8]` / `bg-[#0284C7]` (Precise Electric Cyan/Blue)
- **Risk Severity Colors**:
  - Low (0–30): Emerald green (`text-emerald-400`, `bg-emerald-950/60`, `border-emerald-800/60`)
  - Medium (31–70): Amber yellow (`text-amber-400`, `bg-amber-950/60`, `border-amber-800/60`)
  - High (71–90): Orange red (`text-orange-400`, `bg-orange-950/60`, `border-orange-800/60`)
  - Critical (91–100): Crimson rose (`text-rose-400`, `bg-rose-950/60`, `border-rose-800/60`)

## 3. Typography
- Standard clean sans-serif (Inter / system-ui stack).
- Monospaced numerals and IDs (e.g. `font-mono`) for transaction IDs, IP addresses, amounts, and dates.

## 4. Mandatory Elements
- **Disclaimer Banner / Badge**: Prominently display:
  `"Synthetic data - demo prototype"`
  in the navigation shell or header.
