# Context Consolidation

## Status

The repo has now been migrated away from broad `Auth` and `UI` context consumers in `context/`, `components/`, `views/`, and `hooks/`.

- `DataContext` now exposes domain slices.
- `CustomerDisplayContext` now exposes status, connection, receiver, and camera slices.
- `UIContext` now exposes `useUIState()` and `useUIActions()`.
- `AuthContext` now exposes `useAuthState()` and `useAuthActions()`.

The React layer is also now more strongly aligned with domain boundaries:

- core business flows live in service modules under `services/`
- `DataContext` composition, lifecycle hooks, and value builders are separated
- POS modal UI is split into dedicated files under `components/pos/modals/`
- `POSView` is now closer to a shell/composition component than a modal container

## Cleanup Result

- `useUI()` has been removed.
- `useAuth()` has been removed.
- All application consumers were migrated before wrapper removal.
- `POSModals.tsx` is now a thin barrel export rather than a large multi-modal file.
- local POS view modals have been extracted from `POSView.tsx`.

## Static Snapshot

- top-level provider groups: `3`
- top-level providers: `13`
- `DataProvider` internal slice providers: `10`
- `CustomerDisplayProvider` internal slice providers: `5`
- `UIProvider` internal slice providers: `2`
- `AuthProvider` internal slice providers: `2`

These numbers are not performance measurements, but they are a useful structural snapshot for future cleanup work.

## POS Layer Snapshot

- shared POS modals now live in `components/pos/modals/`
- `PaymentModal` has render profiling and stabilized derived values/callbacks
- `POSView` now delegates local modal UI to focused modal components
- `usePOSLogic` remains the main POS orchestration hook, but no longer shares a giant view file with modal implementations

## Remaining Focus

- measure real render behavior around `DataProvider`, `Header`, `POSView`, and `PaymentModal`
- consider flattening some nested slice-provider composition if profiling shows cost
- keep using narrow hooks for all new work
- continue moving large presentational blocks out of shell-level views when it improves scanability without fragmenting logic too far

See also:

- [RENDER_PROFILING.md](./RENDER_PROFILING.md)

## Expected Benefit

- fewer unnecessary context subscriptions
- clearer read/write boundaries in React layer
- lower risk when reasoning about re-renders and provider coupling
- smaller POS/UI files with clearer ownership boundaries
