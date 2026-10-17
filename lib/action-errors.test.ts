import {
  UnrecognizedActionError,
  unstable_isUnrecognizedActionError,
} from 'next/dist/client/components/unrecognized-action-error';
import { describe, expect, it } from 'vitest';

import { actionErrorMessage, isStalePageError, STALE_PAGE_MESSAGE } from './action-errors';

describe('actionErrorMessage', () => {
  it('asks for a reload when the page calls an action from an older deploy', () => {
    const error = new UnrecognizedActionError('Server Action "abc" was not found on the server.');
    expect(actionErrorMessage(error, 'That did not save.')).toBe(STALE_PAGE_MESSAGE);
  });

  it('keeps the fallback for any other failure', () => {
    expect(actionErrorMessage(new TypeError('Failed to fetch'), 'That did not save.')).toBe(
      'That did not save.',
    );
    expect(actionErrorMessage('nope', 'That did not save.')).toBe('That did not save.');
  });
});

describe('isStalePageError', () => {
  it('matches the error Next throws, as its own check does', () => {
    const error = new UnrecognizedActionError('gone');
    expect(isStalePageError(error)).toBe(true);
    expect(unstable_isUnrecognizedActionError(error)).toBe(true);
    expect(isStalePageError(new Error('gone'))).toBe(false);
  });
});
