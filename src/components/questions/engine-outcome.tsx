import { cn } from "cn";
import { ToneBadge } from "@/components/answers/tone-badge";
import type { QuestionEngineResult, RunOutcome } from "@/engine/insights";

type Answered = Extract<RunOutcome, { kind: "answered" }>;

const ordinal = (n: number) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

function RunBadge({ run, times }: { run: Answered; times?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ToneBadge tone={run.tone} />
      {run.position !== null && (
        <span
          className="tabular text-muted-foreground text-xs"
          title={`Named ${ordinal(run.position)} among the companies in the answer`}
        >
          {ordinal(run.position)}
        </span>
      )}
      {times && times > 1 ? (
        <span
          className="tabular text-muted-foreground text-xs"
          aria-label={`the same in all ${times} runs`}
          title={`The same in all ${times} runs`}
        >
          ×{times}
        </span>
      ) : null}
    </span>
  );
}

/** How the chosen company did on one question with one AI tool: one badge per run, or one if they agree. */
export function EngineOutcome({
  result,
  className,
}: {
  result: QuestionEngineResult;
  className?: string;
}) {
  if (result.status !== "answered")
    return (
      <span className={cn("flex flex-col gap-0.5", className)}>
        <span className="text-muted-foreground text-sm font-medium">No answer</span>
        <span className="text-muted-foreground text-xs">
          {result.status === "failed" ? "The request failed" : "Not collected this week"}
        </span>
      </span>
    );

  const answered = result.runs.filter((r): r is Answered => r.kind === "answered");
  const failed = result.runs.length - answered.length;
  return (
    <span className={cn("flex flex-col items-start gap-1", className)}>
      {result.runsAgree ? (
        <RunBadge run={answered[0]!} times={answered.length} />
      ) : (
        answered.map((r) => <RunBadge key={r.responseId} run={r} />)
      )}
      {failed > 0 && (
        <span className="text-muted-foreground text-xs">
          {failed === 1 ? "1 run failed" : `${failed} runs failed`}
        </span>
      )}
    </span>
  );
}
