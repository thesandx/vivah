import { describe, expect, it } from 'vitest';

import {
  capitalizeName,
  guestLinkKey,
  guestLinkSegment,
  guestPath,
  MAX_GUEST_NAME_LENGTH,
  parseGuestName,
} from '@/lib/guest-name';

describe('parseGuestName', () => {
  it.each([
    ['Neha', 'Neha'],
    ['neha', 'Neha'],
    ['Neha-ji', 'Neha ji'],
    ['Neha%20ji', 'Neha ji'],
    ['Sharma_ji_and_family', 'Sharma ji and family'],
    ['Dr.%20Rao', 'Dr. Rao'],
    ["D'Souza", "D'Souza"],
    ['%E0%A4%B0%E0%A4%BE%E0%A4%A7%E0%A4%BE', 'राधा'],
    ['Rahul-Sharma-2', 'Rahul Sharma'],
    ['Rahul-12', 'Rahul'],
  ])('reads %s as %s', (segment, name) => {
    expect(parseGuestName(segment)).toBe(name);
  });

  it.each([
    ['', 'empty'],
    ['---', 'only separators'],
    ['<script>', 'markup'],
    ['Neha123', 'digits'],
    ['%E0%A4', 'a broken encoding'],
    ['a'.repeat(MAX_GUEST_NAME_LENGTH + 1), 'too long'],
    ['.Neha', 'a leading dot'],
  ])('refuses %s (%s)', (segment) => {
    expect(parseGuestName(segment)).toBeNull();
  });
});

describe('guestPath', () => {
  it('turns spaces into hyphens', () => {
    expect(guestPath('Neha ji')).toBe('/Neha-ji');
  });

  it('round-trips through parseGuestName', () => {
    expect(parseGuestName(guestPath('राधा जी').slice(1))).toBe('राधा जी');
  });
});

describe('guestLinkSegment', () => {
  it('keeps the first link plain', () => {
    expect(guestLinkSegment('Rahul Sharma', 1)).toBe('Rahul-Sharma');
  });

  it('numbers a second guest of the same name', () => {
    expect(guestLinkSegment('Rahul Sharma', 2)).toBe('Rahul-Sharma-2');
  });

  it('greets the numbered guest by name only', () => {
    expect(parseGuestName(guestLinkSegment('Rahul Sharma', 3))).toBe('Rahul Sharma');
  });
});

describe('guestLinkKey', () => {
  it.each(['Rahul-Sharma', 'rahul%20sharma', 'Rahul_Sharma', '-Rahul--Sharma-'])(
    'folds %s to one key',
    (segment) => {
      expect(guestLinkKey(segment)).toBe('rahul-sharma');
    },
  );

  it('keeps the duplicate marker, so each link has its own key', () => {
    expect(guestLinkKey('Rahul-Sharma-2')).toBe('rahul-sharma-2');
  });

  it('refuses a broken encoding and an empty segment', () => {
    expect(guestLinkKey('%E0%A4')).toBeNull();
    expect(guestLinkKey('--')).toBeNull();
  });
});

describe('capitalizeName', () => {
  it('starts each word with a capital and keeps the rest small', () => {
    expect(capitalizeName('riya')).toBe('Riya');
    expect(capitalizeName('ARJUN')).toBe('Arjun');
    expect(capitalizeName('  riya   SHARMA ')).toBe('Riya Sharma');
    expect(capitalizeName('anne-marie')).toBe('Anne-Marie');
  });

  it('leaves a name in a script without case as typed', () => {
    expect(capitalizeName('राधा')).toBe('राधा');
  });
});
