import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STALE_PAGE_MESSAGE } from '@/lib/action-errors';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const uploadImage = vi.fn();
vi.mock('@/hooks/useImageUpload', () => ({ useImageUpload: () => uploadImage }));

const { TestimonialForm } = await import('@/components/admin/TestimonialForm');

function setup(isNew: boolean, save = vi.fn()) {
  render(
    <TestimonialForm
      kind="chat"
      startUpload={vi.fn()}
      save={save}
      isNew={isNew}
      imageLabel="Screenshot"
      submitLabel="Save it"
      image={isNew ? null : '/api/testimonials/chat/c1?v=1'}
      initialValues={{ message: 'Thank you' }}
    >
      <input name="message" defaultValue="Thank you" aria-label="Message" />
    </TestimonialForm>,
  );
  return save;
}

function setupReview() {
  render(
    <TestimonialForm
      kind="review"
      startUpload={vi.fn()}
      save={vi.fn()}
      isNew={false}
      imageLabel="Photo"
      submitLabel="Save it"
      image="/api/testimonials/review/r1?v=1"
      initialValues={{ quote: 'So special', names: 'Aman & Payal', relation: '', stars: '5' }}
    >
      <textarea name="quote" defaultValue="So special" aria-label="Review" />
      <input name="names" defaultValue="Aman & Payal" aria-label="Names" />
      <input name="relation" defaultValue="" aria-label="Who wrote it" />
      <select name="stars" defaultValue="5" aria-label="Stars">
        <option value="5">5</option>
        <option value="3">3</option>
      </select>
    </TestimonialForm>,
  );
}

function preview(): HTMLElement {
  return screen.getByRole('region', { name: 'Preview' });
}

function choose(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('no file input');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('TestimonialForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:chosen');
    URL.revokeObjectURL = vi.fn();
  });

  it('previews a review as the home page card, with the saved photo', () => {
    setupReview();
    const card = within(preview()).getByRole('figure');
    expect(within(card).getByText('So special')).toBeInTheDocument();
    expect(within(card).getByText('Aman & Payal')).toBeInTheDocument();
    expect(within(card).getByText('5 out of 5 stars')).toBeInTheDocument();
    expect(card.querySelector('img')).toHaveAttribute('src', '/api/testimonials/review/r1?v=1');
  });

  it('updates the preview as the fields change, before anything is saved', () => {
    setupReview();
    fireEvent.change(screen.getByLabelText('Review'), { target: { value: 'Guests loved it' } });
    fireEvent.change(screen.getByLabelText('Who wrote it'), { target: { value: 'Bride' } });
    fireEvent.change(screen.getByLabelText('Stars'), { target: { value: '3' } });
    const region = preview();
    expect(within(region).getByText('Guests loved it')).toBeInTheDocument();
    expect(within(region).getByText('(Bride)')).toBeInTheDocument();
    expect(within(region).getByText('3 out of 5 stars')).toBeInTheDocument();
  });

  it('previews a chosen photo from the device, without uploading it', () => {
    setupReview();
    choose(new File(['x'], 'us.jpg', { type: 'image/jpeg' }));
    expect(preview().querySelector('img')).toHaveAttribute('src', 'blob:chosen');
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('keeps the card shape while a new item is empty', () => {
    setup(true);
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: '' } });
    expect(within(preview()).getByText(/The message shows here\./)).toBeInTheDocument();
  });

  it('asks for the image before adding a new item', async () => {
    const save = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }));
    expect(await screen.findByText('Choose the screenshot first.')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves an edit without a new image, and never sends the file itself', async () => {
    const save = setup(false, vi.fn().mockResolvedValue({ status: 'ok', message: 'Saved.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    const [tmpPath, form] = save.mock.calls[0] as [string | null, FormData];
    expect(tmpPath).toBeNull();
    expect(form.get('message')).toBe('Thank you');
    expect(form.has('image')).toBe(false);
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('uploads a chosen image first, then saves with its path', async () => {
    uploadImage.mockResolvedValue({ status: 'ok', tmpPath: 'tmp/x' });
    const save = setup(true, vi.fn().mockResolvedValue({ status: 'ok', message: 'Added.' }));
    choose(new File(['x'], 'shot.png', { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith('tmp/x', expect.any(FormData)));
  });

  it('shows a failed upload and does not save', async () => {
    uploadImage.mockResolvedValue({ status: 'error', message: 'That image is too large.' });
    const save = setup(true);
    choose(new File(['x'], 'shot.png', { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }));
    expect(await screen.findByText('That image is too large.')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('shows a save that throws', async () => {
    const save = setup(false, vi.fn().mockRejectedValue(new Error('down')));
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }));
    expect(await screen.findByText('That did not save. Try again.')).toBeInTheDocument();
    expect(save).toHaveBeenCalled();
  });

  it('asks for a reload when the page is older than the site', async () => {
    const stale = Object.assign(new Error('Server Action "abc" was not found on the server.'), {
      name: 'UnrecognizedActionError',
    });
    setup(false, vi.fn().mockRejectedValue(stale));
    fireEvent.click(screen.getByRole('button', { name: 'Save it' }));
    expect(await screen.findByText(STALE_PAGE_MESSAGE)).toBeInTheDocument();
  });
});
