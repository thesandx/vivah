'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  HOW_IT_WORKS_STEPS,
  type HowItWorksStep,
  stepImageUrl,
  type StepNumber,
} from '@/lib/how-it-works';
import { cn } from '@/lib/utils';

/**
 * "How it works": the three steps beside a phone that shows each one.
 *
 * The steps light up one after the other. A bar fills under the lit step,
 * and the next step lights up when the bar is full, so the loop is CSS and
 * the script only listens for the end of the bar. It stops while a pointer is
 * on the section or a step has focus, and while the section is off screen.
 * A tap on a step shows that step and ends the loop: the visitor chose.
 * With reduced motion nothing moves by itself; the steps are buttons.
 *
 * `'use client'` for the lit step, the tap and the visibility check.
 *
 * Each step has its own festival tone, so the three read as three different
 * things. The phone screens come from `/api/how-it-works/<step>`, which an
 * admin changes from `/admin`. See `lib/how-it-works.ts`.
 */

/** Literal class names per step, so Tailwind finds them. */
const TONES: Record<StepNumber, { fill: string }> = {
  1: { fill: 'bg-butter' },
  2: { fill: 'bg-soda' },
  3: { fill: 'bg-blush' },
};

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    // The server cannot know. Reduced motion also hides the bar in CSS, so
    // the first paint never moves for a visitor who asked for no motion.
    () => false,
  );
}

/** True while at least a third of `ref` is on screen. */
function useOnScreen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry?.isIntersecting ?? false),
      { threshold: 0.33 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}

interface StepCardProps {
  step: HowItWorksStep;
  active: boolean;
  /** Draw the filling bar under this step. */
  showProgress: boolean;
  paused: boolean;
  onSelect: () => void;
  onProgressEnd: () => void;
}

function StepCard({ step, active, showProgress, paused, onSelect, onProgressEnd }: StepCardProps) {
  const tone = TONES[step.step];
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          'rounded-card relative flex w-full items-start gap-4 overflow-hidden border-2 p-4 text-left transition sm:p-5',
          'focus-visible:outline-focus focus-visible:outline-2 focus-visible:outline-offset-2',
          active
            ? 'bg-surface border-line shadow-hard-lg'
            : 'hover:bg-surface border-transparent opacity-70 hover:opacity-100',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'text-heading flex size-12 shrink-0 items-center justify-center rounded-full font-bold transition',
            tone.fill,
            active && 'scale-110',
          )}
        >
          {step.step}
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-heading">{step.title}</span>
          <span className="text-ink-soft">{step.body}</span>
        </span>
        {showProgress && active && (
          <span
            aria-hidden="true"
            onAnimationEnd={onProgressEnd}
            style={{ animationPlayState: paused ? 'paused' : 'running' }}
            className={cn(
              'animate-step-progress absolute inset-x-0 bottom-0 h-1 origin-left motion-reduce:hidden',
              tone.fill,
            )}
          />
        )}
      </button>
    </li>
  );
}

function PhonePreview({ active }: { active: StepNumber }) {
  const current = HOW_IT_WORKS_STEPS.find((step) => step.step === active);
  return (
    <figure className="flex flex-col items-center gap-4">
      <div className="bg-ink rounded-sheet shadow-hard-lg relative w-56 p-2 sm:w-64 lg:w-72">
        <div className="rounded-card bg-sunken relative aspect-6/13 overflow-hidden">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <Image
              key={step.step}
              src={stepImageUrl(step.step)}
              alt={step.step === active ? step.alt : ''}
              aria-hidden={step.step === active ? undefined : true}
              fill
              unoptimized
              sizes="(min-width: 1024px) 288px, (min-width: 640px) 256px, 224px"
              className={cn(
                'object-cover object-top transition-opacity duration-300',
                step.step === active ? 'opacity-100' : 'opacity-0',
              )}
            />
          ))}
          <span
            aria-hidden="true"
            className="bg-ink rounded-pill absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2"
          />
        </div>
      </div>
      {current !== undefined && (
        <figcaption
          className={cn(
            'rounded-pill text-small px-4 py-1.5 font-semibold',
            TONES[current.step].fill,
          )}
        >
          Step {current.step} of {HOW_IT_WORKS_STEPS.length} · {current.title}
        </figcaption>
      )}
    </figure>
  );
}

export function HowItWorks(): React.JSX.Element {
  const [active, setActive] = useState<StepNumber>(1);
  const [chosen, setChosen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(sectionRef);
  const reducedMotion = usePrefersReducedMotion();
  const looping = !chosen && !reducedMotion;

  const next = () => {
    const index = HOW_IT_WORKS_STEPS.findIndex((step) => step.step === active);
    const following = HOW_IT_WORKS_STEPS[(index + 1) % HOW_IT_WORKS_STEPS.length];
    if (following !== undefined) setActive(following.step);
  };

  return (
    <div
      ref={sectionRef}
      className="steps-pause grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-x-12"
    >
      <ol className="order-2 flex flex-col gap-3 lg:order-1">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <StepCard
            key={step.step}
            step={step}
            active={step.step === active}
            showProgress={looping}
            paused={!onScreen}
            onSelect={() => {
              setChosen(true);
              setActive(step.step);
            }}
            onProgressEnd={next}
          />
        ))}
      </ol>
      <div className="order-1 lg:order-2">
        <PhonePreview active={active} />
      </div>
    </div>
  );
}
