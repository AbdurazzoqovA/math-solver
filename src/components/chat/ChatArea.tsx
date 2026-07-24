"use client";

import { useRef, useEffect } from "react";
import EmptyState from "./EmptyState";
import ChatInput from "./ChatInput";
import MessageList, { type Message } from "./MessageList";
import { useChatContext } from "@/context/ChatContext";

type ChatConversationProps = {
  messages: Message[];
  isLoading: boolean;
  activeChatId: string | null;
  onSubmit: (
    value: string,
    images?: { url: string; ocrText: string }[],
  ) => void;
};

export function ChatConversation({
  messages,
  isLoading,
  activeChatId,
  onSubmit,
}: ChatConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  // Scroll to top when switching chats (including New Chat → empty state)
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [activeChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto w-full relative z-0">
        <div className="w-full max-w-4xl xl:max-w-5xl mx-auto px-4 md:px-8 py-24 pb-72">
          <MessageList messages={messages} isLoading={isLoading} />
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent pt-20 pb-8 px-4 z-10">
        <div className="pointer-events-auto w-full max-w-4xl xl:max-w-5xl mx-auto md:px-4">
          <ChatInput onSubmit={onSubmit} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default function ChatArea() {
  const { messages, isLoading, sendMessage, activeChatId } = useChatContext();

  if (messages.length > 0) {
    return (
      <ChatConversation
        messages={messages}
        isLoading={isLoading}
        activeChatId={activeChatId}
        onSubmit={sendMessage}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative z-0 w-full flex-1 overflow-y-auto">
        <div className="flex min-h-full w-full flex-col">
          <EmptyState onStartChat={sendMessage} />
        </div>
      </div>
    </div>
  );
}
