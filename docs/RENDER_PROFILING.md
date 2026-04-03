# Render Profiling

## Purpose

This repo now includes lightweight dev-only render profiling for:

- `AppContent`
- `RootNavigator`
- `DataProvider`
- `usePOSLogic`
- `Header`
- `POSView`
- `PaymentModal`

The goal is to spot render triggers and state churn, not to replace the React DevTools Profiler.

## How To Enable

Run the app in dev mode, then enable profiling in the browser console:

```js
localStorage.setItem('ARTEA_PROFILE_RENDERS', 'true');
window.location.reload();
```

Or for the current session only:

```js
window.__ARTEA_PROFILE_RENDERS__ = true;
window.location.reload();
```

## How To Disable

```js
localStorage.removeItem('ARTEA_PROFILE_RENDERS');
delete window.__ARTEA_PROFILE_RENDERS__;
window.location.reload();
```

## What You Will See

Console groups like:

```text
[render-profile] AppContent #12 (2 changed)
```

Each group prints the tracked fields that changed between renders.

## Current Structural Findings

- `DataProvider` remains the largest render fan-out point because it owns the full `AppData` graph and composes `10` internal slice providers.
- `AppContent` still sits on several hot subscriptions at once: auth state, UI alert state, product lookup, cart action access, and local shell state.
- `Header` is a shell hotspot because it combines sync state, destructive data actions, branch setup, and several modal flags.
- `usePOSLogic` is still a local state hotspot because it owns many modal flags and POS workflow transitions.
- `POSView` is now cleaner structurally, but it still coordinates many modal open/close paths and shell keyboard bindings.
- `PaymentModal` is one of the most meaningful checkout hotspots because it combines amount entry, payment method switching, proof capture, member balance logic, and split-payment flow.
- `CustomerDisplayProvider` is no longer the main API-coupling issue, but it still contains `5` internal slice providers and event subscriptions.

## Low-Risk Optimizations Already Applied

- `useDbUsageStatus()` now uses `useMemo` instead of `useEffect + useState`, removing one avoidable render cycle in `DataProvider`.
- `RootNavigator` now derives `urlView` synchronously instead of setting it through an effect after mount.
- `Header` now profiles its own shell state and splits status-heavy UI into smaller memoized pieces.
- `usePOSLogic` now avoids `JSON.stringify` for selected-customer syncing and stabilizes several handler callbacks.
- `POSView` avoids rebinding key listeners from a broad `logic` object dependency and now delegates more UI to focused components.
- `PaymentModal` now profiles checkout state directly and stabilizes its main derived values and callbacks.

## Recommended Workflow

1. Enable render profiling.
2. Reproduce a real cashier flow: scan item, hold cart, pay, refund, end session.
3. Watch for repeated renders where tracked fields do not meaningfully change.
4. Confirm suspicious areas with React DevTools Profiler before optimizing.

Recommended cashier flows to reproduce:

1. Add products, switch mobile tabs, and open the payment modal.
2. Test cash, non-cash, and member-balance payment methods.
3. Try split bill, hold cart, refund, and end-session flows.

## Notes

- profiling logs only in dev mode
- production builds are unaffected
- logs are intentionally coarse and operational, not micro-benchmark precision
