export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-base-600 flex items-center justify-center text-base-300">
        {Icon && <Icon size={28} />}
      </div>
      <div>
        <p className="text-sm font-semibold text-base-50">{title}</p>
        {description && <p className="text-xs text-base-100 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
