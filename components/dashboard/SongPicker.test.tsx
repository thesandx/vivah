import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SongPicker } from '@/components/dashboard/SongPicker';
import type { SongSlot } from '@/lib/wedding-songs';

const SONGS = [
  { slot: 1, name: 'Kesariya', src: '/api/songs/song-1-abc.mp3' },
  { slot: 3, name: 'Tum Hi Ho', src: '/api/songs/song-3-def.mp3' },
] as const;

describe('SongPicker', () => {
  const save = vi.fn<(slot: SongSlot) => Promise<{ ok: boolean; message: string }>>();

  beforeEach(() => {
    save.mockResolvedValue({ ok: true, message: 'Tum Hi Ho is now your song.' });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('marks the current song and saves only after a change', async () => {
    render(<SongPicker songs={SONGS} currentSlot={1} currentName="Kesariya" save={save} />);
    expect(screen.getByLabelText('Kesariya')).toBeChecked();
    const button = screen.getByRole('button', { name: 'Save song' });
    expect(button).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Tum Hi Ho'));
    expect(button).toBeEnabled();
    fireEvent.click(button);

    expect(save).toHaveBeenCalledWith(3);
    expect(await screen.findByText('Tum Hi Ho is now your song.')).toBeInTheDocument();
  });

  it('chooses a song when it is played', () => {
    render(<SongPicker songs={SONGS} currentSlot={null} currentName={null} save={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Tum Hi Ho' }));
    expect(screen.getByLabelText('Tum Hi Ho')).toBeChecked();
  });

  it('names a song that is no longer on the list', () => {
    render(<SongPicker songs={SONGS} currentSlot={null} currentName="Old Song" save={save} />);
    expect(screen.getByText(/Your song now is Old Song/)).toBeInTheDocument();
  });

  it('shows the error when the save fails', async () => {
    save.mockRejectedValue(new Error('network'));
    render(<SongPicker songs={SONGS} currentSlot={null} currentName={null} save={save} />);
    fireEvent.click(screen.getByLabelText('Kesariya'));
    fireEvent.click(screen.getByRole('button', { name: 'Save song' }));
    await waitFor(() =>
      expect(screen.getByText('Your song was not saved. Try again.')).toBeInTheDocument(),
    );
  });

  it('says so when there are no songs', () => {
    render(<SongPicker songs={[]} currentSlot={null} currentName={null} save={save} />);
    expect(screen.getByText(/No songs to choose from right now/)).toBeInTheDocument();
  });
});
