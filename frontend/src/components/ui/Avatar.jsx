export function Avatar({ user, size = 'md', online = false }) {
  const sizes = { xs: 'w-5 h-5 text-[8px]', sm: 'w-7 h-7 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm', xl: 'w-12 h-12 text-base' };
  const dot   = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2 h-2', lg: 'w-2.5 h-2.5', xl: 'w-3 h-3' };

  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0`}
        style={{ backgroundColor: user?.color || '#388bfd' }}
        title={user?.name}
      >
        {user?.initials || '?'}
      </div>
      {online && (
        <span className={`absolute bottom-0 right-0 ${dot[size]} bg-success rounded-full border-2 border-base-900`} />
      )}
    </div>
  );
}
