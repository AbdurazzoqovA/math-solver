"use client";

import { useState } from "react";
import EmptyState from "./EmptyState";
import ChatInput from "./ChatInput";
import MessageList, { Message } from "./MessageList";

export default function ChatArea() {
  const [messages, setMessages] = useState<Message[]>([]);

  // Function to simulate starting a chat from the Empty State
  const handleStartChat = () => {
    setMessages([
      {
        id: "1",
        role: "user",
        content: "If 1=3, 2=3, 3=5, 4=4, 5=4, then 6=?"
      },
      {
        id: "2",
        role: "assistant",
        content: "The rule established by the given equations is: The number on the left is equal to the **number of letters** in the English spelling of that number.\n\nLet's re-verify the final step:\n* The number is **6**.\n* The English spelling is \"six\".\n* The word \"six\" has 3 letters.\n\nTherefore, **6 = 3**. The solution is correct based on the pattern presented.",
        isCorrect: true
      }
    ]);
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-y-auto w-full relative z-0">
        {messages.length === 0 ? (
          <div className="w-full min-h-full flex flex-col justify-center py-10 md:py-20">
            <EmptyState onStartChat={handleStartChat} />
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto px-4 py-24 pb-48">
            <MessageList messages={messages} />
          </div>
        )}
      </div>

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/60 to-transparent pt-20 pb-8 px-4 z-10 transition-all duration-500 ease-in-out ${messages.length > 0 ? "opacity-100 translate-y-0 pointer-events-none" : "opacity-0 translate-y-10 pointer-events-none"}`}>
        <div className="pointer-events-auto w-full max-w-4xl mx-auto">
          {messages.length > 0 && <ChatInput />}
        </div>
      </div>
    </div>
  );
}
