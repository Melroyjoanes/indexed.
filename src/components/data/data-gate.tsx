"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useDatasetError, useMaybeDataset } from "./dataset-provider";

/** Renders the page once data has loaded; otherwise explains what's missing and how to fix it. */
export function DataGate({ origin, children }: { origin: "local" | "storage" | "none"; children: ReactNode }) {
  const data = useMaybeDataset();
  const error = useDatasetError();
  if (data) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {origin === "none" ? "No data loaded yet" : "The data pack couldn't be read"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {origin === "none"
          ? "Add the data pack to see this week's picture. You can upload it here for this session, or put the files in the data folder and restart."
          : error}
      </p>
      <Link
        href="/data"
        className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
      >
        Add data
      </Link>
    </div>
  );
}
