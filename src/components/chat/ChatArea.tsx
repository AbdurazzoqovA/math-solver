"use client";

import { useRef, useEffect } from "react";
import EmptyState from "./EmptyState";
import ChatInput from "./ChatInput";
import MessageList from "./MessageList";
import { useChatContext } from "@/context/ChatContext";

export default function ChatArea() {
  const { messages, isLoading, sendMessage, activeChatId } = useChatContext();
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
        {messages.length === 0 ? (
          <div className="w-full min-h-full flex flex-col">
            <EmptyState onStartChat={sendMessage} />
          </div>
        ) : (
          <div className="w-full max-w-4xl xl:max-w-5xl mx-auto px-4 md:px-8 py-24 pb-72">
            <MessageList messages={messages} isLoading={isLoading} />
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent pt-20 pb-8 px-4 z-10 transition-all duration-500 ease-in-out ${messages.length > 0 ? "opacity-100 translate-y-0 pointer-events-none" : "opacity-0 translate-y-10 pointer-events-none"}`}>
        <div className="pointer-events-auto w-full max-w-4xl xl:max-w-5xl mx-auto md:px-4">
          {messages.length > 0 && <ChatInput onSubmit={sendMessage} disabled={isLoading} />}
        </div>
      </div>
    </div>
  );
}
