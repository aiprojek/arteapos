# Architecture Audit: Artea POS

Date: 2026-04-02
Reviewer: Codex

## Executive Summary

`arteapos` is a strong product-first POS application with real operational depth. Its core strengths are offline-first persistence, rich domain support for cashier workflows, and practical multi-platform delivery through web, Android, and Electron.

The main architectural concern is not product capability. It is layering. React context currently acts as state container, business logic host, orchestration layer, and side-effect dispatcher at the same time. That worked well to reach the current product maturity, but it is now the main source of coupling and future maintenance cost.

## Scorecard

| Layer | Score | Notes |
| --- | --- | --- |
| UI / UX Shell | 7/10 | Effective for POS workflows, but app shell orchestration is concentrated in a few files |
| State Management | 5.5/10 | Centralized and simple, but tightly coupled around one large `AppData` object |
| Domain / Business Logic | 6/10 | Domain rules are rich and valuable, but mostly embedded in React contexts |
| Data Persistence / Offline | 8/10 | Offline-first model is one of the strongest parts of the system |
| Sync / Cloud | 5/10 | Practical Dropbox approach, but weak for long-term scale and merge complexity |
| Security / Hardening | 5/10 | Good local hardening effort, limited by client-heavy trust model |
| Scalability / Maintainability | 5.5/10 | Growing file size and cross-domain coupling raise the cost of change |
| Developer Experience | 5/10 | Tooling exists, but type health and architectural boundaries need cleanup |

Overall score: `5.9/10`

## System Shape

### What the system does well

- Uses Dexie/IndexedDB as the operational source of truth.
- Supports meaningful POS workflows: held carts, split bill, loyalty, inventory deduction, refunds, audit log, customer display, kitchen display.
- Ships across browser, Android, and desktop with one application codebase.
- Keeps business continuity high through offline-first behavior.

### What the system currently is

The app is best described as a frontend monolith with strong product maturity and weak application-layer separation.

The current layer stack is roughly:

1. UI components and views
2. React contexts as domain entry points
3. Shared `AppData` object as state backbone
4. Dexie persistence and Dropbox sync services

The pressure point is layer 2. Contexts are doing too much.

## Layer Findings

### 1. UI / UX Shell

Strengths:

- The app shell is optimized for operational speed rather than generic web navigation.
- Special display modes are handled simply and effectively.
- Native and hardware integration is close to the shell, which is practical for POS usage.

Risks:

- `App.tsx` owns too many concerns: navigation state, role gating, native bridge events, barcode keyboard capture, display-mode routing, and layout shell.
- As more modes or role-specific screens are added, the shell will become harder to reason about.

Recommendation:

- Split app shell responsibilities into `navigation`, `device events`, and `display mode` modules.

### 2. State Management

Strengths:

- Easy to understand.
- Easy to bootstrap.
- Works naturally with Dexie persistence.

Risks:

- `AppData` is a large shared graph updated from many domains.
- Most contexts mutate the same backing object through `setData`.
- Referential changes on large slices can increase render and reasoning cost.
- Domain boundaries are soft because every domain knows the same central state structure.

Recommendation:

- Move toward domain slices or repository-backed state modules.
- Keep contexts as adapters, not as the main place where all state mutation logic lives.

### 3. Domain / Business Logic

Strengths:

- Business rules are substantial and reflect real-world operations.
- Inventory, cart, finance, session, and loyalty flows are already quite mature.

Risks:

- Large use cases are implemented directly in contexts.
- A single action often mixes validation, domain mutation, audit behavior, display behavior, and cloud behavior.
- This makes testing and future refactor work expensive.

Recommendation:

- Extract pure application use cases for core flows:
  - save transaction
  - refund transaction
  - apply channel sales
  - purchase and restock

### 4. Data Persistence / Offline

Strengths:

- The app is genuinely offline-first.
- Persistence behavior is coherent with product goals.
- Dexie is used in a practical way and fits the use case.

Risks:

- Persistence logic is still tightly bound to `AppData`.
- Schema evolution will become more expensive as the state graph grows.
- Restore logic is powerful but centralized and sensitive to future model changes.

Recommendation:

- Introduce repository modules per domain to decouple persistence details from UI-facing state logic.

### 5. Sync / Cloud

Strengths:

- Dropbox is a pragmatic low-cost cloud bridge for the product's target market.
- Branch upload and master data pull cover important operational needs.

Risks:

- Sync is mostly snapshot and file-log based.
- Dashboard aggregation requires recursive folder scanning and merge behavior across many files.
- Sync triggers are distributed across multiple contexts.
- Conflict handling is still tactical rather than formal.

Recommendation:

- Move toward explicit sync batches, checkpointing, retention rules, and a clearer conflict strategy.

### 6. Security / Hardening

Strengths:

- PIN hashing, audit logging, recovery flows, and login hardening show strong intent.
- The codebase clearly tries to reduce fraud and misuse at the app layer.

Risks:

- Dropbox secrets still live on the client side.
- Client-side encryption helps with casual exposure, but it is not a true trust boundary.
- Authorization is mostly app-driven rather than server-enforced.

Recommendation:

- For higher-trust deployments, add a thin backend for secret custody, pairing, and sensitive token issuance.

### 7. Scalability / Maintainability

Risks:

- Several key files are now large enough to slow down change:
  - `context/CartContext.tsx`
  - `context/ProductContext.tsx`
  - `context/FinanceContext.tsx`
  - `hooks/usePOSLogic.ts`
  - some large views

Recommendation:

- Treat current size as a signal to refactor by use case, not just by UI component.

### 8. Developer Experience

Findings:

- Tooling is present.
- TypeScript is in place.
- Current type health is not fully clean, which is risky for a business-heavy app.

Recommendation:

- Enforce `typecheck` and keep architectural hotspots under test before more feature growth.

## Architectural Priorities

### Immediate

- Clean up type errors.
- Extract transaction, refund, and stock-changing use cases into pure modules.
- Reduce side effects directly embedded in contexts.

### Near Term

- Split `AppData` into clearer domain slices.
- Introduce repositories or state adapters per domain.
- Standardize cloud sync triggers and payload creation.

### Longer Term

- Add a thin backend if the product moves toward higher-trust or larger multi-branch deployments.
- Formalize schema migrations and sync conflict policy.

## 30-60-90 Day Plan

### 30 days

- Make `typecheck` green.
- Extract transaction save flow into an application module.
- Extract refund flow into an application module.
- Add tests for cart totals, transaction save, refund, and inventory deduction.

### 60 days

- Split large contexts by responsibility.
- Introduce repository-style modules for Dexie access.
- Reduce direct `setData(prev => ...)` usage in business-heavy paths.

### 90 days

- Refactor Dropbox sync toward checkpointed batches.
- Define retention and merge strategy.
- Evaluate backend-assisted security and branch coordination.

## Recommended Direction

Do not rewrite the application.

Keep:

- React
- Vite
- Dexie
- Capacitor
- Electron
- Offline-first model

Refactor toward:

1. UI layer
2. Context or store adapters
3. Application use cases
4. Domain helpers
5. Persistence and sync repositories

This preserves delivery speed while reducing long-term coupling.
