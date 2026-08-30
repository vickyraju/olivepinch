// Every list page previously checked only isLoading, so a genuinely failed request (expired
// admin session, backend down, network error) fell through to the "no data yet" empty state —
// indistinguishable from actually having zero rows. This makes a real failure visibly a failure.
export function QueryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-sm text-status-red">Couldn't load this — check your connection and try again.</p>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        Retry
      </button>
    </div>
  )
}
