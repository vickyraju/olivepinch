import { Skeleton } from "../skeleton"

/** Drop directly inside an existing <tbody> -- headers stay visible/instant, only rows placeholder. */
export function TableSkeleton({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-100">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="py-4 px-6">
              <Skeleton className={`h-4 ${c === 0 ? "w-24" : c === columns - 1 ? "w-16 ml-auto" : "w-32"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
