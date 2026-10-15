# The design language — how to build with it

Phera is a warm, round, festive design language: cream paper, plum ink, sindoor rose, soft 2px outlines, a hard puff shadow straight down, rounded fonts, festival tones and little faces. Components are React, exposed on `window.VivahUI` (`VivahUI.Button`, `VivahUI.Card`, …).

## Setup

No provider or wrapper is needed. Load `styles.css`: it carries the tokens, fonts and every utility class the components use, and styles `body` itself (cream paper background, plum ink text, Huninn). Headings `h1`–`h3` get the display font (Huninn) automatically. Never set `font-bold` on a heading — Huninn has one weight. Use `font-weighted` (Baloo 2) for a bold number.

Themes re-assign tokens only. Default is "phera". For a calm or dark product, set `data-theme="calm"` or `data-theme="night"` on `<html>`.

## Styling idiom: Tailwind utilities built from tokens

Style your own layout with these classes. Only classes compiled into `_ds_bundle.css` resolve: **no default Tailwind colours (`bg-blue-500`), no `rounded-lg`, no `shadow-lg`, no arbitrary values (`bg-[#fff]`, `w-[312px]`)**.

| Family      | Classes                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Colour      | `bg-` / `text-` / `border-` + `paper` `surface` `sunken` `ink` `ink-soft` `line` `brand` `brand-soft` `butter` `soda` `grape` `peach` `danger` `success` |
| Type        | `text-hero` `text-title` `text-heading` `text-body` `text-small` `text-key` · `font-display` `font-sans` · `font-medium`               |
| Radius      | `rounded-box` `rounded-input` `rounded-card` `rounded-sheet` `rounded-pill`                                                           |
| Outline     | `border-2 border-line` (outlines are always 2px ink)                                                                                   |
| Shadow      | `shadow-hard-sm` `shadow-hard` `shadow-hard-lg`; `squish` makes a custom surface pressable                                        |
| Layout      | `flex` `grid` `gap-*` `p-*` `px-*` `py-*` `grid-cols-1…4` `max-w-5xl` `max-w-3xl` `mx-auto` `w-full` with `sm:` `md:` `lg:`             |
| Motion      | `animate-pop` `animate-rise-in` `animate-fade-in` `animate-wobble`                                                                   |

Page background is `bg-paper`; cards and inputs sit on `bg-surface`. Festival tones (`butter`, `peach`, `soda`, `grape`, `gold`) are for identity, never meaning. Status (`danger`, `success`) always comes with words or an icon — use `Alert`, `Badge`, `FieldError`.

## Rules the components assume

- **One primary action per screen.** Exactly one `<Button>` (default `variant="primary"`); everything else `secondary` or `quiet`. Labels are verb phrases: "Create room", not "Submit".
- **Mobile first.** Unprefixed classes are the phone layout; add `sm:`/`md:`/`lg:`. On a phone the app is an app: `SiteHeader` on top with a hamburger menu, and `AppBar` (with `back`) below a top-level page. From `md` up it is a website: `SiteHeader` (or `Header`) on top, content in `PageShell` (the `max-w-5xl` frame), columns at `lg`.
- Every form control takes a visible `label`; errors go in the `error` prop, which replaces the hint.
- `Card peek={<Avatar …/>}` perches an avatar on the card's top edge — leave room above it (`pt-8`).

## Where the truth lives

- `styles.css` → `_ds_bundle.css`: every token (`--color-*`, `--text-*`, `--radius-*`, `--shadow-hard*`) and class.
- `guidelines/.github/instructions/design-language.md`: the full rulebook (cute budget, words, anti-slop list).
- `components/<group>/<Name>/<Name>.prompt.md` and `<Name>.d.ts`: each component's API and examples.

## Example

```jsx
const { PageShell, Card, Avatar, Input, Button, Badge } = window.VivahUI;

<PageShell>
  <header className="flex flex-col gap-3">
    <h1 className="text-title">Join a room</h1>
    <p className="text-ink-soft">Ask the host for the 6-letter key.</p>
  </header>
  <div className="grid gap-6 lg:grid-cols-2">
    <Card peek={<Avatar name="momo" size="lg" />}>
      <div className="flex flex-col gap-4">
        <Input label="Room key" code maxLength={6} placeholder="······" />
        <Input label="Your nickname" hint="Friends see this on the board." />
        <Button block size="lg">Join game</Button>
      </div>
    </Card>
    <Card tone="butter" className="flex flex-col gap-2">
      <Badge tone="brand">Host</Badge>
      <p className="font-display text-heading">Bingo night</p>
      <p className="text-ink-soft">Five players, round 3 of 5.</p>
    </Card>
  </div>
</PageShell>
```
