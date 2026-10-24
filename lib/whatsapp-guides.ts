/**
 * The words for the WhatsApp guides: ready-to-send invitation messages, guest
 * replies, and each page's questions. Plain data, so the pages, their FAQ
 * schema and the tests read one source.
 *
 * Square brackets mark what the sender replaces: `[Guest name]`, `[link]`.
 * The Hindi messages are in Devanagari, as people type them on WhatsApp.
 */

import type { Faq } from '@/lib/seo';

export interface ReadyMessage {
  /** A short label for who the message is for: "Close family". */
  label: string;
  text: string;
  /** BCP 47 language tag, so screen readers pronounce the Hindi correctly. */
  lang: 'en-IN' | 'hi-IN';
}

export interface MessageGroup {
  heading: string;
  /** One sentence on when to use these. */
  intro: string;
  messages: readonly ReadyMessage[];
}

export const INVITATION_MESSAGE_GROUPS: readonly MessageGroup[] = [
  {
    heading: 'Wedding invitation messages for family and relatives',
    intro:
      'Elders expect respect and the full details. Name the families, add ji, and put the date and venue in the message itself.',
    messages: [
      {
        label: 'Formal, for elders',
        lang: 'en-IN',
        text: 'Respected [Guest name] ji,\n\nWith the blessings of Shri Ganesh and our elders, we invite you and your family to the wedding of our daughter Radha with Shyam.\n\nDate: [Wedding date]\nVenue: [Venue], [City]\n\nYour invite, with the map and all the functions: [link]\n\nYour presence will bless the couple.\n[Your name] and family',
      },
      {
        label: 'Close family',
        lang: 'en-IN',
        text: 'Dear [Guest name] Mama,\n\nThe day is fixed! Radha and Shyam are getting married on [Wedding date] in [City]. We cannot do this without you, so please come a day early for the haldi and mehendi.\n\nEverything is here, with the map: [link]\n\nWith love,\n[Your name]',
      },
      {
        label: 'Whole family, all functions',
        lang: 'en-IN',
        text: 'Namaste [Guest name] ji,\n\nWe warmly invite your whole family to the wedding celebrations of Radha and Shyam.\n\nHaldi: [Date]\nSangeet: [Date]\nWedding: [Date]\n\nTimings, venues and the map for each function are on your invite: [link]\n\nPlease reply on WhatsApp so we can plan your stay.',
      },
    ],
  },
  {
    heading: 'Wedding invitation messages for friends',
    intro:
      'Friends read a short, warm message. Lead with the news and keep the details in the link.',
    messages: [
      {
        label: 'Casual',
        lang: 'en-IN',
        text: 'Hey [Guest name]! It is official: I am getting married on [Wedding date] in [City]. It will not feel complete without you. All the details are in your invite: [link]',
      },
      {
        label: 'Friend from out of town',
        lang: 'en-IN',
        text: '[Guest name], save the dates! Our wedding is on [Wedding date] in [City]. Book your tickets early. The venue map and the full programme are here: [link]. Tell me when you land.',
      },
      {
        label: 'Short and sweet',
        lang: 'en-IN',
        text: 'Radha weds Shyam, [Wedding date], [City]. Your personal invite: [link]. See you there, [Guest name]!',
      },
    ],
  },
  {
    heading: 'Wedding invitation messages for colleagues',
    intro: 'Colleagues need a polite message they can open at work. Keep it short and formal.',
    messages: [
      {
        label: 'Office, one colleague',
        lang: 'en-IN',
        text: 'Hi [Guest name],\n\nI am happy to share that I am getting married on [Wedding date] in [City]. I would be glad if you could join us for the reception on [Reception date].\n\nThe invite, with the venue and timings: [link]\n\nRegards,\n[Your name]',
      },
      {
        label: 'Office group',
        lang: 'en-IN',
        text: 'Hello everyone, I am getting married on [Wedding date]! You are all invited to the reception at [Venue], [City] on [Reception date] at [Time]. Map and details: [link]. It would mean a lot to see you there.',
      },
    ],
  },
  {
    heading: 'Wedding invitation messages in Hindi',
    intro: 'For relatives who read Hindi first. Each message is ready to paste into WhatsApp.',
    messages: [
      {
        label: 'औपचारिक निमंत्रण',
        lang: 'hi-IN',
        text: 'आदरणीय [Guest name] जी,\n\nश्री गणेश जी और बड़ों के आशीर्वाद से हमारी पुत्री राधा का शुभ विवाह श्याम के साथ [Wedding date] को [City] में होना निश्चित हुआ है।\n\nआप सपरिवार पधारकर वर-वधू को आशीर्वाद दें।\n\nपूरा निमंत्रण और स्थान का नक्शा: [link]\n\nनिवेदक: [Your name] एवं परिवार',
      },
      {
        label: 'परिवार के लिए',
        lang: 'hi-IN',
        text: 'प्रिय [Guest name] जी,\n\nखुशखबरी! राधा और श्याम की शादी [Wedding date] को है। हल्दी, मेहंदी और शादी के सभी कार्यक्रमों की जानकारी इस लिंक पर है: [link]\n\nआपके बिना यह खुशी अधूरी है, ज़रूर आइए।',
      },
      {
        label: 'छोटा संदेश',
        lang: 'hi-IN',
        text: 'शुभ विवाह: राधा संग श्याम, [Wedding date], [City]। आपका निमंत्रण: [link]। आपकी प्रतीक्षा रहेगी।',
      },
    ],
  },
  {
    heading: 'Reminder messages before the wedding',
    intro:
      'Send one reminder two or three days before each function. Guests lose the first message under new chats.',
    messages: [
      {
        label: 'Gentle reminder',
        lang: 'en-IN',
        text: 'Namaste [Guest name] ji, a gentle reminder: the wedding is this [Day], [Wedding date], at [Venue]. The map is on your invite: [link]. We look forward to seeing you.',
      },
      {
        label: 'Day-of reminder',
        lang: 'en-IN',
        text: 'Good morning [Guest name]! See you tonight at [Venue]. The baraat leaves at [Time]. Tap here for directions: [link]',
      },
    ],
  },
];

