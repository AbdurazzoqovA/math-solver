"use client";

import { useState } from "react";
import EmptyState from "./EmptyState";
import ChatInput from "./ChatInput";
import MessageList, { Message } from "./MessageList";

export default function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const newUserMsg: Message = { id: Date.now().toString(), role: "user", content };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Send the entire conversation history (including the new message)
      const apiMessages = [...messages, newUserMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      if (!response.body) {
        throw new Error('No body returned from API');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";
      
      const assistantMessageId = (Date.now() + 1).toString();
      const newAstMsg: Message = { 
        id: assistantMessageId, 
        role: "assistant", 
        content: "" 
      };
      
      setMessages((prev) => [...prev, newAstMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunks = decoder.decode(value, { stream: true });
        streamedContent += textChunks;
        
        setMessages((prev) => 
          prev.map((m) => m.id === assistantMessageId ? { ...m, content: streamedContent } : m)
        );
      }

    } catch (error) {
      console.error("Error solving math problem:", error);
      // Optional: Add a subtle error message to the chat
      setMessages((prev) => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          role: "assistant", 
          content: "Sorry, I encountered an error while solving that problem. Please try again." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-y-auto w-full relative z-0">
        {messages.length === 0 ? (
          <div className="w-full min-h-full flex flex-col">
            <EmptyState onStartChat={sendMessage} />
          </div>
        ) : (
          <div className="w-full max-w-4xl xl:max-w-5xl mx-auto px-4 md:px-8 py-24 pb-72">
            <MessageList messages={messages} isLoading={isLoading} />
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
