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
| Small  | 3      | Up to 40px   | `app/icon.svg`                                     |

## Type

The wordmark is "vivah" in Huninn, with ".online" in sindoor at half the size. Huninn is the site's display face. The Hindi lockup sets "विवाह" in Baloo 2 Devanagari.

## Rules

- Keep clear space around the logo. The clear space is half the height of the mark.
- Put the colour mark on cream or white. On plum, use the reverse colours. On a photo or on rose, use the white mark.
- Do not change the colours, rotate the mark, stretch it, add a shadow or put it in a box with an outline.
- Do not swap the two colours. Rose is always on the left, in front.
- Do not redraw the wordmark in another font.
