"use client";

import { useState, type ReactNode } from "react";
import { CircleNotchIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/** Hands a file to the browser's download. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // give the browser a moment to start the download before freeing the file
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * A button that builds a file on click and downloads it. Shows that it's
 * working while the file is made, and says so plainly if it fails.
 */
export function DownloadButton({
  icon,
  label,
  busyLabel,
  fileName,
  make,
  variant = "outline",
}: {
  icon: ReactNode;
  label: string;
  busyLabel: string;
  fileName: string;
  make: () => Promise<Blob> | Blob;
  variant?: "default" | "outline";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      saveBlob(await make(), fileName);
    } catch (e) {
      console.error(e);
      setError(
        `${fileName} couldn't be created. Try again, or reload the page if it keeps failing.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        variant={variant}
        onClick={run}
        disabled={busy}
        aria-busy={busy}
        className="px-3"
      >
        {busy ? <CircleNotchIcon className="animate-spin" aria-hidden /> : icon}
        {busy ? busyLabel : label}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive flex max-w-xs gap-1.5 text-sm">
          <WarningCircleIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
