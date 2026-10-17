/**
 * The preview's 30-minute timer. Pure, so every rule is tested without a
 * database or a clock.
 *
 * Anyone with the preview link can open it, but only for 30 minutes. The
 * timer starts the first time the link opens (`GET /p/<id>`), and it is
 * stored on the lead, so a reload or another phone does not reset it. When it
 * ends, the preview is closed for everyone until an admin reactivates it.
 * A paid lead is the couple's live invite and never closes. ADR-0010.
 */

/** How long a preview stays open after the link first opens. */
export const PREVIEW_VIEW_SECONDS = 30 * 60;

export interface PreviewTimes {
  status: string;
  /** The link expires at this instant if nobody opens it. */
  expiresAt: Date;
  /** When the 30 minutes end. `null` or absent until the link first opens. */
  viewEndsAt?: Date | null | undefined;
}

/** The end of a timer that starts at `now`. */
export function viewEndsAtFrom(now: Date): Date {
  return new Date(now.getTime() + PREVIEW_VIEW_SECONDS * 1000);
}

/** True once the 30 minutes have started. */
export function timerStarted(lead: PreviewTimes): boolean {
  return lead.viewEndsAt !== undefined && lead.viewEndsAt !== null;
}

/**
 * When the preview closes: the end of the 30 minutes once they started,
 * otherwise the unopened link's own expiry. `null` for a paid lead.
 */
export function previewClosesAt(lead: PreviewTimes): Date | null {
  if (lead.status === 'paid') return null;
  return lead.viewEndsAt ?? lead.expiresAt;
}

/** True when the preview no longer opens. A paid lead never closes. */
export function previewClosed(lead: PreviewTimes, now: Date): boolean {
  const closesAt = previewClosesAt(lead);
  return closesAt !== null && closesAt.getTime() <= now.getTime();
}

/** `29:05` for the time left, never below `00:00`. */
export function formatTimeLeft(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
