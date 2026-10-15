import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChatNoteCard } from '@/components/home/ChatNoteCard';

describe('ChatNoteCard', () => {
  it('shows the message in quotes and the caption under the screenshot', () => {
    render(
      <ChatNoteCard
        message="He really liked the letter part"
        caption="Instagram DM, 22 July"
        app="instagram"
        image="/api/testimonials/chat/x?v=1"
        tilt="left"
      />,
    );
    expect(screen.getByText('“He really liked the letter part”')).toBeInTheDocument();
    expect(screen.getByText('Instagram DM, 22 July')).toBeInTheDocument();
  });

  it('names the app when there is no caption, and opens the screenshot larger', () => {
    HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    render(<ChatNoteCard message="Thank you" caption="" app="whatsapp" image="/x" tilt="right" />);
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open the screenshot larger/ }));
    expect(
      screen.getByRole('img', { name: 'A WhatsApp chat. The message says: Thank you' }),
    ).toBeInTheDocument();
  });
});
