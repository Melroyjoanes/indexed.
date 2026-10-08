"use client";

import type { ReactNode } from "react";
import { UploadPanel } from "@/components/data-page/upload-panel";
import { useDatasetError, useMaybeDataset } from "./dataset-provider";

/**
 * Renders the page once data has loaded. Otherwise explains what's missing and
 * offers the upload right there, since every screen needs data to show anything.
 */
export function DataGate({ origin, children }: { origin: "local" | "storage" | "none"; children: ReactNode }) {
  const data = useMaybeDataset();
  const error = useDatasetError();
  if (data) return <>{children}</>;
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {origin === "none" ? "No data loaded yet" : "The data pack couldn't be read"}
        </h1>
        <p className="text-muted-foreground">
          {origin === "none"
            ? "Add the data pack to see the weekly picture. It stays in this browser tab only. To load it for everyone, put the files in the data folder and restart."
            : `${error} Add a complete data pack below to continue.`}
        </p>
      </div>
      <UploadPanel />
    </div>
  );
}
