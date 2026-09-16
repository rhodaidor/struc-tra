/**
 * Date and relative time formatting utilities for Structra.
 * Truthful relative time calculation from actual event ISO timestamps (UTC timestamptz).
 */

export function formatRelativeTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'Just now';

  let timestampMs: number;
  if (typeof dateInput === 'number') {
    timestampMs = dateInput;
  } else if (dateInput instanceof Date) {
    timestampMs = dateInput.getTime();
  } else {
    const parsed = Date.parse(dateInput);
    if (isNaN(parsed)) {
      return dateInput; // Return as-is if it's already a non-date string
    }
    timestampMs = parsed;
  }

  const nowMs = Date.now();
  const diffSeconds = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Absolute date in user's local timezone
  return new Date(timestampMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Returns a time-of-day greeting ('Good morning', 'Good afternoon', 'Good evening')
 * based on the user's browser/device local time.
 * 
 * Diurnal ranges:
 * - 00:00–04:59 -> "Good evening"
 * - 05:00–11:59 -> "Good morning"
 * - 12:00–16:59 -> "Good afternoon"
 * - 17:00–23:59 -> "Good evening"
 */
export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}
