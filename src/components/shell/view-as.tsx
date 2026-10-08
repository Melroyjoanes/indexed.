"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataset } from "@/components/data/dataset-provider";

/** See the whole dashboard from a competitor's side. Changes the URL, not the data. */
export function ViewAs() {
  const { companies, client, setClient } = useDataset();
  return (
    <Select value={client} onValueChange={(v) => setClient(String(v))}>
      <SelectTrigger aria-label="Company" className="hidden h-9 w-[168px] sm:flex">
        <SelectValue>{(v: string) => companies.find((c) => c.key === v)?.name ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {companies.map((c) => (
          <SelectItem key={c.key} value={c.key}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
