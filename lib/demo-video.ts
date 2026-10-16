/**
 * The home page's demo video: a guest gets the invite on WhatsApp, taps the
 * link, opens the Shri Ganesh card and replies. Pure data, no I/O.
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
  sources: [],
  poster: '',
};

/** What the walkthrough shows, in order. The dialog lists these until the video exists. */
export const DEMO_STEPS: readonly string[] = [
  'A WhatsApp message arrives with your invite link.',
  'The guest taps the link. Your website opens with their name on it.',
  'A Shri Ganesh card says “Hi” with their name. One tap opens the invite and starts your song.',
  'They scratch to reveal the date, see the countdown and the venue map, then reply to you on WhatsApp.',
];
