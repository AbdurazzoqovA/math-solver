"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Message } from "@/components/chat/MessageList";
import { useTurnstile } from "@/components/providers/TurnstileProvider";
import { Question } from "@/context/UIContext";

// ── Types ──────────────────────────────────────────────
export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

type ChatContextType = {
  chats: Chat[];
  activeChatId: string | null;
  messages: Message[];
  isLoading: boolean;
  createNewChat: () => void;
  switchChat: (id: string) => void;
  deleteChat: (id: string) => void;
  sendMessage: (content: string, images?: { url: string; ocrText: string }[]) => Promise<void>;
  savePracticeToMessage: (messageId: string, practiceTest: { title: string; questions: Question[] }) => void;
};

// ── Constants ──────────────────────────────────────────
const STORAGE_KEY = "mathsolver_chats";

// ── Helpers ────────────────────────────────────────────
function loadChatsFromStorage(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChatsToStorage(chats: Chat[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.warn("Failed to persist chats to localStorage:", e);
  }
}

function generateTitle(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  return cleaned.length > 50 ? cleaned.slice(0, 50) + "…" : cleaned;
}

// ── Context ────────────────────────────────────────────
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { getToken } = useTurnstile();

  // Keep a ref so the streaming callback can always read the latest chats
  const chatsRef = useRef(chats);
  chatsRef.current = chats;

  // ── Hydrate from localStorage (client-only) ────────
  useEffect(() => {
    const stored = loadChatsFromStorage();
    if (stored.length > 0) {
      setChats(stored);
      // Auto-select the most recently updated chat
      const sorted = [...stored].sort((a, b) => b.updatedAt - a.updatedAt);
      setActiveChatId(sorted[0].id);
    }
    setHydrated(true);
  }, []);

  // ── Persist whenever chats change (after hydration) ─
  useEffect(() => {
    if (hydrated) {
      saveChatsToStorage(chats);
    }
  }, [chats, hydrated]);

  // Derived messages for the active chat
  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages ?? [];

  // ── Actions ─────────────────────────────────────────

  const createNewChat = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const switchChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        return next;
      });
      if (activeChatId === id) {
        setActiveChatId(null);
      }
    },
    [activeChatId]
  );

  const savePracticeToMessage = useCallback((messageId: string, practiceTest: { title: string; questions: Question[] }) => {
    setChats(prev => prev.map(c => {
      // Check if this chat contains the message we want to update
      const hasMessage = c.messages.some(m => m.id === messageId);
      if (!hasMessage) return c;

      // Update the Specific message inside this chat
      return {
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map(m => 
          m.id === messageId ? { ...m, practiceTest } : m
        )
      };
    }));
  }, []);

  const sendMessage = useCallback(
    async (content: string, images?: { url: string; ocrText: string }[]) => {
      if ((!content.trim() && (!images || images.length === 0)) || isLoading) return;

      const displayContent = content.trim() || "Solve the above math problem.";

      const newUserMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: displayContent,
        images: images && images.length > 0 ? images : undefined,
      };

      let chatId = activeChatId;

      // If no active chat, create one
      if (!chatId) {
        chatId = crypto.randomUUID();
        const newChat: Chat = {
          id: chatId,
          title: generateTitle(displayContent),
          messages: [newUserMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setChats((prev) => [newChat, ...prev]);
        setActiveChatId(chatId);
      } else {
        // Append user message to existing chat
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? { ...c, messages: [...c.messages, newUserMsg], updatedAt: Date.now() }
              : c
          )
        );
      }

      setIsLoading(true);

      try {
        // Build API messages from the chat's full history + the new user message
        const currentChat = chatsRef.current.find((c) => c.id === chatId);
        const allMessages = currentChat ? [...currentChat.messages, newUserMsg] : [newUserMsg];

        const apiMessages = allMessages.map((m) => {
          let finalContent = m.content;
          if (m.images && m.images.length > 0) {
            const combinedOcr = m.images.map((img) => img.ocrText).join("\n\n---\n\n");
            finalContent =
              m.content === "Solve the above math problem."
                ? combinedOcr
                : `${m.content}\n\nProblem context:\n${combinedOcr}`;
          }
          return { role: m.role, content: finalContent };
        });

        const captchaToken = getToken();
        const response = await fetch("/api/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, captchaToken }),
        });

        if (!response.ok) throw new Error("Failed to fetch response");
        if (!response.body) throw new Error("No body returned from API");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedContent = "";

        const assistantMessageId = (Date.now() + 1).toString();
        const newAstMsg: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        };

        // Add empty assistant message
        const capturedChatId = chatId;
        setChats((prev) =>
          prev.map((c) =>
            c.id === capturedChatId
              ? { ...c, messages: [...c.messages, newAstMsg], updatedAt: Date.now() }
              : c
          )
        );

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunks = decoder.decode(value, { stream: true });
          streamedContent += textChunks;

          const contentSnapshot = streamedContent;
          setChats((prev) =>
            prev.map((c) =>
              c.id === capturedChatId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessageId ? { ...m, content: contentSnapshot } : m
                    ),
                    updatedAt: Date.now(),
                  }
                : c
            )
          );
        }
      } catch (error) {
        console.error("Error solving math problem:", error);
        const capturedChatId = chatId;
        setChats((prev) =>
          prev.map((c) =>
            c.id === capturedChatId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    {
                      id: (Date.now() + 1).toString(),
                      role: "assistant" as const,
                      content: "Sorry, I encountered an error while solving that problem. Please try again.",
                    },
                  ],
                  updatedAt: Date.now(),
                }
              : c
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeChatId, isLoading]
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        messages,
        isLoading,
        createNewChat,
        switchChat,
        deleteChat,
        sendMessage,
        savePracticeToMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
