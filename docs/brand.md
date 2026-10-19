# Brand

This document describes the vivah.online logo and how to use it. Read it before you change the logo, the favicon, the app icons or the share image.

## The mark

The mark is named **Saath** ("together"). Two paisleys meet and make one heart.

- The **paisley** (_keri_) is the shape that brides draw in mehndi.
- The **ridges** look like fingerprints. A fingerprint is a person's own mark, and in India it signs a promise. Each couple and each guest gets an invite that is their own.
- The **two colours** are two people. The rose lobe sits in front of the violet lobe, and the two make one shape.

## The master files

The brand kit is outside the repository, in the project's shared folder under `brand/`. It holds the SVG masters, PNG exports, social images, app icons and the Python source that draws them. Run the source again to make a new export. Do not edit an exported file by hand.

## Colours

| Name    | Hex       | Use                                       |
| ------- | --------- | ----------------------------------------- |
| Sindoor | `#D62E55` | The left lobe. It is the site's `brand`.  |
| Jamun   | `#5B2A86` | The right lobe.                           |
| Plum    | `#3D1F2E` | The wordmark. It is the site's `ink`.     |
| Cream   | `#FFFCF8` | The background. It is the site's `paper`. |
| Blush   | `#FF7A9C` | The left lobe on a dark background.       |
| Lotus   | `#D2B0E6` | The right lobe on a dark background.      |

The mark keeps these colours in every theme. A logo does not change with the page.

## Sizes

The mark has cuts with fewer ridges for small sizes. Thin ridges blur when they are small.

| Cut    | Ridges | Use at       | In the repository                                  |
| ------ | ------ | ------------ | -------------------------------------------------- |
| Large  | 6      | 120px and up | `public/icons/icon-512.png`, `public/og-image.png` |
| Medium | 4      | 40 to 120px  | `components/layout/BrandMark.tsx`                  |
| Small  | 3      | Up to 40px   | `app/icon.svg`, `app/favicon.ico`                  |

## Type

The wordmark is "vivah" in Huninn, with ".online" in sindoor at half the size. Huninn is the site's display face. The Hindi lockup sets "विवाह" in Baloo 2 Devanagari.

## Rules

- Keep clear space around the logo. The clear space is half the height of the mark.
- Put the colour mark on cream or white. On plum, use the reverse colours. On a photo or on rose, use the white mark.
- Do not change the colours, rotate the mark, stretch it, add a shadow or put it in a box with an outline.
- Do not swap the two colours. Rose is always on the left, in front.
- Do not redraw the wordmark in another font.

## The favicon in search results

Google shows the site's icon next to each search result. Its rules decide which files the app serves:

- Google needs a square icon whose size is a multiple of 48px. An SVG alone is not enough for every search surface.
- `app/favicon.ico` holds 16, 32 and 48px images, from `app-icons/favicon.ico` in the brand kit. It also answers the plain `/favicon.ico` request that crawlers send.
- `app/icon.png` is the 192px icon, a copy of `public/icons/icon-192.png`. 192 is a multiple of 48.
- `app/icon.svg` stays for browsers that draw SVG icons sharply.
- Keep all three in `app/`. Next.js links each one from every page.

Google updates a site's icon slowly, from days to weeks. To ask for a refresh, use URL Inspection on the home page in Search Console, then select **Request indexing**.

## The invite link preview card

A guest's WhatsApp link preview shows a portrait card, 1080 × 1350. `app/api/og/[slug]/route.tsx` draws it.

- The artwork is one fixed picture, `public/invite/og-card.png`. It holds the arch, the blossoms, the lanterns, the couple, the Ganesha and "शुभ विवाह".
- The couple is a Vecteezy vector. We hold a paid licence, so the card needs no credit.
- The route draws only the guest's name, the couple's names and the date, in Martel.
- "शुभ विवाह" is in the picture because the image renderer cannot join Devanagari letters correctly.
- Keep the card under 300 KB. Above that, WhatsApp shows a small thumbnail. The picture is a 256-colour PNG for this reason, and a test checks the size.
- To change the artwork, edit the generator in the project files (`screenshots/og-card/source/`), render it again, and replace `og-card.png`.
