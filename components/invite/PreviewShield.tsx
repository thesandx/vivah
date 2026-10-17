'use client';

import { useEffect } from 'react';

/**
 * Takes away the easy ways to copy the couple's unpaid preview on a desktop:
 * the right-click menu, image drag, and the keyboard shortcuts that open the
 * developer tools, show the page source, save or print the page.
 *
 * A Client Component that renders nothing: it only listens on the document,
 * so it adds no wrapper and no layout around the invite.
 *
 * This is a deterrent, not a lock. The browser's own menu still opens the
 * developer tools, and nothing on a page can stop a screenshot or a screen
 * recording. The watermark (`PreviewWatermark`) is what makes a capture
 * useless as an invite. The paid invite never renders this.
 */

/** With Ctrl (Windows, Linux) or Cmd (macOS): save, print, view source. */
const SAVE_KEYS = new Set(['KeyS', 'KeyP', 'KeyU']);

/**
 * With Ctrl+Shift (Windows, Linux) or Cmd+Option (macOS): the inspector,
 * the console, the element picker, Firefox's console, and the source.
 */
const DEVTOOLS_KEYS = new Set(['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyU']);

/** True when the key press opens the developer tools, the source, or saves or prints. */
export function isBlockedShortcut(event: KeyboardEvent): boolean {
  if (event.key === 'F12') return true;
  const command = event.ctrlKey || event.metaKey;
  if (!command) return false;
  // `code` names the physical key, so Option on a Mac (which turns `key`
  // into a symbol such as "ˆ") does not slip past.
  if ((event.shiftKey || event.altKey) && DEVTOOLS_KEYS.has(event.code)) return true;
  return !event.shiftKey && !event.altKey && SAVE_KEYS.has(event.code);
}

export function PreviewShield(): null {
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    const onKey = (event: KeyboardEvent) => {
      if (isBlockedShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    // Capture, so a key handler inside the invite cannot see it first.
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, []);

  return null;
}
