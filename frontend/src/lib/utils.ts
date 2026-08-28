import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Truncate long paths from the front (keep the tail / filename visible) and
// prefix with an ellipsis, e.g. "...logs/laravel.log".
export function tailEllipsis(path: string, max = 48): string {
  if (path.length <= max) return path;
  return "…" + path.slice(path.length - max);
}
