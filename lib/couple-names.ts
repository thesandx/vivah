/**
 * Whose name comes first on the invite: the bride's (`Priya & Rahul`) or the
 * groom's (`Rahul & Priya`). The couple chooses on the sign-up card or in the
 * dashboard; an admin can change it from `/admin`. Pure, so every place that
 * writes the couple's names reads the same rule.
 *
 * Absent means the bride's name first, as every invite showed before the
 * choice existed, so older leads and weddings need no backfill.
 */

export const NAME_ORDERS = ['bride-first', 'groom-first'] as const;
export type NameOrder = (typeof NAME_ORDERS)[number];

export const DEFAULT_NAME_ORDER: NameOrder = 'bride-first';

/** What the choice is called on the sign-up card, the dashboard and `/admin`. */
export const NAME_ORDER_LABELS: Record<NameOrder, string> = {
  'bride-first': 'Bride’s name first',
  'groom-first': 'Groom’s name first',
};

export interface CoupleNames {
  bride: string;
  groom: string;
  nameOrder?: NameOrder | undefined;
}

/** `'groom-first'` → `'groom-first'`; anything else → `null`. */
export function parseNameOrder(value: unknown): NameOrder | null {
  return NAME_ORDERS.find((order) => order === value) ?? null;
}

/** The two names in the order the couple chose: `['Rahul', 'Priya']`. */
export function orderedNames({ bride, groom, nameOrder }: CoupleNames): [string, string] {
  return nameOrder === 'groom-first' ? [groom, bride] : [bride, groom];
}

/** `Priya & Rahul`, or `Rahul & Priya` when the groom's name comes first. */
export function coupleNames(couple: CoupleNames, joiner = '&'): string {
  const [first, second] = orderedNames(couple);
  return `${first} ${joiner} ${second}`;
}
