"use client";

import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDataset } from "@/components/data/dataset-provider";
import { AnswerView } from "./answer-view";

/** A side panel listing the actual AI answers behind a number or alert. */
export function AnswersSheet({
  title,
  description,
  responseIds,
  trigger,
}: {
  title: string;
  description?: string;
  responseIds: string[];
  trigger: ReactNode;
}) {
  const { results } = useDataset();
  const prompts = new Set(
    results.answers.filter((a) => responseIds.includes(a.responseId)).map((a) => a.promptId),
  );
  return (
    <Sheet>
      <SheetTrigger render={<button type="button" className="block w-full text-left" />}>
        {trigger}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          {responseIds.map((id, i) => (
            <div key={id} className="space-y-6">
              {i > 0 && <Separator />}
              <AnswerView responseId={id} showQuestion={prompts.size > 1} />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
