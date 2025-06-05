import clsx from 'clsx';

/**
 * Utility function to merge class names
 * Falls back to simple string concatenation if clsx is not available
 */
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  try {
    return clsx(inputs);
  } catch {
    // Fallback implementation if clsx is not available
    return inputs
      .filter(Boolean)
      .join(' ');
  }
}
