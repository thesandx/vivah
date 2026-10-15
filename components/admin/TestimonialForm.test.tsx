import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    >
      <input name="message" defaultValue="Thank you" aria-label="Message" />
    </TestimonialForm>,
  );
  return save;
}

function choose(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (input === null) throw new Error('no file input');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('TestimonialForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
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
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview');
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
});
