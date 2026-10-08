import { cn } from "cn";
import type { Tone } from "@/engine/types";
import { TONE_LABEL } from "@/engine/insights/words";

const STYLE: Record<Tone, string> = {
  recommended: "text-tone-recommended bg-tone-recommended/10",
  neutral: "text-tone-neutral bg-tone-neutral/10",
  negative: "text-tone-negative bg-tone-negative/12",
  not_recommended: "text-tone-not-recommended bg-tone-not-recommended/10",
};

export function ToneBadge({ tone, className }: { tone: Tone | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone ? STYLE[tone] : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {tone ? TONE_LABEL[tone] : "Not mentioned"}
    </span>
  );
}
