import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SignupScreen } from '@/components/lead/SignupScreen';

describe('SignupScreen', () => {
  it('is a screen of its own, with the band and the first step', () => {
    render(<SignupScreen />);
    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Make your wedding website' }),
    ).toBeInTheDocument();
    expect(main).toHaveTextContent('The two of you');
    expect(main).toHaveAttribute('data-track-section', 'hero');
  });

  it('has no close button, and a back arrow at the top from step 2', () => {
    render(<SignupScreen />);
    const main = screen.getByRole('main');
    expect(within(main).queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    expect(within(main).queryByRole('button', { name: /^Back/ })).not.toBeInTheDocument();
    expect(within(main).queryByRole('link')).not.toBeInTheDocument();

    fireEvent.change(within(main).getByLabelText("Bride's name"), { target: { value: 'Priya' } });
    fireEvent.change(within(main).getByLabelText("Groom's name"), { target: { value: 'Rahul' } });
    fireEvent.click(within(main).getByRole('button', { name: 'Begin our story' }));
    const backs = within(main).getAllByRole('button', { name: 'Back to your names' });
    expect(backs).toHaveLength(1);
    expect(main.querySelector('header')).toContainElement(backs[0] ?? null);

    fireEvent.click(backs[0] as HTMLElement);
    expect(within(main).getByLabelText("Bride's name")).toHaveValue('Priya');
  });
});
