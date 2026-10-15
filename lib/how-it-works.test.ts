import { describe, expect, it } from 'vitest';

import {
  HOW_IT_WORKS_STEPS,
  isStepImageFilename,
  isStepImageType,
  parseStep,
  placeholderImageUrl,
  stepImageFilename,
  stepImageUrl,
} from '@/lib/how-it-works';

describe('how it works', () => {
  it('has exactly three steps, numbered in order', () => {
    expect(HOW_IT_WORKS_STEPS.map((step) => step.step)).toEqual([1, 2, 3]);
  });

  it.each([
    ['1', 1],
    ['3', 3],
    [2, 2],
  ])('reads %s as step %s', (raw, step) => {
    expect(parseStep(raw)).toBe(step);
  });

  it.each(['0', '4', '1.5', 'one', '', '../1', null])('refuses %s', (raw) => {
    expect(parseStep(raw)).toBeNull();
  });

  it('takes JPEG, PNG and WebP, and never SVG', () => {
    expect(isStepImageType('image/webp')).toBe(true);
    expect(isStepImageType('image/jpeg')).toBe(true);
    expect(isStepImageType('image/png')).toBe(true);
    expect(isStepImageType('image/svg+xml')).toBe(false);
    expect(isStepImageType('text/html')).toBe(false);
  });

  it('names an upload for its step, and checks that name', () => {
    const name = stepImageFilename(2, 'image/webp', '3f2a-91c0-ab');
    expect(name).toBe('step-2-3f2a91c0ab.webp');
    expect(isStepImageFilename(2, name)).toBe(true);
    expect(isStepImageFilename(1, name)).toBe(false);
    expect(isStepImageFilename(2, 'step-2-x.svg')).toBe(false);
    expect(isStepImageFilename(2, 'other.webp')).toBe(false);
  });

  it('points the page at the image route and the placeholder at public/', () => {
    expect(stepImageUrl(1)).toBe('/api/how-it-works/1');
    expect(placeholderImageUrl(3)).toBe('/how-it-works/step-3.webp');
  });
});
