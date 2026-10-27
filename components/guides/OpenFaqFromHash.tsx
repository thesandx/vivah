'use client';

import { useEffect } from 'react';

/**
 * Opens the question a link points at, such as `/help#link-preview` from the
 * dashboard. A closed `<details>` hides its answer, and a browser does not
 * open it for a fragment on the `<li>` around it.
 *
 * A Client Component only for `location.hash`. It renders nothing, so the
 * list stays a Server Component.
 */
export function OpenFaqFromHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id === '') return;
      const details = document.getElementById(id)?.querySelector('details');
      if (details) details.open = true;
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  return null;
}
