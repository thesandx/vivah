import { DemoVideo } from '@/components/home/DemoVideo';
import { DEMO_STEPS } from '@/lib/demo-video';
import { logger } from '@/lib/logger';
import { type DemoVideoUrls, getDemoVideoUrls } from '@/services/demo-video.service';

/**
 * The home page's "Watch a demo" button, with the video the admin uploaded
 * from `/admin`. It renders behind a `Suspense`: the page never waits on
 * Firestore or the signing, and a failed read shows the steps instead.
 */
export async function HomeDemoVideo() {
  let video: DemoVideoUrls | null = null;
  try {
    video = await getDemoVideoUrls();
  } catch (error) {
    logger.error('Reading the demo video failed', error);
  }
  return <DemoVideo video={video} steps={DEMO_STEPS} />;
}
