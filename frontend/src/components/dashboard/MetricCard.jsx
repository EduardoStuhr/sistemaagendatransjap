export function MetricCard({ label, value, sub, color, icon: Icon, percentage }) {
  return (
    <div className="card p-4 flex flex-col gap-3 hover:border-base-400 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-base-100 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          {sub && <p className="text-xs text-base-200 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon size={16} style={{ color }} />
          </div>
        )}
      </div>
      {percentage !== undefined && (
        <div>
          <div className="h-1 bg-base-500 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }} />
          </div>
        </div>
      )}
    </div>
  );
}
