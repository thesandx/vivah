export interface SectionHeadingProps {
  /** The heading's id, for the section's `aria-labelledby`. */
  id: string;
  /** The small line above the heading. */
  eyebrow: string;
  title: string;
  intro: string;
}

/** A home page section's heading, with a small line above it. A Server Component. */
export function SectionHeading({ id, eyebrow, title, intro }: SectionHeadingProps) {
  return (
    <header className="flex max-w-prose flex-col gap-3">
      <p className="text-small text-ink-soft font-semibold tracking-widest uppercase">{eyebrow}</p>
      <h2 id={id} className="text-title">
        {title}
      </h2>
      <p className="text-ink-soft">{intro}</p>
    </header>
  );
}
