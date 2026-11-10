import { describe, expect, it } from 'vitest';

import {
  detailsChanges,
  familiesChanges,
  functionsChanges,
  songChanges,
} from '@/lib/invite-changes';
import { EMPTY_FAMILY } from '@/lib/wedding-families';
import { emptyFunction } from '@/lib/wedding-functions';

const BEFORE = {
  bride: 'Priya',
  groom: 'Rahul',
  weddingDate: '2027-02-12',
  ceremonyTime: '19:00',
  venueName: 'The Grand Pavilion, Chhatarpur',
  venueCity: 'New Delhi, Delhi',
  venueMapsUrl: null,
};

describe('detailsChanges', () => {
  it('lists only the fields that changed, old to new', () => {
    expect(
      detailsChanges(BEFORE, {
        ...BEFORE,
        venueName: 'Taj Palace, Chanakyapuri',
        ceremonyTime: null,
        nameOrder: 'groom-first',
      }),
    ).toEqual([
      { label: 'Name order', from: 'Bride’s name first', to: 'Groom’s name first' },
      { label: 'Wedding time', from: '19:00', to: null },
      { label: 'Venue', from: 'The Grand Pavilion, Chhatarpur', to: 'Taj Palace, Chanakyapuri' },
    ]);
  });

  it('makes no line for a save that changed nothing', () => {
    expect(detailsChanges(BEFORE, { ...BEFORE })).toEqual([]);
  });
});

describe('functionsChanges', () => {
  it('notes a function added, removed, and a detail changed', () => {
    const haldi = { ...emptyFunction('haldi'), date: '2027-02-10' };
    expect(
      functionsChanges(
        [haldi, emptyFunction('mehndi')],
        [{ ...haldi, time: '10:00' }, emptyFunction('sangeet')],
      ),
    ).toEqual([
      { label: 'Haldi time', from: null, to: '10:00' },
      { label: 'Function removed', from: null, to: 'Mehndi' },
      { label: 'Function added', from: null, to: 'Sangeet' },
    ]);
  });

  it('lists the details of a newly added function', () => {
    expect(functionsChanges([], [{ ...emptyFunction('reception'), venue: 'Hyatt' }])).toEqual([
      { label: 'Function added', from: null, to: 'Reception' },
      { label: 'Reception venue', from: null, to: 'Hyatt' },
    ]);
  });
});

describe('familiesChanges', () => {
  it('names the side and the field', () => {
    const families = { groom: EMPTY_FAMILY, bride: EMPTY_FAMILY };
    expect(
      familiesChanges(families, {
        groom: { ...EMPTY_FAMILY, father: 'Shri Ramesh Sharma' },
        bride: { ...EMPTY_FAMILY, noTitle: true },
      }),
    ).toEqual([
      { label: 'Groom’s family: Father', from: null, to: 'Shri Ramesh Sharma' },
      { label: 'Bride’s family: Title', from: 'Shown', to: 'No title' },
    ]);
  });

  it('reads an old bare surname as the title, and compares with nothing saved', () => {
    expect(
      familiesChanges(undefined, {
        groom: { ...EMPTY_FAMILY, title: 'Gupta Parivar' },
        bride: EMPTY_FAMILY,
      }),
    ).toEqual([{ label: 'Groom’s family: Family title', from: null, to: 'Gupta Parivar' }]);
    expect(
      familiesChanges(
        { groom: { ...EMPTY_FAMILY, title: undefined, surname: 'Gupta' }, bride: EMPTY_FAMILY },
        { groom: { ...EMPTY_FAMILY, title: 'Gupta' }, bride: EMPTY_FAMILY },
      ),
    ).toEqual([]);
  });
});

describe('songChanges', () => {
  it('notes a new song, and nothing for the same one', () => {
    expect(songChanges(null, 'Kesariya')).toEqual([{ label: 'Song', from: null, to: 'Kesariya' }]);
    expect(songChanges('Kesariya', 'Kesariya')).toEqual([]);
  });
});
