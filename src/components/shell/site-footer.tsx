"use client";

import Link from "next/link";
import { useMaybeDataset } from "@/components/data/dataset-provider";

export function SiteFooter({ origin }: { origin: "local" | "storage" | "none" }) {
  const data = useMaybeDataset();
  const answers = data?.results.answers.length ?? 0;
  const where =
    data?.source === "upload"
      ? "your upload (this tab only)"
      : origin === "storage"
        ? "the saved data pack"
        : "the local data folder";
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm sm:px-6">
        {data ? (
          <span>
            {answers} answers, weeks {data.weeks[0]} to {data.weeks[data.weeks.length - 1]}, from{" "}
            {where}
          </span>
        ) : null}
        <Link href="/how-it-works" className="hover:text-foreground">
          How it works
        </Link>
        <Link href="/data" className="hover:text-foreground">
          Data
        </Link>
        <span className="ml-auto">A case study by Melroy Joanes for Indexed</span>
      </div>
    </footer>
  );
}
