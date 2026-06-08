"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MEXICO_TZ } from "./time";

export type TzMode = "mexico" | "local";

const STORAGE_KEY = "wc2026-tz";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): TzMode {
  return window.localStorage.getItem(STORAGE_KEY) === "local"
    ? "local"
    : "mexico";
}

function getServerSnapshot(): TzMode {
  return "mexico";
}

function persist(mode: TzMode) {
  window.localStorage.setItem(STORAGE_KEY, mode);
  listeners.forEach((cb) => cb());
}

/** Resolve a mode to an IANA timezone string for Intl formatting. */
export function resolveTz(mode: TzMode): string {
  if (mode === "local") {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || MEXICO_TZ;
    } catch {
      return MEXICO_TZ;
    }
  }
  return MEXICO_TZ;
}

type TimezoneContextValue = {
  mode: TzMode;
  tz: string;
  setMode: (m: TzMode) => void;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const tz = resolveTz(mode);
  const setMode = (m: TzMode) => persist(m);

  return (
    <TimezoneContext.Provider value={{ mode, tz, setMode }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx)
    throw new Error("useTimezone must be used within a TimezoneProvider");
  return ctx;
}
