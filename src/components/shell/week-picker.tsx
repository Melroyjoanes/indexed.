"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataset } from "@/components/data/dataset-provider";

export function WeekPicker() {
  const { weeks, week, setWeek } = useDataset();
  const latest = weeks[weeks.length - 1];
  return (
    <Select value={String(week)} onValueChange={(v) => setWeek(Number(v))}>
      <SelectTrigger aria-label="Week" className="h-9 w-[150px]">
        <SelectValue>
          {(v: string) => `Week ${v}${Number(v) === latest ? " (latest)" : ""}`}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {[...weeks].reverse().map((w) => (
          <SelectItem key={w} value={String(w)}>
            Week {w}
            {w === latest ? " (latest)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
