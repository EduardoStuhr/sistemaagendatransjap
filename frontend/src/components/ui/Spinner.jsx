export function Spinner({ size = 16, className = '' }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-base-400 border-t-brand-light ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <span className="text-sm text-base-100">Carregando...</span>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-4 bg-base-500 rounded w-3/4" />
        <div className="h-5 bg-base-500 rounded-full w-16 ml-auto" />
      </div>
      <div className="h-3 bg-base-500 rounded w-full" />
      <div className="h-3 bg-base-500 rounded w-2/3" />
      <div className="flex gap-2 pt-1 border-t border-base-500">
        <div className="h-3 bg-base-500 rounded w-20" />
        <div className="h-3 bg-base-500 rounded w-16 ml-auto" />
      </div>
    </div>
  );
}
