import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OtpInput } from './OtpInput';

function Harness({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <OtpInput
      label="OTP"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

const box = (n: number) => screen.getByLabelText(`Digit ${n} of 6`);

describe('OtpInput', () => {
  it('draws six boxes that offer the SMS code for autofill', () => {
    render(<Harness />);
    const inputs = screen.getByRole('group', { name: 'OTP' }).querySelectorAll('input');
    expect(inputs).toHaveLength(6);
    for (const input of inputs) {
      expect(input).toHaveAttribute('autocomplete', 'one-time-code');
      expect(input).toHaveAttribute('inputmode', 'numeric');
    }
  });

  it('moves to the next box as each digit is typed', () => {
    render(<Harness />);
    fireEvent.change(box(1), { target: { value: '4' } });
    expect(box(1)).toHaveValue('4');
    expect(box(2)).toHaveFocus();
    fireEvent.change(box(2), { target: { value: '7' } });
    expect(box(3)).toHaveFocus();
  });

  it('spreads an autofilled code across the boxes, from any box', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(box(3), { target: { value: '232881' } });
    expect(onChange).toHaveBeenLastCalledWith('232881');
    expect(box(1)).toHaveValue('2');
    expect(box(6)).toHaveValue('1');
  });

  it('spreads a pasted code and ignores anything that is not a digit', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.paste(box(1), { clipboardData: { getData: () => 'Code: 123-456' } });
    expect(onChange).toHaveBeenLastCalledWith('123456');
  });

  it('writes at the end, never in a gap', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(box(5), { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith('9');
    expect(box(1)).toHaveValue('9');
  });

  it('replaces a digit typed over a filled box', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(box(1), { target: { value: '12' } });
    fireEvent.change(box(1), { target: { value: '15' } });
    expect(onChange).toHaveBeenLastCalledWith('52');
    expect(box(2)).toHaveFocus();
  });

  it('steps back on Backspace in an empty box', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(box(1), { target: { value: '12' } });
    fireEvent.keyDown(box(3), { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith('1');
    expect(box(2)).toHaveFocus();
  });

  it('shows the error under the boxes', () => {
    render(<OtpInput label="OTP" value="" onChange={() => {}} error="That OTP is wrong." />);
    expect(screen.getByRole('group', { name: 'OTP' })).toHaveAccessibleDescription(
      'That OTP is wrong.',
    );
    expect(box(1)).toHaveAttribute('aria-invalid', 'true');
  });
});
