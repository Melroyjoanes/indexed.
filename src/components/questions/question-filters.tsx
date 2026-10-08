"use client";

import type { FormEvent, ReactNode } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stageLabel, TONE_LABEL, type QuestionFilters, type ToneFilter } from "@/engine/insights";
import type { Tone } from "@/engine/types";

export interface Option {
  value: string;
  label: string;
  color?: string;
}

const TONES: Option[] = [
  { value: "any", label: "Any tone" },
  ...(Object.keys(TONE_LABEL) as Tone[]).map((t) => ({ value: t, label: TONE_LABEL[t] })),
  { value: "not_mentioned", label: "Not mentioned" },
];

function Dot({ color }: { color?: string }) {
  return color ? (
    <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
  ) : null;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  className?: string;
}) {
  const find = (v: string) => options.find((o) => o.value === v);
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(String(v))}>
      <SelectTrigger aria-label={label} className={className ?? "h-9"}>
        <SelectValue>
          {(v: string): ReactNode => (
            <>
              <Dot color={find(v)?.color} />
              {find(v)?.label ?? v}
            </>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <Dot color={o.color} />
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One row of filters above the questions. Wraps onto more lines on small screens. */
export function QuestionFiltersRow({
  company,
  companies,
  onCompany,
  filters,
  onFilters,
  stages,
  engines,
  onSearch,
}: {
  company: string;
  companies: Option[];
  onCompany: (key: string) => void;
  filters: QuestionFilters;
  onFilters: (f: QuestionFilters) => void;
  stages: string[];
  engines: Option[];
  onSearch: () => void;
}) {
  const name = companies.find((c) => c.value === company)?.label ?? company;
  const set = (patch: Partial<QuestionFilters>) => onFilters({ ...filters, ...patch });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch();
  };
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
      <FilterSelect
        label="Company"
        value={company}
        options={companies}
        onChange={onCompany}
        className="h-9 min-w-40"
      />
      <FilterSelect
        label="Buying stage"
        value={filters.stage}
        options={[
          { value: "all", label: "All stages" },
          ...stages.map((s) => ({ value: s, label: stageLabel(s) })),
        ]}
        onChange={(stage) => set({ stage })}
      />
      <FilterSelect
        label="AI tool"
        value={filters.engine}
        options={[{ value: "all", label: "All AI tools" }, ...engines]}
        onChange={(engine) => set({ engine })}
      />
      <FilterSelect
        label={`How ${name} was described`}
        value={filters.tone}
        options={TONES}
        onChange={(tone) => set({ tone: tone as ToneFilter })}
      />
      <form onSubmit={submit} className="relative w-full sm:ml-auto sm:w-64" role="search">
        <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={filters.text ?? ""}
          onChange={(e) => set({ text: e.target.value })}
          placeholder="Find a question or answer id"
          aria-label="Find a question, or open an answer by its id"
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 placeholder:text-muted-foreground h-9 w-full rounded-lg border bg-transparent pr-2.5 pl-8 text-sm outline-none focus-visible:ring-3"
        />
      </form>
    </div>
  );
}
