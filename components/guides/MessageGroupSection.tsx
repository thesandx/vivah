import { MessageCard } from '@/components/guides/MessageCard';
import type { MessageGroup } from '@/lib/whatsapp-guides';

export interface MessageGroupSectionProps {
  group: MessageGroup;
}

/** One group of ready messages: a heading, one line on when to use them, the cards. */
export function MessageGroupSection({ group }: MessageGroupSectionProps) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-title">{group.heading}</h2>
        <p className="text-ink-soft">{group.intro}</p>
      </div>
      <ul className="grid gap-5 lg:grid-cols-2">
        {group.messages.map((message) => (
          <MessageCard key={message.label} message={message} />
        ))}
      </ul>
    </section>
  );
}
