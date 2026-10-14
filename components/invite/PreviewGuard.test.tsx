import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PreviewGuard } from './PreviewGuard';

function renderGuard() {
  return render(
    <PreviewGuard label="vivah.online · preview only">
      <p>Radha &amp; Shyam</p>
    </PreviewGuard>,
  );
}

describe('PreviewGuard', () => {
  it('lays the watermark over the invite', () => {
    const { container } = renderGuard();
    expect(screen.getByText('Radha & Shyam')).toBeVisible();
    expect(container.textContent).toContain('vivah.online · preview only');
  });

  it('blocks the right-click menu and the save and print keys', () => {
    renderGuard();
    const invite = screen.getByText('Radha & Shyam');
    expect(fireEvent.contextMenu(invite)).toBe(false);
    expect(fireEvent.keyDown(window, { key: 's', ctrlKey: true })).toBe(false);
    expect(fireEvent.keyDown(window, { key: 'p', metaKey: true })).toBe(false);
    expect(fireEvent.keyDown(window, { key: 's' })).toBe(true);
  });

  it('blanks the invite while the window is in the background', () => {
    renderGuard();
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(screen.getByText('Preview hidden. Come back to this tab to see it.')).toBeVisible();

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.queryByText('Preview hidden. Come back to this tab to see it.')).toBeNull();
  });
});
