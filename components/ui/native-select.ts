/** Shared surface styles so native selects match Input / SelectTrigger. */
export const nativeSelectClassName =
  "flex h-11 w-full appearance-none touch-manipulation rounded-lg border border-input bg-transparent bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat px-3 pr-8 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:h-8 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"

/** Inline SVG chevron, 8px from the right edge (via background-position). */
export const nativeSelectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
} as const
