import { Skeleton } from "../skeleton"

/** Drop directly inside Menu Control's existing grid container -- matches its card shape. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-[12px] border border-gray-200 overflow-hidden flex flex-col">
          <Skeleton className="h-[160px] w-full rounded-none" />
          <div className="p-5 flex-1 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-auto space-y-3">
              <Skeleton className="h-5 w-24" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-7 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
