import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    __ARTEA_PROFILE_RENDERS__?: boolean;
  }
}

type RenderSnapshot = Record<string, unknown>;

interface ChangedField {
  key: string;
  previous: unknown;
  next: unknown;
}

function isProfilingEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (
      window.__ARTEA_PROFILE_RENDERS__ === true ||
      window.localStorage.getItem('ARTEA_PROFILE_RENDERS') === 'true'
    );
  } catch {
    return window.__ARTEA_PROFILE_RENDERS__ === true;
  }
}

function collectChangedFields(
  previous: RenderSnapshot | null,
  next: RenderSnapshot
): ChangedField[] {
  if (!previous) {
    return Object.keys(next).map((key) => ({
      key,
      previous: undefined,
      next: next[key],
    }));
  }

  const allKeys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changes: ChangedField[] = [];

  allKeys.forEach((key) => {
    if (!Object.is(previous[key], next[key])) {
      changes.push({
        key,
        previous: previous[key],
        next: next[key],
      });
    }
  });

  return changes;
}

export function useRenderProfiler(name: string, snapshot: RenderSnapshot) {
  const renderCountRef = useRef(0);
  const previousSnapshotRef = useRef<RenderSnapshot | null>(null);

  useEffect(() => {
    if (!isProfilingEnabled()) {
      previousSnapshotRef.current = snapshot;
      return;
    }

    renderCountRef.current += 1;
    const changedFields = collectChangedFields(previousSnapshotRef.current, snapshot);

    console.groupCollapsed(
      `[render-profile] ${name} #${renderCountRef.current} (${changedFields.length} changed)`
    );
    if (changedFields.length === 0) {
      console.log('No tracked field changes.');
    } else {
      console.table(
        changedFields.map((field) => ({
          field: field.key,
          previous: field.previous,
          next: field.next,
        }))
      );
    }
    console.groupEnd();

    previousSnapshotRef.current = snapshot;
  });
}
