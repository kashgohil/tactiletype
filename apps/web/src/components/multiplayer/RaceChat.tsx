import { Button } from '@/components/ui/button';
import type { ChatMessageData } from '@/services/websocket';
import { Eye, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface RaceChatProps {
  messages: ChatMessageData[];
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const RaceChat: React.FC<RaceChatProps> = ({
  messages,
  onSend,
  disabled,
}) => {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  return (
    <section className="rounded-2xl border border-accent/15 bg-accent/[0.05] flex flex-col h-64 md:h-80">
      <h2 className="text-sm font-semibold text-text/70 px-3 py-2 border-b border-accent/15">
        Chat
      </h2>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-text/40 text-xs text-center py-6">
            Say hi — keep it friendly.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="leading-snug">
            <span className="font-medium text-accent">
              {m.username}
              {m.role === 'spectator' && (
                <Eye className="inline size-3 ml-1 opacity-70" />
              )}
            </span>
            <span className="text-text/40 text-[10px] ml-1.5">
              {new Date(m.at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <p className="text-text/80 break-words">{m.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={submit}
        className="flex gap-2 p-2 border-t border-accent/15"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          maxLength={500}
          disabled={disabled}
          className="flex-1 h-9 rounded-md border border-line bg-transparent px-3 text-sm"
        />
        <Button type="submit" size="icon" disabled={disabled || !text.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </section>
  );
};
