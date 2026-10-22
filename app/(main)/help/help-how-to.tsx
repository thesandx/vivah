import { type HowTo, HowToSection } from '@/components/help/HowToSection';
import type { SiteVideoSlot } from '@/lib/demo-video';
import { logger } from '@/lib/logger';
import { type DemoVideoUrls, getDemoVideoUrls } from '@/services/demo-video.service';

/**
 * A `/help` how-to with the video the admin uploaded for `slot` from
 * `/admin`. It renders behind a `Suspense`: the page never waits on Firestore
 * or the signing, and a failed read shows the steps alone.
 */
export async function HelpHowTo({ howTo, slot }: { howTo: HowTo; slot: SiteVideoSlot }) {
  let video: DemoVideoUrls | null = null;
  try {
    video = await getDemoVideoUrls(slot);
  } catch (error) {
    logger.error('Reading a help video failed', error, { slot });
  }
  return <HowToSection howTo={howTo} video={video} />;
}
