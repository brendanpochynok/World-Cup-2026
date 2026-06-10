export default function Loading() {
  return (
    <div className="space-y-8 max-w-5xl" aria-busy="true" aria-label="Loading…">
      {/* Header skeleton */}
      <div className="space-y-2.5 animate-pulse">
        <div className="h-10 w-72 bg-gray-200 rounded-lg" />
        <div className="h-4 w-52 bg-gray-100 rounded" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="h-8 w-12 bg-gray-200 rounded-lg" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card p-0 overflow-hidden animate-pulse">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="px-5 py-4 border-b border-gray-100 last:border-0 flex items-center gap-3">
            <div className="h-5 w-5 bg-gray-100 rounded" />
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 bg-gray-200 rounded" />
              <div className="h-2.5 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