export const REPLY_MESSAGE_GROUPS: readonly MessageGroup[] = [
  {
    heading: 'Replies to accept a wedding invitation',
    intro:
      'Say yes, thank them, and tell them how many of you will come. That last line helps the family plan seats and rooms.',
    messages: [
      {
        label: 'Formal, to elders',
        lang: 'en-IN',
        text: 'Namaste [Name] ji, thank you for the invitation. Heartiest congratulations to the whole family. We will certainly attend the wedding on [Wedding date]. We are [Number] people.',
      },
      {
        label: 'To a friend',
        lang: 'en-IN',
        text: 'Congratulations!! Of course I am coming. Wouldn’t miss it for anything. Count me in for the sangeet too!',
      },
      {
        label: 'Quick reply',
        lang: 'en-IN',
        text: 'Congratulations to the whole family! We will be there on [Wedding date]. Thank you for inviting us.',
      },
      {
        label: 'To a colleague',
        lang: 'en-IN',
        text: 'Thank you for the invitation, [Name], and many congratulations! I will be there for the reception on [Date].',
      },
      {
        label: 'With family',
        lang: 'en-IN',
        text: 'Thank you so much for remembering us. Congratulations to Radha and Shyam! The four of us will be there on [Wedding date]. Please tell us if we can help with anything.',
      },
    ],
  },
  {
    heading: 'Replies to decline a wedding invitation politely',
    intro:
      'Reply soon, give a short reason, and send your blessings. Offer to meet the couple later if you can.',
    messages: [
      {
        label: 'Polite decline',
        lang: 'en-IN',
        text: 'Thank you for the invitation, [Name] ji, and many congratulations. Sadly I cannot travel on those dates, and I am sorry to miss it. My blessings to the couple for a happy married life.',
      },
      {
        label: 'Decline with a gift',
        lang: 'en-IN',
        text: 'Congratulations to you both! I am out of the country on [Wedding date], so I will miss the big day. I am sending my blessings and a small gift. Let us celebrate together when I am back.',
      },
    ],
  },
  {
    heading: 'Replies in Hindi',
    intro: 'For relatives who invited you in Hindi. Reply in the language they used.',
    messages: [
      {
        label: 'आने की पुष्टि',
        lang: 'hi-IN',
        text: 'आदरणीय [Name] जी, निमंत्रण के लिए हार्दिक धन्यवाद। राधा और श्याम को शुभ विवाह की ढेर सारी बधाई। हम सपरिवार [Wedding date] को अवश्य आएँगे।',
      },
      {
        label: 'न आ पाने पर',
        lang: 'hi-IN',
        text: 'निमंत्रण के लिए धन्यवाद। क्षमा चाहते हैं, उस दिन हम उपस्थित नहीं हो पाएँगे। वर-वधू को सुखी वैवाहिक जीवन के लिए हमारा आशीर्वाद।',
      },
    ],
  },
  {
    heading: 'Thank-you replies after the wedding',
    intro: 'A message after the wedding is the reply guests remember.',
    messages: [
      {
        label: 'To the couple',
        lang: 'en-IN',
        text: 'Radha and Shyam, thank you for letting us be part of your big day. You both looked so happy. Wishing you love, laughter and a home full of blessings.',
      },
      {
        label: 'To the family',
        lang: 'en-IN',
        text: 'Thank you for having us, [Name] ji. The wedding was beautiful and the food was wonderful. Wishing Radha and Shyam a lifetime of happiness.',
      },
    ],
  },
];

