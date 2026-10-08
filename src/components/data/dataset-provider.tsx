"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import trackerConfig from "../../../config/tracker.json";
import { focusBrands, viewAs, type TrackerConfig } from "@/engine/config";
import type { SourceFile } from "@/engine/ingest";
import { buildPack, PackError } from "@/engine/pack";
import { runPack, type Results } from "@/engine/run";
import { score, type Scoring } from "@/engine/score";

const UPLOAD_KEY = "indexed.upload";

/** The uploaded pack lives in sessionStorage: this browser tab only, gone when it closes. */
const uploadStore = {
  listeners: new Set<() => void>(),
  subscribe(fn: () => void) {
    uploadStore.listeners.add(fn);
    return () => uploadStore.listeners.delete(fn);
  },
  read(): string | null {
    try {
      return sessionStorage.getItem(UPLOAD_KEY);
    } catch {
      return null;
    }
  },
  write(value: string | null) {
    try {
      if (value === null) sessionStorage.removeItem(UPLOAD_KEY);
      else sessionStorage.setItem(UPLOAD_KEY, value);
    } catch {
      /* storage unavailable or full */
    }
    uploadStore.listeners.forEach((fn) => fn());
  },
};

export interface Dataset {
  results: Results; // seen from the selected company's side
  scoring: Scoring;
  weeks: number[];
  week: number;
  client: string;
  companies: { key: string; name: string }[];
  source: "saved" | "upload";
  setWeek: (w: number) => void;
  setClient: (key: string) => void;
  useUpload: (files: SourceFile[]) => string | null; // returns an error message, or null
  clearUpload: () => void;
}

type State = { ok: true; base: Results; scoring: Scoring } | { ok: false; error: string };

const Ctx = createContext<Dataset | null>(null);
const ErrCtx = createContext<string | null>(null);

function compute(files: SourceFile[]): State {
  try {
    const base = runPack(buildPack(files, trackerConfig as TrackerConfig));
    return { ok: true, base, scoring: score(base) };
  } catch (e) {
    return { ok: false, error: e instanceof PackError ? e.message : "The data pack couldn't be read." };
  }
}

export function DatasetProvider({ files, children }: { files: SourceFile[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = useSyncExternalStore(uploadStore.subscribe, uploadStore.read, () => null);
  const uploaded = useMemo<SourceFile[] | null>(() => {
    try {
      return raw ? (JSON.parse(raw) as SourceFile[]) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const state = useMemo(() => compute(uploaded ?? files), [uploaded, files]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const value = useMemo<Dataset | null>(() => {
    if (!state.ok) return null;
    const { base, scoring } = state;
    const companies = focusBrands(base.pack.settings).map((k) => ({ key: k, name: base.pack.settings.brands[k]!.name }));
    const asParam = params.get("as");
    const client = asParam && companies.some((c) => c.key === asParam) ? asParam : base.pack.settings.client;
    const weekParam = Number(params.get("week"));
    const week = scoring.weeks.includes(weekParam) ? weekParam : scoring.weeks[scoring.weeks.length - 1]!;
    const results =
      client === base.pack.settings.client
        ? base
        : { ...base, pack: { ...base.pack, settings: viewAs(base.pack.settings, client) } };
    return {
      results,
      scoring,
      weeks: scoring.weeks,
      week,
      client,
      companies,
      source: uploaded ? "upload" : "saved",
      setWeek: (w) => setParam("week", w === scoring.weeks[scoring.weeks.length - 1] ? null : String(w)),
      setClient: (k) => setParam("as", k === base.pack.settings.client ? null : k),
      useUpload: (more) => {
        const next = [...(uploaded ?? files).filter((f) => !more.some((m) => m.name === f.name)), ...more];
        const check = compute(next);
        if (!check.ok) return check.error;
        uploadStore.write(JSON.stringify(next));
        return uploadStore.read() ? null : "The files are too large to keep in this browser tab.";
      },
      clearUpload: () => uploadStore.write(null),
    };
  }, [state, params, setParam, uploaded, files]);

  return (
    <ErrCtx.Provider value={state.ok ? null : state.error}>
      <Ctx.Provider value={value}>{children}</Ctx.Provider>
    </ErrCtx.Provider>
  );
}

/** The loaded data. Only call inside pages that render after a successful load. */
export function useDataset(): Dataset {
  const d = useContext(Ctx);
  if (!d) throw new Error("useDataset must be used inside a loaded DatasetProvider");
  return d;
}

export function useMaybeDataset(): Dataset | null {
  return useContext(Ctx);
}

export function useDatasetError(): string | null {
  return useContext(ErrCtx);
}
