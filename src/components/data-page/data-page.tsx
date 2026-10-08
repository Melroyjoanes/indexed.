"use client";

import type { ReactNode } from "react";
import { DataHealth } from "./data-health";
import { TrackedCompanies } from "./tracked-companies";
import { UploadPanel } from "./upload-panel";

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-4">
      <div className="max-w-3xl space-y-1">
        <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {lead ? <p className="text-muted-foreground text-sm">{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DataPage() {
  return (
    <div className="space-y-12">
      <header className="max-w-3xl space-y-3">
        <p className="text-muted-foreground text-sm">Data</p>
        <h1 className="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
          The answers behind every screen, and how complete they are
        </h1>
      </header>

      <Section
        id="add"
        title="Add a new week"
        lead="Try a new week's answers before they're added for everyone."
      >
        <div className="max-w-3xl">
          <UploadPanel />
        </div>
      </Section>

      <Section
        id="health"
        title="Data health"
        lead="What was read from the files, what was left out and why."
      >
        <DataHealth />
      </Section>

      <Section
        id="tracked"
        title="What's tracked"
        lead="The companies every answer is checked for, and the names they go by."
      >
        <TrackedCompanies />
      </Section>
    </div>
  );
}
