import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the data pack loads; matches the real layout so nothing jumps. */
export function ShellSkeleton() {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <span className="text-[17px] font-semibold tracking-tight">
            indexed<span className="text-primary">.</span>
          </span>
          <Skeleton className="hidden h-5 w-72 md:block" />
          <Skeleton className="ml-auto h-9 w-[132px]" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="max-w-3xl space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </main>
    </>
  );
}
