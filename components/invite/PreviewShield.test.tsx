import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PreviewShield } from './PreviewShield';

describe('PreviewShield', () => {
  it('blocks the right-click menu and image drag', () => {
    render(<PreviewShield />);
    expect(fireEvent.contextMenu(document.body)).toBe(false);
    expect(fireEvent.dragStart(document.body)).toBe(false);
  });

  it('blocks the developer-tools, source, save and print keys', () => {
    render(<PreviewShield />);
    const blocked = [
      { key: 'F12', code: 'F12' },
      { key: 'I', code: 'KeyI', ctrlKey: true, shiftKey: true },
      { key: 'J', code: 'KeyJ', ctrlKey: true, shiftKey: true },
      { key: 'C', code: 'KeyC', ctrlKey: true, shiftKey: true },
      { key: 'ˆ', code: 'KeyI', metaKey: true, altKey: true },
      { key: 'u', code: 'KeyU', ctrlKey: true },
      { key: 's', code: 'KeyS', metaKey: true },
      { key: 'p', code: 'KeyP', ctrlKey: true },
    ];
    for (const init of blocked) expect(fireEvent.keyDown(window, init)).toBe(false);
  });

  it('leaves ordinary keys and copy alone', () => {
    render(<PreviewShield />);
    expect(fireEvent.keyDown(window, { key: 'i', code: 'KeyI' })).toBe(true);
    expect(fireEvent.keyDown(window, { key: 'c', code: 'KeyC', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(window, { key: 'Enter', code: 'Enter' })).toBe(true);
  });

  it('stops blocking once it is gone', () => {
    const { unmount } = render(<PreviewShield />);
    unmount();
    expect(fireEvent.contextMenu(document.body)).toBe(true);
  });
});
