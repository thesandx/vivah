import type { NameOrder } from '@/lib/couple-names';
import { cn } from '@/lib/utils';
import {
  EMPTY_FAMILY,
  type Family,
  FAMILY_SIDE_LABELS,
  familyHasNames,
  type FamilySide,
  familyTitle,
  orderedSides,
  type WeddingFamilies,
} from '@/lib/wedding-families';

/**
 * The invite's "Our Families" section, to the product owner's design: one
 * arched card for each side, with the family name ("Gupta Parivar"), the
 * grandparents and the parents ("Son of", "Daughter of"). It sits just
 * before "Wedding Festivities".
 *
 * The cards follow the couple's name order: the bride's family first by
 * default. A side with no names is left out, and with neither side the
 * section renders nothing. The unpaid preview passes `placeholder`: both
 * cards show faint "Grandmother's name" lines and one note that the couple
 * adds the names after payment.
 *
 * A Server Component. The sizes and tones are the `jewel-family-*`
 * utilities in `styles/globals.css`.
 */

export interface OurFamiliesProps {
  /** The saved names, or `undefined` when none were added. */
  families: WeddingFamilies | undefined;
  /** The couple's first names: a side with no surname reads `Priya's Family`. */
  bride: string;
  groom: string;
  nameOrder?: NameOrder | undefined;
  /** The unpaid preview: faint placeholders instead of names. */
  placeholder?: boolean;
  className?: string;
}

const TONE: Record<FamilySide, string> = {
  groom: 'jewel-family-groom',
  bride: 'jewel-family-bride',
};

/** The white lotus in each medallion. */
function LotusIcon() {
  return (
    <svg
      viewBox="4 3.5 16 15"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      className="h-7 w-7.5"
    >
      <path d="M12 4.5c2.7 2.9 3.3 7.4 0 13-3.3-5.6-2.7-10.1 0-13Z" />
      <path d="M12 17.5c-1-4.8-3.6-7.5-7.3-8.2.1 4.5 2.9 7.6 7.3 8.2Z" />
      <path d="M12 17.5c1-4.8 3.6-7.5 7.3-8.2-.1 4.5-2.9 7.6-7.3 8.2Z" />
    </svg>
  );
}

/** The lotus drawn faint in each card's corner. Decoration. */
function CornerLotus() {
  return (
    <svg
      viewBox="0 0 60 60"
      aria-hidden="true"
      className="jewel-family-lotus"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <path d="M30 12c6 7 7 16 0 30-7-14-6-23 0-30Z" />
      <path d="M30 42c-3-11-9-18-18-20 1 10 7 18 18 20Z" />
      <path d="M30 42c3-11 9-18 18-20-1 10-7 18-18 20Z" />
      <path d="M30 42C22 37 12 36 5 40c7 4 17 5 25 2Z" />
      <path d="M30 42c8-5 18-6 25-2-7 4-17 5-25 2Z" />
    </svg>
  );
}

/** Gold lines, two rings and a marigold drop. `wide` is the one over the heading. */
function Ornament({ wide = false }: { wide?: boolean }) {
  return (
    <svg
      viewBox="0 0 160 20"
      aria-hidden="true"
      className={cn('mx-auto block', wide ? 'w-40' : 'w-26')}
      fill="none"
      stroke="var(--color-jewel-gold-line)"
      strokeWidth={wide ? 1.3 : 1.8}
    >
      <path d="M2 10h50M108 10h50" />
      <circle cx="64" cy="10" r={wide ? 3.4 : 4.2} />
      <circle cx="96" cy="10" r={wide ? 3.4 : 4.2} />
      <path
        d="M80 2.5c3.2 3.6 4.8 6 4.8 8.2a4.8 4.8 0 0 1-9.6 0c0-2.2 1.6-4.6 4.8-8.2Z"
        fill="var(--color-jewel-marigold)"
        stroke="none"
      />
      {wide && <path d="M80 15.5v3" stroke="var(--color-jewel-marigold)" />}
    </svg>
  );
}

/** Two names joined by a marigold "&", or one name alone. */
function Pair({ first, second }: { first: string | null; second: string | null }) {
  const names = [first, second].filter((name) => name !== null);
  return (
    <p className="jewel-family-names">
      {names.map((name, index) => (
        <span key={`${index}-${name}`} className="contents">
          {index > 0 && (
            <span aria-hidden="true" className="jewel-family-amp">
              &amp;
            </span>
          )}
          {index > 0 && <span className="sr-only"> and </span>}
          <span className="block">{name}</span>
        </span>
      ))}
    </p>
  );
}

function FamilyCard({
  side,
  family,
  firstName,
  placeholder,
}: {
  side: FamilySide;
  family: Family;
  firstName: string;
  placeholder: boolean;
}) {
  const labels = FAMILY_SIDE_LABELS[side];
  const title = placeholder ? 'Your Parivar' : familyTitle(family, firstName);
  const grandparents = placeholder
    ? { first: 'Grandmother’s name', second: 'Grandfather’s name' }
    : { first: family.grandmother, second: family.grandfather };
  const parents = placeholder
    ? { first: 'Mother’s name', second: 'Father’s name' }
    : { first: family.mother, second: family.father };
  const hasGrandparents = grandparents.first !== null || grandparents.second !== null;
  const hasParents = parents.first !== null || parents.second !== null;

  return (
    <article className={cn('jewel-family-card', TONE[side])}>
      <span className="jewel-family-medal">
        <LotusIcon />
      </span>
      <div className={cn('flex flex-col items-center', placeholder && 'jewel-family-faint')}>
        <h3 className="jewel-family-tag">{labels.family}</h3>
        {title !== null && <p className="jewel-family-title">{title}</p>}
        {hasGrandparents && (
          <>
            <p className="jewel-family-tag jewel-family-group">Grandparents</p>
            <Pair {...grandparents} />
          </>
        )}
        {hasGrandparents && hasParents && (
          <span className="jewel-family-rule">
            <Ornament />
          </span>
        )}
        {hasParents && (
          <>
            <p className={cn('jewel-family-tag', !hasGrandparents && 'jewel-family-group')}>
              {labels.childOf}
            </p>
            <Pair {...parents} />
          </>
        )}
      </div>
      <CornerLotus />
    </article>
  );
}

export function OurFamilies({
  families,
  bride,
  groom,
  nameOrder,
  placeholder = false,
  className,
}: OurFamiliesProps) {
  const sides = orderedSides(nameOrder).filter(
    (side) => placeholder || familyHasNames(families?.[side]),
  );
  if (sides.length === 0) return null;

  return (
    <section
      aria-label="Our families"
      data-preview-section="families"
      className={cn('jewel-section jewel-bg-families', className)}
    >
      <span aria-hidden="true" className="jewel-jaali" />
      <div className="relative">
        <Ornament wide />
        <p className="jewel-label text-jewel-gold mt-3.5">With the blessings of</p>
        <h2 className="jewel-family-heading mt-2.5">Our Families</h2>
        <p className="jewel-family-lede">
          Two families, one celebration — and a lifetime of love to thank them for.
        </p>
        <div className="jewel-family-list">
          {sides.map((side) => (
            <FamilyCard
              key={side}
              side={side}
              family={families?.[side] ?? EMPTY_FAMILY}
              firstName={side === 'bride' ? bride : groom}
              placeholder={placeholder}
            />
          ))}
        </div>
        {placeholder && (
          <p className="jewel-family-note">
            You can add both families’ names after payment. Grandparents are optional.
          </p>
        )}
      </div>
    </section>
  );
}
