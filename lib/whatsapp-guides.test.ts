import { describe, expect, it } from 'vitest';

import {
  INVITATION_MESSAGE_GROUPS,
  LANDING_FAQS,
  MESSAGE_GUIDE_FAQS,
  REPLY_GUIDE_FAQS,
  REPLY_MESSAGE_GROUPS,
} from '@/lib/whatsapp-guides';

const ALL_GROUPS = [...INVITATION_MESSAGE_GROUPS, ...REPLY_MESSAGE_GROUPS];

describe('WhatsApp guide content', () => {
  it('gives the message guides enough messages in English and Hindi', () => {
    for (const groups of [INVITATION_MESSAGE_GROUPS, REPLY_MESSAGE_GROUPS]) {
      const messages = groups.flatMap((group) => group.messages);
      expect(messages.length).toBeGreaterThanOrEqual(10);
      expect(messages.some((message) => message.lang === 'hi-IN')).toBe(true);
    }
  });

  it('marks Hindi messages as Hindi and English ones as English', () => {
    for (const message of ALL_GROUPS.flatMap((group) => group.messages)) {
      expect(/[ऀ-ॿ]/.test(message.text)).toBe(message.lang === 'hi-IN');
    }
  });

  it('keeps headings and card labels unique, so React keys and anchors hold', () => {
    const headings = ALL_GROUPS.map((group) => group.heading);
    expect(new Set(headings).size).toBe(headings.length);
    for (const group of ALL_GROUPS) {
      const labels = group.messages.map((message) => message.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it('asks five or more questions on every page', () => {
    for (const faqs of [LANDING_FAQS, MESSAGE_GUIDE_FAQS, REPLY_GUIDE_FAQS]) {
      expect(faqs.length).toBeGreaterThanOrEqual(5);
      expect(faqs.every((faq) => faq.question.endsWith('?'))).toBe(true);
    }
  });
});
