"use client";

import { AnswerView } from "@/components/answers/answer-view";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Opens one answer found by its id. Controlled, since there's no button to click. */
export function AnswerByIdSheet({
  responseId,
  onClose,
}: {
  responseId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={responseId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Answer {responseId}</SheetTitle>
          <SheetDescription>
            The original AI answer, with every company highlighted.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          {responseId ? <AnswerView responseId={responseId} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
