# Design language: Phera

The visual and verbal rules for every product built from this template. Read this **before you write or change any UI**. The tokens live in `styles/globals.css`. The primitives live in `components/ui/`. The living reference renders at `/design`.

If a rule here conflicts with your training defaults, this file wins. If it blocks a task, say so and propose a change to this file. Do not work around it silently.

---

## The idea in one paragraph

Phera is warm, round and festive. The colours come from an Indian wedding: cream paper, plum ink, sindoor rose, haldi, marigold, peacock and lotus. The **structure** is simple: soft 2px outlines, a hard "puff" shadow straight down, flat colour and a clear hierarchy. The **details** are friendly: rounded type, faces, blush and a small bounce when you press something. Structure makes the product clear. Details make it friendly. When the two compete, clarity wins.

Three words to test every decision against: **squishy, honest, playful.**

- Squishy — things you press react physically. They sink onto their base.
- Honest — no decoration that pretends to be information. No fake stats, no filler labels.
- Playful — one moment of delight per screen, placed where the user did something.

---

## The twelve rules

1. **Use the primitives.** `components/ui/` holds them — see [The primitives](#the-primitives). Do not re-create them inline. If one is missing a variant, add the variant to the primitive and show it on `/design`.
2. **Use tokens only.** No raw hex, no arbitrary `shadow-[...]`, no arbitrary radius. If you need a value that does not exist, stop and ask. `pnpm lint` fails on each of these — see [Enforcement](#enforcement).
3. **Ink is not black.** Text uses `ink` (plum). Outlines use `line` (soft plum). Never `black`, `#000`, `#111` or `neutral-900`.
4. **Outlines are 2px.** `border-2 border-line`. Never 1px hairlines, never 3px+.
5. **Shadows go straight down.** The puff: `shadow-hard` (4px), `shadow-hard-sm` (2px), `shadow-hard-lg` (6px), in soft plum. A brand fill sits on `shadow-brand`, a darker rose. No blur, no diagonal offsets, no grey `rgba` shadows, no glows.
6. **Radius follows hierarchy.** Inputs `rounded-input`, cards `rounded-card`, sheets and modals `rounded-sheet`, buttons and chips `rounded-pill`. Never one radius for everything.
7. **One primary action per screen.** Exactly one `Button variant="primary"` is visible in any viewport. Everything else is `secondary` or `quiet`.
8. **Two typefaces, fixed roles.** Huninn is the voice: `font-display` and `font-sans` both start with it. It has one weight (400), so size and colour make the hierarchy. Baloo 2 is `font-weighted`: use it for bold numbers and badges. Baloo 2 also covers all Devanagari text. Its Devanagari face loads only for Devanagari characters (`unicode-range` in `app/layout.tsx`). Neither face has the rupee sign ₹, so ₹ comes from the system font. Do not widen the range to include ₹: one ₹ then downloads 125 KB of fonts on a phone. No third font. No fake bold: the body sets `font-synthesis-weight: none`.
9. **Colour has a job.** `brand` means "do this". Festival tones (`butter` haldi, `peach` marigold, `soda` peacock, `grape` lotus, `gold`) mean identity — this ceremony, this guest, this category. Never pick a festival tone "because it looks nice here".
10. **Faces are the signature — use them on purpose.** A face appears on avatars, the mascot, empty states, errors and wins. Never on buttons, form fields, navigation, or body text.
11. **Motion answers the user.** Press, navigate, open, select, join, win, error. The only ambient motion is the mascot's blink and a loading skeleton. No scroll-triggered fade-ins, no looping decoration. See [Motion](#motion).
12. **Mobile first, 320px up, then a real desktop.** A phone gets an app. From `md` (768px) up, the same screen is a website. Tap targets ≥ 44px (buttons are 48px or 56px). No horizontal scroll. Left-aligned text. See [Responsive](#responsive-an-app-on-a-phone-a-website-on-a-desktop).

A site built from this template also passes [the site checklist](#the-site-checklist): working links, a mobile menu, a favicon, titles and descriptions, a 404 page, clear feedback, and contact details you can tap.

---

## Tokens

All tokens are in `styles/globals.css`. Tailwind v4 generates the utilities.

### Colour

| Token                           | Utility examples             | Use it for                                    |
| ------------------------------- | ---------------------------- | --------------------------------------------- |
| `paper`                         | `bg-paper`                   | The page. Nothing else.                       |
| `surface`                       | `bg-surface`                 | Cards, inputs, sheets, bubbles                |
| `sunken`                        | `bg-sunken`                  | Wells, empty slots, disabled fills            |
| `ink`                           | `text-ink`, `fill-ink`       | Body text, headings, face features (plum)     |
| `ink-soft`                      | `text-ink-soft`              | Secondary text. Never for anything tappable.  |
| `line`                          | `border-line`                | Every outline, and the puff shadow            |
| `brand`                         | `bg-brand`                   | The primary action and the selected state     |
| `brand-soft`                    | `bg-brand-soft`              | Highlight fills, the selected tab, the mascot |
| `brand-deep`                    | `shadow-brand`               | The puff under a brand fill. Nothing else.    |
| `on-brand`                      | `text-on-brand`              | Text and icons on a `brand` fill              |
| `butter` `peach` `soda` `grape` | `bg-butter` …                | Identity only (see rule 9)                    |
| `gold`                          | `bg-gold`, `border-gold`     | Dividers and foil accents                     |
| `blush`                         | `fill-blush`                 | Cheeks on faces. Nowhere else.                |
| `danger`                        | `border-danger`, `bg-danger` | Errors: outlines and dots. Always with words. |
| `danger-soft`                   | `bg-danger-soft`             | The fill of an error badge or alert           |
| `success`                       | `border-success`             | Confirmations: outlines. Always with words.   |
| `success-soft`                  | `bg-success-soft`            | The fill of a success badge or alert          |
| `focus`                         | `outline-focus`              | The focus ring (peacock). Nothing else.       |

Text on a `brand` fill is `text-on-brand` (white, 4.8:1). Text on every other fill is `text-ink`. Never white text on a festival tone or a soft fill: the contrast fails.

`brand` is rose 600, not the lighter rose 500 of the Phera file. Rose 500 gives white text only 3.6:1, which fails WCAG AA.

### Type

| Utility        | Face         | Use it for                                          |
| -------------- | ------------ | --------------------------------------------------- |
| `text-hero`    | display      | One per page. The page's single biggest statement.  |
| `text-title`   | display      | Section headings                                    |
| `text-heading` | display/sans | Card titles, large buttons                          |
| `text-body`    | sans         | Everything you read                                 |
| `text-small`   | sans         | Hints, captions, metadata                           |
| `text-key`     | display      | Room keys, scores, countdowns — big glanceable data |

- Sentence case everywhere. No ALL-CAPS labels, no tracked-out small caps. The only uppercase text is a room key.
- Body line length stays under ~70 characters (`max-w-prose`).
- Do not emphasise a single word inside a headline with colour, italic or a highlight.

### Radius, shadow, motion

| Token              | Value                    | Use                                      |
| ------------------ | ------------------------ | ---------------------------------------- |
| `rounded-box`      | 8px                      | Checkboxes only                          |
| `rounded-input`    | 18px                     | Inputs, small wells                      |
| `rounded-card`     | 28px                     | Cards, bubbles                           |
| `rounded-sheet`    | 40px                     | Modals, bottom sheets, hero panels       |
| `rounded-pill`     | 999px                    | Buttons, chips, avatars (`rounded-full`) |
| `shadow-hard-sm`   | 0 2px 0 line             | Chips, bubbles, small pressables         |
| `shadow-hard`      | 0 4px 0 line             | Cards, secondary buttons                 |
| `shadow-hard-lg`   | 0 6px 0 line             | One hero element per page, open sheets   |
| `shadow-brand`     | 0 4px 0 brand-deep       | A brand fill: the primary button         |
| `squish` (utility) | hover lifts, press sinks | Anything pressable. Buttons have it.     |
| `squish-brand`     | the same, on brand-deep  | The primary button only                  |
| `ease-squish`      | overshoot curve          | Things that pop in or get pressed        |
| `ease-settle`      | no overshoot             | Things that move from A to B             |
| `ease-spring`      | soft overshoot           | A selection that slides into place       |
| `animate-pop`      | 420ms scale-in           | A win, a new player joining              |
| `animate-wobble`   | 520ms                    | A wrong answer, an invalid key           |
| `animate-blink`    | every 6s                 | The mascot's eyes. Only the mascot.      |

The full motion set is in [Motion](#motion).

Not every card needs a shadow. A shadow says "this is an object you can press or pick up". Static information inside a card sits flat.

---

## The primitives

Each primitive lives in `components/ui/`, has a colocated test, and renders on `/design`. Pick the primitive by its job.

| Primitive      | Use it for                                                             |
| -------------- | ---------------------------------------------------------------------- |
| `Button`       | An action. `buttonStyles()` styles a `Link` the same way.              |
| `Card`         | One object the user can act on. `peek` puts a face over the edge.      |
| `Input`        | One line of text, with a label, a hint and an error.                   |
| `Textarea`     | Several lines of text. Same label, hint and error as `Input`.          |
| `Select`       | One choice from a long list. It is a native select.                    |
| `RadioGroup`   | One choice from five options or fewer.                                 |
| `Checkbox`     | A yes/no value that a form submits later.                              |
| `Switch`       | A setting that applies at once.                                        |
| `Field`        | The label, hint and error. Use it to wrap a new form control.          |
| `Badge`        | A short state in words: "Host", "Ready". Not pressable.                |
| `Chip`         | A pill that names one thing, often with an `Avatar`. Not pressable.    |
| `ContactLink`  | A phone number (`tel:`) or an email address (`mailto:`) to tap.        |
| `Alert`        | A message in the interface voice: a result, a problem, a status.       |
| `Progress`     | How far through something the user is. It shows the value in words.    |
| `Spinner`      | Work that the user asked for and that is not complete yet.             |
| `EmptyState`   | A space with no content yet. A sleepy face, one line, one action.      |
| `Skeleton`     | The shape of content that is loading. Use it as a loading fallback.    |
| `Tabs`         | Two to five views of the same thing. A client component.               |
| `Dialog`       | A decision that must interrupt. A bottom sheet on a phone.             |
| `AutoScroller` | A row of cards that drifts and loops, and takes a swipe. No scrollbar. |
| `Avatar`       | A player. The name sets the colour and the mood.                       |
| `Face`         | The mascot face. See [Signature patterns](#signature-patterns).        |
| `Speech`       | The mascot speaks. Moments only.                                       |
| `Sticker`      | Decoration. Two per viewport at most.                                  |

`components/layout/` holds the page chrome:

| Component    | Use it for                                                                              |
| ------------ | --------------------------------------------------------------------------------------- |
| `PageShell`  | The page's `<main>`: the frame (`max-w-5xl`), the gutter and the rhythm.                |
| `AppBar`     | Back arrow, title (`h1`), one action. Sticky on a phone. The page heading from `md`.    |
| `BackButton` | The back arrow alone. It returns inside the app, or goes to a fallback page.            |
| `SiteHeader` | The top-level destinations in a sticky header on every screen. In the layout.           |
| `Header`     | A website header. The logo links home. The links fold into `MobileMenu` below `md`.     |
| `MobileMenu` | The header's hamburger "Menu" button and panel below `md`.                              |
| `Footer`     | The site footer, centred: the brand, links, social icons, the copyright from the clock. |

**On a phone, behave like an app.** A user must never need the browser's back button. A screen below a tab has an `AppBar` with a back arrow. A step inside one screen, such as the OTP step, uses the back arrow to return to the step before it.

**On a desktop, behave like a website.** See [Responsive](#responsive-an-app-on-a-phone-a-website-on-a-desktop).

Status is never colour alone. `Alert` draws a glyph, `Checkbox` draws a tick, `RadioGroup` draws a dot, `Switch` moves its knob, and `Tabs` lifts the selected tab onto a base.

---

## Motion

Motion makes the app feel physical: a screen settles into place, a selection slides to where you tapped, a sheet rises from the bottom. Each movement answers something the user did. None of it costs load time.

### The rules

1. **CSS only.** No animation library, and no JavaScript that runs per frame. Motion adds no script to a page.
2. **Animate `transform` and `opacity` only.** The browser moves them on the GPU, without layout or paint. To animate a size, use `scaleX` or `scaleY`, as `Progress` does. Never animate `width`, `height`, `top` or `margin`.
3. **Never hide the first paint.** An animation that plays on page load starts from a visible state (`opacity` above 0). An element at `opacity: 0` does not count for Largest Contentful Paint, so it delays the metric until it appears.
4. **Use `backwards` fill on anything that wraps content.** A `transform` that stays after the animation turns the element into a containing block, and every `position: fixed` child inside it breaks.
5. **Short.** 200ms to 320ms for most motion. Up to 520ms for a win or an error.
6. **Reduced motion stops everything.** The base layer in `styles/globals.css` cuts every animation and transition to near zero. Do not override it.
7. **Answer at the press, not at the response.** A control moves when the user taps it, even when the result needs the network. `Tabs` slides its pill on the tap, before the next view arrives.
8. **Keep motion free, and keep the page light.** Motion adds no JavaScript. A large library still costs load time, so load it with `import()` when an action needs it. See `coding-standards.md` > React for the rules and the examples.

### The motion set

| Utility                                           | Where it plays                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `animate-page-enter`                              | Every navigation. `app/template.tsx` wraps each page in it.          |
| `animate-slide-in-next` / `animate-slide-in-back` | A step change inside one screen, such as the sign-in steps.          |
| `animate-rise-in`                                 | Something that appears because of an action: `Alert`, a field error. |
| `animate-fade-in`                                 | A panel that replaces another: the `Tabs` panel.                     |
| `animate-check`                                   | A tick, a radio dot or a tab icon that turns on.                     |
| `animate-wobble`                                  | A field that has an error. It plays once, when the error appears.    |
| `animate-pop`                                     | A win, a new player joining.                                         |
| `animate-breathe`                                 | A `Skeleton` while content loads.                                    |
| `sheet-motion`                                    | `Dialog`: rises in, sinks out, and the backdrop fades.               |
| `animate-step-progress`                           | The home page's "How it works": a bar fills under the lit step.      |
| `animate-thread-draw`                             | The home page's sign-up moment: a red thread ties a heart.           |
| `press`                                           | A pressable thing with no base: a tab. Never together with `squish`. |
| A sliding pill                                    | The selection in `Tabs`. `transform` with `ease-spring`.             |

The heart thread is the one exception to rules 2 and 5. A line can only draw itself with `stroke-dashoffset`, and the moment takes 1.3s. The product owner asked for it. It plays only after a tap on a home page call to action, then the sign-up dialog opens. Reduced motion skips it and opens the dialog at once.

Two things on the home page move without a tap, because the product owner asked for them:

- **The "How it works" steps.** A visitor sees that there are three steps. The loop stops on hover, on focus and off screen. A tap on a step ends it, and reduced motion turns it off.
- **The review and chat rows (`AutoScroller`).** Each row drifts slowly and loops, and a visitor can swipe it at any time. No scrollbar shows; from `md` up, arrow buttons appear on hover. The row stops on hover, on focus, under a finger, off screen and in a hidden tab. Reduced motion turns the drift off.

### Loading

A dynamic page that reads data shows a loading state at once on navigation, so a tap never waits on the server with no answer. Use `Skeleton` in the shape of the page. `coding-standards.md` says when to use `loading.tsx` and when to use an inner `<Suspense>`. The fallback in `app/profile/page.tsx` is the example.

---

## Themes and the cute budget

A product sets its theme once, with `THEME` in `app/layout.tsx`. The theme re-assigns tokens; components do not change.

| Theme   | For                                            | Cute budget                                                                |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| `phera` | This app's product site (the default `@theme`) | **Low** — `BrandMark` is the logo; faces on avatars and empty states only  |
| `calm`  | Wellness, habits, focus, utilities             | **Medium** — mascot on empty states and completions only, no stickers      |
| `night` | Dark products: map trackers, gaming companions | **Low** — mascot on loading, empty and error states only; faces on avatars |

Products with a formal or ceremonial tone (a legal page, a portfolio for employers) do **not** use Phera. They use the same structure tokens (spacing, radius, type scale discipline) with their own palette and type. Say so in that project's `CLAUDE.md`.

### The product site (`phera`)

The tokens in `@theme` are the Phera palette. `/design` shows them.

- **Colour.** Cream paper, plum ink, a sindoor rose `brand` with white text, and the festival tones. `whatsapp` is a darker WhatsApp green, for the WhatsApp button only, so white reaches 3:1.
- **Shadow.** The puff: hard, straight down, in soft plum. The primary button sits on a darker rose puff.
- **Type.** Huninn for every heading and line of text. `font-script` is the display face here; only the invite theme gives it a real script.
- **Logo.** `BrandMark`: the "Saath" mark. Two paisleys with fingerprint ridges meet as one heart, in sindoor rose and jamun violet. Its colours are fixed and do not follow the theme. The rules and the master files are in [`docs/brand.md`](../../docs/brand.md).
- **Share image.** `public/og-image.png` (`SHARE_IMAGE` in `lib/seo.ts`) shows the logo when someone shares a product page. A page that sets its own `openGraph` lists `SHARE_IMAGE` again. A couple's invite makes its own image in `app/api/og/`.
- **Home page.** A grid of equal tiles of what guests see (`GuestPreview`) with a "Watch a demo" dialog (`DemoVideo`, source in `lib/demo-video.ts`), a feature list, a paper-or-digital table, a "Loved by …" banner (`LovedByBanner`), and two `AutoScroller` rows: couple photos with the review on the photo (`CoupleReviewCard`), and taped notes with a chat screenshot under each (`ChatNoteCard`). Each tile, feature and table row shows a feature that is built. The admin adds reviews, chats and the banner line from the Home page tab of `/admin`. A row with no items and a banner with no line do not show. See `lib/testimonials.ts`.
- **Help.** `WhatsAppButton` floats in the bottom-right corner of every page of the product site.

### The invite theme

In this app, a couple's invite is the ceremonial surface. It uses the `shubh-vivah` theme: Phera's pink pastel, made for a wedding. `components/invite/InviteTheme.tsx` applies it. It wraps the couple's site (`app/(invite)/site/[slug]/layout.tsx`) and the whole preview page. The product site keeps `phera`.

- **Colour.** Blush paper, white cards, dusty plum-rose ink, a rose `brand`, blush `brand-soft`, rose-petal `peach`, sage `soda`, gold foil `butter` for rules and corners, and a darker readable `gold` for small capitals. The outline is Phera's 2px line in blush, and the hard shadow is blush too.
- **Type.** `font-display` is Cormorant Garamond (500, 500 italic and 600). `font-script` is Great Vibes, for the couple's names, the guest's greeting and a few warm lines. Both are self-hosted under `public/fonts` (OFL) and load only where the theme applies. Numbers that count use `lining-nums`.
- **Cute budget.** None. No faces, no stickers, no mascot. Ornament is a lotus, gold corner brackets, falling petals (`FallingPetals`, CSS only) and gold rules.
- **Layout.** A card with the names, a scratch-to-reveal date (`ScratchCard`), "The Wedding" with a countdown and "Add to calendar", "The Venue" with a map button, a WhatsApp RSVP and phone, and a closing line. A detail the couple has not added yet says "shared soon". On a phone, the RSVP button stays in reach while the guest scrolls.
- **The opening.** `Envelope` covers the invite with a sealed envelope and a wax stamp of the couple's initials. The tap starts the couple's song (the tap is the user gesture that allows sound), breaks the seal, lifts the letter out, and fades to the invite. A round `SoundButton` then pauses and plays the song. A guest who opened the invite before skips the envelope.
- **No deity motif by default.** The theme is religion-neutral, as the PRD asks.
- **The preview is the invite.** `/preview/<id>` renders the same `Envelope` and `ShubhVivahInvite` with the couple's own details, full screen, with no product header and no watermark. It adds a gold `PreviewNotch` at the top and the `PublishBanner` at the foot. The banner speaks to the couple ("it's almost yours"); it shows the price once, inside, next to the publish button. The preview stays private because it opens only in the first browser and expires after 48 hours.
- **The link preview image** cannot read CSS tokens. `lib/invite-palette.ts` repeats the values. Change both together.

Budget limits per viewport, all themes:

- One `peek` card.
- One `Speech` bubble.
- Two `Sticker`s (zero in `calm` and `night`).
- One `shadow-hard-lg` element.

---

## Signature patterns

These make the design language recognisable. Use them; do not invent new decorative devices.

**The face.** `<Face mood="happy" />`. Two dot eyes, a small mouth, blush. Moods: `happy`, `wow`, `wink`, `sleepy`, `sad`. Pick the mood from the situation: `wow` for a win, `sad` for an error, `sleepy` for an empty or idle state.

**The peek.** `<Card peek={<Avatar name={player} size="lg" />}>`. A face sits over the top edge of a card, as if it is looking in. Use it for the one card that matters most on the screen — the join form, the winner, the current player.

**The squish.** Every pressable surface uses the `squish` utility. On press it sinks 3px onto its base. Never change the distance or add a scale effect on top.

**The moment.** When the user achieves something (joins, wins, completes), the screen reacts once: `animate-pop` on the result, the mascot changes mood, maybe one `Speech` line. Then it is quiet again.

**Generated avatars.** `<Avatar name="momo" />` derives colour and mood from the name. Never use letter initials in circles. Never use random avatars that change between renders.

---

## Responsive: an app on a phone, a website on a desktop

Every screen has two postures. On a phone it is an app: it feels installed, and the thumb does the work. On a tablet or a desktop it is a website: a header at the top, the width in use, a footer at the end. One codebase serves both. The layout changes. The routes, the data and the components stay the same.

A desktop page that is one narrow column in the centre of the screen is a defect. It is the phone layout on a big screen, not a desktop layout.

### The switch is `md`

One breakpoint changes the posture: `md`, 768px.

| Width        | Posture | Prefixes to use                                         |
| ------------ | ------- | ------------------------------------------------------- |
| Below 768px  | App     | No prefix. `sm:` adjusts the layout for a large phone.  |
| 768px and up | Website | `md:` changes the posture. `lg:` and `xl:` add columns. |

- Use `md:` to change the posture. Use `sm:`, `lg:` and `xl:` only to adjust a layout inside one posture.
- Do not add a second posture switch at a different breakpoint.
- Choose the posture in CSS only. Never read `window.innerWidth`, `matchMedia` or the user agent to choose a layout. The server sends one HTML for every screen. A JavaScript switch shows the wrong layout first, then jumps.

### The two postures side by side

|                          | Phone: an app                                          | Desktop: a website                                                    |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Navigation               | `SiteHeader`, with a hamburger menu (`MobileMenu`)     | `SiteHeader`, sticky at the top, with the logo and the same links     |
| A screen below a tab     | `AppBar`: a back arrow and the title, below the header | The same `AppBar` scrolls with the page as its heading                |
| Page width               | The full screen, with a `px-5` gutter                  | The frame, `max-w-5xl`. The header, the page and the footer share it. |
| Composition              | One column, top to bottom                              | Columns from `lg`: the words beside the product                       |
| The primary action       | At the end of the form, full width (`block`)           | Natural width, next to the thing it acts on                           |
| A focused task (sign-in) | The full screen, below the header.                     | One narrow column (`max-w-md`) on the frame. The header stays.        |
| A decision (`Dialog`)    | A bottom sheet                                         | A centred modal                                                       |
| Hover                    | None. Touch has no hover.                              | An extra cue only. Never the only way to see or do a thing.           |
| Footer                   | The end of the scroll                                  | The end of the page. On a short page, the bottom of the screen.       |
| Install                  | "Add to Home Screen" opens it full screen, no browser  | A normal browser tab                                                  |

`APP_TABS` in `lib/navigation.ts` feeds `SiteHeader`: the inline links and the hamburger menu. Add a destination there.

### Build every screen in this order

1. **Draw the phone first, at 390px.** One column. The one primary action is in thumb reach. The header's menu or an `AppBar` gives the way around.
2. **Then draw 1440px.** Ask what goes beside what. The 1024px frame holds two or three columns.
3. **Recompose with a grid at `lg`.** Keep the markup and its order. Change only the grid.
4. **Keep the reading width.** Text stays `max-w-prose`. A form stays `max-w-md` to `max-w-xl`, also in a wide column. A 1000px-wide text field does not "use the width".
5. **Check five widths:** 320, 390, 768, 1024 and 1440. No horizontal scroll at any of them.

```tsx
// Phone: the heading, then the card. From lg: the heading beside the card.
<section className="grid gap-5 lg:grid-cols-5 lg:gap-12">
  <div className="flex flex-col gap-5 lg:col-span-2">{/* heading and words */}</div>
  <Card className="lg:col-span-3">{/* the product */}</Card>
</section>
```

The source order is the phone order. Screen readers and the keyboard follow it at every width. Do not use `order-*` to make the desktop look right.

### Desktop patterns

- **A two-column hero.** The words go on the left, the live product on the right. See `app/page.tsx`.
- **A heading beside its content.** The heading and a short intro take two of five columns. The content takes three.
- **A form beside what it makes.** The form stays in view (`lg:sticky lg:top-24`) while the list grows. See `app/example/page.tsx`.
- **An identity beside the details.** The profile card stays in view while the details scroll. See `app/profile/page.tsx`.
- **A section list on a long page.** A sticky list of section links goes on the left. See `app/design/page.tsx`.
- **A grid of distinct objects.** `sm:grid-cols-2 lg:grid-cols-3`, only when each card is an object the user acts on.

`lg:top-24` keeps a sticky column below the sticky `SiteHeader`. `scroll-padding-top` in `styles/globals.css` does the same for an anchor link.

### Phone patterns: an installable app

- **Never depend on the browser.** An installed app has no back button and no address bar. Every screen below a tab has an `AppBar` with a back arrow.
- **Thumb reach.** The primary action is at the end of the form, at full width.
- **Safe areas.** The page draws under the notch (`viewportFit: 'cover'`). Fixed chrome pads itself with `env(safe-area-inset-*)`, as `WhatsAppButton` does.
- **Press feedback, not a tap flash.** The base styles remove the grey tap highlight. `squish` and `press` answer the tap.
- **Installable.** `app/manifest.ts` sets `display: 'standalone'`. The icons are in `public/icons/` (192px, 512px and a maskable 512px) and `app/apple-icon.png`. `THEME_COLOR` in `lib/pwa.ts` matches `--color-paper`. When you change the mark, export these icons again from the brand kit. See [`docs/brand.md`](../../docs/brand.md).
- **No service worker.** The template has none, on purpose. A browser cache keeps the old build after a deploy: the same failure as trap 26 in a CDN. Add one only with a versioned cache and an update prompt. Record that decision in an ADR.

### Never

- Add a bottom tab bar. The product site uses the header's hamburger menu on a phone.
- Show a "Menu" button on a desktop.
- Frame a page with a phone-width `<main>`. The frame is `max-w-5xl`. Make the content narrow inside it.
- Put a thing only behind hover.
- Choose a layout in JavaScript.
- Reorder content with CSS, so that the two postures read in a different order.

---

## Layout

- **Left-aligned** text and forms. Centre only a room key, a single score, or a lone empty-state message.
- **Show the product first.** The hero shows the real thing working — a board, a map, the key entry — not a description of it. On a party game, the first viewport contains the key input.
- **Vertical rhythm.** Sections are separated by `gap-16` (mobile) to `gap-24` (desktop). Inside a card, `gap-4`.
- **No card grids for the sake of it.** Three identical cards in a row is not a layout. Use cards only when each one is a distinct object the user can act on (a game, a player, a room).
- **The frame.** Every page, the header and the footer line up on `max-w-5xl`, the `PageShell` default. Use `PageShell width="reading"` (`max-w-3xl`) only for one long text, such as a policy page. The gutter is `px-5` on a phone and `sm:px-8` above it.

---

## Words

The interface speaks plainly. The mascot speaks warmly. Keep the two voices separate.

**Interface voice** (headings, buttons, labels, hints, errors):

- Say what the thing is or does, in the user's words. "Join with a key", not "Enter lobby credentials".
- Buttons are verb phrases that name the result: "Create room", "Start round", "Save nickname". The same action keeps the same name everywhere — the button "Create room" produces the toast "Room created".
- Errors say what happened and how to fix it: "Keys are 6 letters or numbers." No apologies, no "Oops".
- Sentence case. No trailing arrows (`→`) on buttons or links. No emoji in interface text.

**Mascot voice** (only inside `Speech`):

- One line, under ~12 words, present tense, reacting to what just happened. "momo joined. That makes five of you."
- It never gives instructions that the interface needs. If the user must read it to proceed, it belongs in the interface voice.

**Banned** — these read as generated copy. Rewrite any sentence that uses them:

- Rule-of-three slogans: "No login. No download. Just a key." / "Big group, one key, zero setup."
- Words: seamless, effortless, unleash, elevate, supercharge, magic, vibe, delightful, curated, next-level, game-changer, "in seconds".
- Meta strings joined with middle dots: "2–20 players · 10 min". Write "For 2 to 20 players, about 10 minutes" or show the numbers as separate labelled facts.
- Fake content: invented testimonials, invented user counts, a "Trusted by …" line with no real count behind it, a diverse-sounding set of made-up full names. Example players use nicknames people actually type (`momo`, `captain_k`, `rajma chawal`).

---

## The anti-slop list

If your output contains any of these, remove it before you report the task as done. Each one is a default that generated UIs produce whatever the subject.

- An ALL-CAPS tracked-out label above a heading ("LIVE", "UP TO 20 PLAYERS", "FEATURES").
- Numbered `01 / 02 / 03` markers on content that is not a real sequence.
- A "How it works" section of three equal cards as the default second section.
- Cream background with a terracotta or clay accent. Near-black with an acid-green accent.
- Soft grey blurred shadows, glassmorphism, gradient blobs, gradient text, noise textures.
- Identical border radius and shadow on every element.
- Icons from a generic set placed in coloured circles above feature text.
- A monospace face for small labels.
- Section entrances that fade and slide up on scroll.
- Repeating the primary CTA in every section. Once in the hero, once at the end, at most. The home page is the one exception: the product owner asked for a call to action after each section and a sticky sign-up bar. Each one has its own words.
- A static "example" of the product where a live, interactive one is possible.
- Placeholder text used as a label.

---

## Accessibility floor

This is the minimum, not a goal.

- Text contrast ≥ 4.5:1. All documented pairs pass; `text-ink-soft` is for secondary text on `paper` or `surface` only.
- Visible focus on everything interactive (the base styles give a 3px `brand` ring — do not remove it).
- Colour never carries meaning alone. Errors have words. Selected states have an outline change or a check, not only a fill.
- `prefers-reduced-motion` is respected globally. Do not override it.
- Faces are decorative (`aria-hidden`) unless they are the only content; then pass `label`.
- Every input has a visible `label`.

---

## Recipes

**Party-game landing page, phone (first viewport, 390px wide):**

```
┌──────────────────────────────┐
│ ◉ Playroom                   │  logo = mascot face, not a letter
│                              │
│ Bingo for your group chat    │  text-hero, left aligned
│                              │
│ ┌─(face peeks)─────────────┐ │
│ │ Room key                 │ │  Card peek + Input code
│ │ [ P L Z 4 K 9 ]          │ │
│ │ [ Join game            ] │ │  the one primary
│ └──────────────────────────┘ │
│ Hosting? Create a room       │  Button quiet
│                              │
│                              │
└──────────────────────────────┘
```

**The same page, desktop (1440px wide):**

```
┌──────────────────────────────────────────────────────────────┐
│ ◉ Playroom                         Home   Games   Profile    │  SiteHeader, sticky
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Bingo for your             ┌─(face peeks)──────────────┐   │
│   group chat                 │ Room key                  │   │  the hero: words left,
│                              │ [ P L Z 4 K 9 ]           │   │  the product right
│   One line on what it is.    │ [ Join game ]             │   │
│   Hosting? Create a room     └───────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Below the fold: a live, playable mini board. Then the list of games as distinct cards, each with its own festival tone.

**Empty state:** a `Face mood="sleepy"` at 72px, one line of interface voice saying what goes here, one button that fills it. "No rounds yet. Start round".

**Error state:** `Speech mood="sad"` with the cause and the fix, plus the action as a `Button`. `animate-wobble` on the field that caused it.

**Win state:** the result in `text-key` with `animate-pop`, the winner's `Avatar` as a peek, the mascot's `wow` face, one `Speech` line, one or two `Sticker`s (playroom only).

---

## The site checklist

Every site built from this template passes this list before it goes live. The template already passes it. Keep it that way when you add a page.

The **Check** column says what stops a regression. "Test" is `tests/site-checklist.test.ts`, which runs in `pnpm validate`. "Look" is a human check: do it at 320px, 768px and 1440px.

### Layout and mobile

| Item                           | The rule                                                                                                                             | Check      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| No horizontal scroll           | Nothing is wider than the screen at 320px. Use `w-full`, `max-w-*`, `min-w-0` and `break-words`. Never a fixed `w-[…]`.              | Look, lint |
| No mobile overflow             | Long words, URLs and ids wrap (`break-all`, `truncate`). Tables and code blocks scroll inside their own box.                         | Look       |
| Every page is mobile optimized | Unprefixed classes are the phone layout. `sm:`/`md:`/`lg:` only add to it. Tap targets are 44px or more.                             | Look       |
| A mobile menu                  | `Header` folds its links into the hamburger `MobileMenu` below `md`.                                                                 | Test       |
| A desktop that is a website    | From `md` up, `SiteHeader` shows its links inline. Every `<main>` uses the `max-w-5xl` frame, and content goes into columns at `lg`. | Test, look |
| Installable on a phone         | `app/manifest.ts` is `standalone`, with 192px, 512px and maskable icons, and `app/apple-icon.png`.                                   | Test       |

`body` has `overflow-x: clip` in `styles/globals.css`. That is a safety net, not the fix. It hides the scroll bar, but the clipped content is still lost. Find the element that overflows and fix it.

### Links and navigation

| Item                   | The rule                                                                                                           | Check      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| No broken links        | Every internal `href` points to a page or route handler that exists.                                               | Test       |
| Footer links work      | A footer link goes to a real page. When you remove a page, remove its links in the same PR.                        | Test       |
| No unused navigation   | A header link, tab or footer link exists only for a page that exists and that users need. Three to five at most.   | Test, look |
| The logo is clickable  | The logo in `Header` always links to `/`. Do not replace it with a plain image.                                    | Test       |
| The phone is clickable | Show a phone number with `ContactLink kind="phone"` or `Footer contact`. A tap dials it.                           | Test       |
| The email is clickable | Show an email address with `ContactLink kind="email"` or `Footer contact`. A tap opens the mail app.               | Test       |
| A custom 404 page      | `app/not-found.tsx` follows the empty-state recipe: a face, one line, one link home. Keep it. Restyle, never drop. | Test       |

Write an external link as a full URL. `Footer` renders it as a plain `<a>`, and an in-app path as `next/link`.

### Page metadata

| Item               | The rule                                                                                                                     | Check |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----- |
| Page titles        | Every `page.tsx` exports `metadata` with a `title`. The layout adds `\| <app name>`. The home page may use the default.      | Test  |
| Meta descriptions  | Every `page.tsx` exports a `description` of one sentence, under 160 characters, that says what the page is for.              | Test  |
| A favicon          | `app/icon.svg` is the small cut of the brand mark. Next.js serves it and links it on every page. Keep it the product's mark. | Test  |
| The copyright year | Never type a year. `Footer owner="…"` builds `© <year> <owner>` from the clock. A static page fixes the year at build time.  | Test  |

A statically rendered page keeps the year of its build. Every deploy rebuilds it. Deploy at least once a year, or make the page dynamic.

### Content and feedback

| Item                | The rule                                                                                                                                           | Check      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| No placeholder text | No "lorem ipsum", "TODO", "coming soon", `example.com` or template copy on a live page. Write the real words.                                      | Test       |
| Compressed images   | Use `next/image`: it resizes and serves WebP. A file in `public/` stays under 200 KB. Prefer SVG for marks.                                        | Test       |
| No broken buttons   | A `Button` submits a form (`type="submit"`) or has an `onClick`. A button that goes somewhere is a `Link` with `buttonStyles()`. Never `href="#"`. | Test, look |
| A success message   | An action that saves or sends something shows `Alert tone="success"` that names the result: "Profile saved."                                       | Look       |
| An error message    | A failed action shows `Alert tone="danger"`: what happened and how to fix it. Never fail silently.                                                 | Look       |

`ProfileForm` and `ExampleForm` show both messages. Copy them. A signed URL image is the one case for a plain `<img>`, because `next/image` cannot optimise a URL that expires. Size the upload on the server instead.

---

## Enforcement

Rules 2 to 6 are lint checks, not reminders. The `template/design-language` block in `eslint.config.mjs` reads every `className` — the string form, the strings passed to `cn()`, and template literals — and fails the build on:

| Refused in a `className`                                                 | Rule |
| ------------------------------------------------------------------------ | ---- |
| A raw hex value, or an arbitrary `bg-[…]` / `shadow-[…]` / `rounded-[…]` | 2    |
| A default Tailwind colour: `text-gray-500`, `bg-white`, `border-black`   | 3, 9 |
| A 1px `border`, or `border-4` and wider                                  | 4    |
| A blurred shadow: bare `shadow`, `shadow-sm`, `shadow-lg`                | 5    |
| A default radius: `rounded-md`, `rounded-xl`                             | 6    |
| A size outside the scale: `text-sm`, `text-2xl`                          | Type |

Each message names the rule it enforces. To step outside one, say why on the line: `// eslint-disable-next-line no-restricted-syntax -- reason`. A bare disable is a defect.

Two limits to know:

- The checks read literal strings. A class name built at runtime from a variable escapes them.
- They read `className` only. An SVG `fill` attribute is not a class name, which is why the white specular dot in `Face.tsx` is a literal `#fff` — it is a highlight on an ink pupil, not a theme colour, and it stays white in every theme.

Everything else on this page — one primary action, the cute budget, the words, the anti-slop list — is a human judgement. No check replaces looking at the screen.

---

## Before you report UI work as done

Check each item. Do not skip the last one.

1. It works at 320px, 768px and 1440px: an app on the phone, a website on the desktop. No horizontal scroll.
2. [The site checklist](#the-site-checklist) passes.
3. One primary button per viewport.
4. `pnpm validate` is green. It fails on the token rules above, so a clean run means the diff carries no raw hex, arbitrary value, or default Tailwind colour, size, radius or shadow.
5. Nothing from the anti-slop list or the banned words.
6. Budgets respected: peek, speech, stickers, large shadow.
7. Every new or changed primitive appears on `/design` and has a colocated `<Name>.test.tsx`.
8. **Remove one thing.** Look at the screen and take away the least necessary decoration. Then check again.
