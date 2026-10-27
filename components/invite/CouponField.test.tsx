import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type ApplyCouponResult, CouponField } from '@/components/invite/CouponField';

function renderField(result: ApplyCouponResult, offer?: { code: string; percentOff: number }) {
  const applyCoupon = vi.fn(() => Promise.resolve(result));
  const onApplied = vi.fn();
  const onRemove = vi.fn();
  render(
    <CouponField
      applied={null}
      applyCoupon={applyCoupon}
      onApplied={onApplied}
      onRemove={onRemove}
      {...(offer !== undefined && { offer })}
    />,
  );
  return { applyCoupon, onApplied };
}

describe('CouponField', () => {
  it('opens a field from "Have a coupon code?" and applies the typed code', async () => {
    const { applyCoupon, onApplied } = renderField({
      ok: true,
      code: 'NEW20',
      percentOff: 20,
      payableRupees: 640,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Have a coupon code?' }));
    fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'new20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(applyCoupon).toHaveBeenCalledWith('NEW20');
    await vi.waitFor(() =>
      expect(onApplied).toHaveBeenCalledWith({ code: 'NEW20', percentOff: 20, payableRupees: 640 }),
    );
  });

  it('says why a code does not work', async () => {
    const { onApplied } = renderField({ ok: false, message: 'This code does not work.' });
    fireEvent.click(screen.getByRole('button', { name: 'Have a coupon code?' }));
    fireEvent.change(screen.getByLabelText('Coupon code'), { target: { value: 'NOPE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This code does not work.');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it("applies the ribbon's code in one tap", () => {
    const { applyCoupon } = renderField(
      { ok: true, code: 'NEW20', percentOff: 20, payableRupees: 640 },
      { code: 'NEW20', percentOff: 20 },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply NEW20 · 20% off' }));
    expect(applyCoupon).toHaveBeenCalledWith('NEW20');
  });

  it('shows an applied code with Remove', () => {
    const onRemove = vi.fn();
    render(
      <CouponField
        applied={{ code: 'NEW20', percentOff: 20, payableRupees: 640 }}
        applyCoupon={vi.fn()}
        onApplied={vi.fn()}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText(/applied · 20% off/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
