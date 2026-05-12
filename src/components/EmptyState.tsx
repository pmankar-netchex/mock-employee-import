"use client";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-8 py-16 text-center max-w-xl mx-auto">
      <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
        {icon ?? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        )}
      </div>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-md bg-zinc-900 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
