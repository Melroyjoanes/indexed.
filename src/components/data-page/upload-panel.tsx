"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircleIcon, FileArrowUpIcon, WarningIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useUploadActions } from "@/components/data/dataset-provider";
import { listOf } from "@/engine/insights";
import { readPicked } from "@/lib/upload";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; message: string }
  | { kind: "done"; added: string[]; skipped: string[] };

export function UploadPanel() {
  // aliased: this is a plain function from the provider, not a React hook
  const { add: addFiles, clear: clearUpload, source } = useUploadActions();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [over, setOver] = useState(false);

  async function take(list: FileList | null) {
    const picked = list ? [...list] : [];
    if (!picked.length) return;
    setStatus({ kind: "busy" });
    try {
      const { files, skipped } = await readPicked(picked);
      if (!files.length) {
        setStatus({
          kind: "error",
          message:
            "No data files found. Add the data pack .zip, or answer files (.jsonl) and the .json or .csv files that go with them.",
        });
        return;
      }
      const error = addFiles(files);
      setStatus(
        error
          ? { kind: "error", message: error }
          : { kind: "done", added: files.map((f) => f.name), skipped },
      );
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "The files couldn't be read.",
      });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void take(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {source === "upload" ? (
        <div className="bg-accent text-accent-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
          <p className="text-sm">
            <span className="font-medium">You&apos;re looking at your upload.</span> Every screen in
            this tab now uses it. Nothing is saved for anyone else.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearUpload();
              setStatus({ kind: "idle" });
            }}
          >
            Back to the saved data
          </Button>
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-primary bg-accent" : "bg-subtle",
        )}
      >
        <FileArrowUpIcon className="text-muted-foreground size-8" aria-hidden />
        <p id="upload-hint" className="max-w-md text-sm">
          Drop the data pack .zip here, or single files: answers (.jsonl), companies and facts
          (.json) or questions (.csv). Files with the same name as saved ones replace them.
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept=".zip,.jsonl,.json,.csv"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void take(e.target.files)}
        />
        <Button
          aria-describedby="upload-hint"
          disabled={status.kind === "busy"}
          onClick={() => input.current?.click()}
        >
          {status.kind === "busy" ? "Reading files" : "Choose files"}
        </Button>
      </div>

      <div aria-live="polite">
        {status.kind === "error" ? (
          <p
            role="alert"
            className="bg-warn-surface text-warn flex gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <WarningIcon weight="fill" className="mt-0.5 size-4 shrink-0" />
            {status.message}
          </p>
        ) : status.kind === "done" && source === "upload" ? (
          <p className="flex gap-2 text-sm">
            <CheckCircleIcon
              weight="fill"
              className="text-tone-recommended mt-0.5 size-4 shrink-0"
            />
            <span>
              Added {listOf(status.added)}. This applies to this browser tab only and is gone when
              you close it; nothing is saved for anyone else.
              {status.skipped.length
                ? ` Skipped ${listOf(status.skipped)}, which ${status.skipped.length === 1 ? "isn't a data file" : "aren't data files"}.`
                : ""}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Uploads stay in this browser tab. To add a week for everyone, Indexed adds it to the
            saved data pack.
          </p>
        )}
      </div>
    </div>
  );
}
