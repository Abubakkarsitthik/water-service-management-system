export default function LoadingSkeleton({ type = 'card', count = 1 }) {
  const skeletons = Array.from({ length: count });

  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {skeletons.map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-card border border-surface-100 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-surface-200 rounded-lg" />
              <div className="w-16 h-4 bg-surface-200 rounded" />
            </div>
            <div className="w-20 h-8 bg-surface-200 rounded mb-1" />
            <div className="w-32 h-3 bg-surface-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden animate-pulse">
        <div className="p-4 border-b border-surface-100">
          <div className="w-48 h-6 bg-surface-200 rounded" />
        </div>
        {skeletons.map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-surface-50">
            <div className="w-8 h-8 bg-surface-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="w-40 h-4 bg-surface-200 rounded" />
              <div className="w-24 h-3 bg-surface-100 rounded" />
            </div>
            <div className="w-20 h-6 bg-surface-200 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}