export const LANDING_FAQS: readonly Faq[] = [
  {
    question: 'What is a WhatsApp wedding invitation?',
    answer:
      'It is a wedding invitation sent as a link on WhatsApp instead of a printed card. The guest taps the link and sees the invite as a web page, with the date, venue map, countdown and RSVP.',
  },
  {
    question: 'Can every guest get an invitation with their own name?',
    answer:
      'Yes. Each guest gets their own link, and the invite opens with their name, for example "Hi Neha". You make the links from your dashboard and send each one on WhatsApp.',
  },
  {
    question: 'How do guests RSVP?',
    answer:
      'The invite has an RSVP button. The guest taps it, and WhatsApp opens with a reply to the couple already typed. The reply arrives in the couple’s WhatsApp.',
  },
  {
    question: 'Does the guest need to install an app?',
    answer:
      'No. The invite opens in the browser that WhatsApp uses. It works on any Android phone or iPhone.',
  },
  {
    question: 'Will WhatsApp show a preview of the invite?',
    answer:
      'Yes. WhatsApp shows a card with the couple’s names, the date and the guest’s name above the link, so it looks like an invitation, not a bare link.',
  },
  {
    question: 'Is a digital wedding invitation acceptable for elders?',
    answer:
      'Yes, if you also call them. Many families now send the invitation on WhatsApp and phone the elders as well. A digital invite carries the full details and the map, so elders can find the venue without phoning anyone.',
  },
  {
    question: 'Can I see the invite before I pay?',
    answer:
      'Yes. Type the bride’s and groom’s names and your WhatsApp number. We send a private preview link to your WhatsApp, and you pay only if you like it.',
  },
];

export const MESSAGE_GUIDE_FAQS: readonly Faq[] = [
  {
    question: 'What should a wedding invitation message on WhatsApp include?',
    answer:
      'The guest’s name, the couple’s names, the date, the city or venue, and a link with the full details and map. Close with who is inviting them.',
  },
  {
    question: 'Is it OK to invite relatives to a wedding on WhatsApp?',
    answer:
      'Yes. It is now normal in India. For elders, send a respectful message with ji, and follow it with a phone call.',
  },
  {
    question: 'When should I send wedding invitations on WhatsApp?',
    answer:
      'Send them 4 to 6 weeks before the wedding, and 8 weeks for guests who must travel. Send a reminder 2 or 3 days before each function.',
  },
  {
    question: 'Should I send one message to a group or to each guest?',
    answer:
      'Send each guest their own message. A personal message with their name feels like an invitation; a group forward feels like a notice.',
  },
  {
    question: 'Can I write the invitation message in Hindi?',
    answer:
      'Yes. Write in the language the guest uses with you. This page has ready Hindi messages in Devanagari.',
  },
];

export const REPLY_GUIDE_FAQS: readonly Faq[] = [
  {
    question: 'How do I reply to a wedding invitation on WhatsApp?',
    answer:
      'Thank them, congratulate the couple, and say clearly whether you will come. If you will come, say how many people are coming.',
  },
  {
    question: 'How soon should I reply to a wedding invitation?',
    answer:
      'Within a day or two. The family plans food, seats and rooms from the replies, so an early answer helps them.',
  },
  {
    question: 'How do I decline a wedding invitation politely?',
    answer:
      'Thank them, give a short reason, say you are sorry to miss it, and send your blessings to the couple. Do not leave the message unanswered.',
  },
  {
    question: 'Should I reply in Hindi or English?',
    answer: 'Reply in the language the invitation used, or the one you use with that person.',
  },
  {
    question: 'Is a WhatsApp reply enough, or should I call?',
    answer:
      'A WhatsApp reply is enough for friends and colleagues. For close family and elders, reply and then call to congratulate them.',
  },
];
