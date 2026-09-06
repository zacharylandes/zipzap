"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import {
  UNDERWRITING_DEFAULTS,
  mergeAssumptions,
  type UnderwritingAssumptions,
} from "@/calc/underwriting";

const STORAGE_KEY = "hs-underwriting-assumptions";

type UnderwritingContextValue = {
  assumptions: UnderwritingAssumptions;
  setAssumptions: (next: UnderwritingAssumptions) => void;
  patchAssumptions: (patch: Partial<UnderwritingAssumptions>) => void;
  resetAssumptions: () => void;
};

const defaultAssumptions: UnderwritingAssumptions = { ...UNDERWRITING_DEFAULTS };

const UnderwritingContext = createContext<UnderwritingContextValue>({
  assumptions: defaultAssumptions,
  setAssumptions: () => {},
  patchAssumptions: () => {},
  resetAssumptions: () => {},
});

const listeners = new Set<() => void>();
let cachedRaw = "";
let cachedAssumptions: UnderwritingAssumptions = defaultAssumptions;

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  cachedRaw = "";
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readStoredAssumptions(): UnderwritingAssumptions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
    if (raw === cachedRaw) return cachedAssumptions;
    cachedRaw = raw;
    cachedAssumptions = raw ? mergeAssumptions(JSON.parse(raw) as Partial<UnderwritingAssumptions>) : {
      ...UNDERWRITING_DEFAULTS,
    };
    return cachedAssumptions;
  } catch {
    cachedRaw = "";
    cachedAssumptions = { ...UNDERWRITING_DEFAULTS };
    return cachedAssumptions;
  }
}

function writeAssumptions(next: UnderwritingAssumptions) {
  cachedAssumptions = next;
  cachedRaw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, cachedRaw);
  emit();
}

export function UnderwritingProvider({ children }: { children: React.ReactNode }) {
  const assumptions = useSyncExternalStore(
    subscribe,
    readStoredAssumptions,
    () => defaultAssumptions,
  );

  const setAssumptions = useCallback((next: UnderwritingAssumptions) => {
    writeAssumptions(next);
  }, []);

  const value = useMemo<UnderwritingContextValue>(
    () => ({
      assumptions,
      setAssumptions,
      patchAssumptions: (patch) => writeAssumptions({ ...assumptions, ...patch }),
      resetAssumptions: () => writeAssumptions({ ...UNDERWRITING_DEFAULTS }),
    }),
    [assumptions, setAssumptions],
  );

  return <UnderwritingContext.Provider value={value}>{children}</UnderwritingContext.Provider>;
}

export function useUnderwritingAssumptions(): UnderwritingContextValue {
  return useContext(UnderwritingContext);
}
