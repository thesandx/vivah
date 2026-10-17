/**
 * The home page's demo video: the groom sends a guest her own link on
 * WhatsApp. She taps it, and the couple's own website opens at
 * `riya-arjun.vivah.online` and greets her by name. She opens the Shri Ganesh
 * card, scratches the date, and walks through the countdown, the venue and the
 * RSVP. Pure data, no I/O.
 *
 * The files in `public/demo/` are 720x1280 and 30 fps (46 s), with an original
 * music track made for the video. They are cut from a 1080x1920, 60 fps
 * master, which is kept outside the repository.
 *
 * To publish the video, add its files to `sources`. That is the only change.
 * List WebM first and MP4 second: the browser plays the first type it can.
 * Until `sources` has an entry, the demo dialog shows `DEMO_STEPS` instead.
 *
 * Host the files on a CDN or in `public/demo/`, not in the bundle. Encode the
 * MP4 with `-movflags +faststart`, so it starts to play before it downloads.
 * Nothing loads before a visitor taps "Watch a demo".
 */

export interface DemoVideoSource {
  /** An absolute URL, or a path under `public/`, such as `/demo/walkthrough.mp4`. */
  src: string;
  type: 'video/webm' | 'video/mp4';
}

export interface DemoVideo {
  sources: readonly DemoVideoSource[];
  /** The first frame, as a small image. Shown until the video plays. Empty for none. */
  poster: string;
}

export const DEMO_VIDEO: DemoVideo = {
  sources: [
    { src: '/demo/walkthrough.webm', type: 'video/webm' },
    { src: '/demo/walkthrough.mp4', type: 'video/mp4' },
  ],
  poster: '/demo/walkthrough-poster.webp',
};

/** What the walkthrough shows, in order. The dialog lists these until the video exists. */
export const DEMO_STEPS: readonly string[] = [
  'A WhatsApp message arrives with your invite link.',
  'The guest taps the link. Your website opens with their name on it.',
  'A Shri Ganesh card says “Hi” with their name. One tap opens the invite and starts your song.',
  'They scratch to reveal the date, see the countdown and the venue map, then reply to you on WhatsApp.',
];
