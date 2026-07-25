"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import {
  Message,
  PracticeAttempt,
} from "@/components/chat/MessageList";
import { useTurnstile } from "@/components/providers/TurnstileProvider";
import { Question } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import {
  deleteCloudChat,
  loadCloudNotebook,
  saveCloudChats,
} from "@/lib/firebase-notebook";

// ── Types ──────────────────────────────────────────────
export type Chat = {
  id: string;
  title: string;
  source?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

export type CloudSyncState =
  | "unavailable"
  | "signed-out"
  | "syncing"
  | "synced"
  | "error";

type ChatContextType = {
  chats: Chat[];
  activeChatId: string | null;
  activeChatSource: string | null;
  messages: Message[];
  isLoading: boolean;
  cloudSyncState: CloudSyncState;
  createNewChat: () => void;
  switchChat: (id: string) => void;
  deleteChat: (id: string) => void;
  sendMessage: (
    content: string,
    images?: { url: string; ocrText: string }[],
    options?: { forceNewChat?: boolean; source?: string },
  ) => Promise<void>;
  savePracticeToMessage: (
    messageId: string,
    practiceTest: {
      title: string;
      questions: Question[];
      attempts?: PracticeAttempt[];
    },
  ) => void;
  savePracticeAttempt: (
    messageId: string,
    attempt: PracticeAttempt,
  ) => void;
};

// ── Constants ──────────────────────────────────────────
const STORAGE_KEY = "mathsolver_chats";
const ACCOUNT_STORAGE_PREFIX = "mathsolver_chats_user_";
const CLOUD_SYNC_DEBOUNCE_MS = 900;

// ── Helpers ────────────────────────────────────────────
function getAccountStorageKey(userId: string) {
  return `${ACCOUNT_STORAGE_PREFIX}${userId}`;
}

function loadChatsFromStorage(storageKey = STORAGE_KEY): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChatsToStorage(chats: Chat[], storageKey = STORAGE_KEY) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(chats));
  } catch (e) {
    console.warn("Failed to persist chats to localStorage:", e);
  }
}

function mergeChats(...chatCollections: Chat[][]): Chat[] {
  const merged = new Map<string, Chat>();

  for (const chats of chatCollections) {
    for (const chat of chats) {
      const existing = merged.get(chat.id);
      if (!existing || chat.updatedAt >= existing.updatedAt) {
        merged.set(chat.id, chat);
      }
    }
  }

  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

function applyCloudDeletions(
  chats: Chat[],
  deletions: Map<string, number>,
): Chat[] {
  return chats.filter((chat) => !deletions.has(chat.id));
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
  const [cloudSyncState, setCloudSyncState] =
    useState<CloudSyncState>("unavailable");
  const { getToken } = useTurnstile();
  const { user, isAuthReady, isFirebaseEnabled } = useAuth();

  // Keep a ref so the streaming callback can always read the latest chats
  const chatsRef = useRef(chats);
  const lastCloudVersionsRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // ── Hydrate the guest or signed-in notebook ─────────
  useEffect(() => {
    if (!isAuthReady) return;

    let cancelled = false;
    const hydrateNotebook = async () => {
      setHydrated(false);
      setActiveChatId(null);
      lastCloudVersionsRef.current.clear();

      const guestChats = loadChatsFromStorage();
      if (!user || !isFirebaseEnabled) {
        if (cancelled) return;
        chatsRef.current = guestChats;
        setChats(guestChats);
        setCloudSyncState(
          isFirebaseEnabled ? "signed-out" : "unavailable",
        );
        setHydrated(true);
        return;
      }

      const accountStorageKey = getAccountStorageKey(user.uid);
      const cachedAccountChats = loadChatsFromStorage(accountStorageKey);
      const localChats = mergeChats(cachedAccountChats, guestChats);
      chatsRef.current = localChats;
      setChats(localChats);
      setCloudSyncState("syncing");

      try {
        const cloudNotebook = await loadCloudNotebook(user.uid);
        if (cancelled) return;

        // Include any chats created while the initial cloud read was in flight.
        const mergedChats = applyCloudDeletions(
          mergeChats(chatsRef.current, cloudNotebook.chats),
          cloudNotebook.deletions,
        );
        chatsRef.current = mergedChats;
        setChats(mergedChats);
        saveChatsToStorage(mergedChats, accountStorageKey);

        await saveCloudChats(user.uid, mergedChats);
        if (cancelled) return;

        lastCloudVersionsRef.current = new Map(
          mergedChats.map((chat) => [chat.id, chat.updatedAt]),
        );
        // Guest work has now been imported into this account successfully.
        if (guestChats.length > 0) {
          localStorage.removeItem(STORAGE_KEY);
        }
        setCloudSyncState("synced");
      } catch (error) {
        console.error("Failed to synchronize the Firebase notebook:", error);
        if (!cancelled) setCloudSyncState("error");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    void hydrateNotebook();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isFirebaseEnabled, user]);

  // ── Persist whenever chats change (after hydration) ─
  useEffect(() => {
    if (hydrated) {
      const storageKey =
        user && isFirebaseEnabled
          ? getAccountStorageKey(user.uid)
          : STORAGE_KEY;
      saveChatsToStorage(chats, storageKey);
    }
  }, [chats, hydrated, isFirebaseEnabled, user]);

  // Avoid a Firestore write for every streamed token. Once a solve completes,
  // write only chats whose updatedAt version has changed.
  useEffect(() => {
    if (
      !hydrated ||
      !user ||
      !isFirebaseEnabled ||
      isLoading
    ) {
      return;
    }

    const dirtyChats = chats.filter(
      (chat) =>
        lastCloudVersionsRef.current.get(chat.id) !== chat.updatedAt,
    );
    if (dirtyChats.length === 0) return;

    const timeoutId = window.setTimeout(async () => {
      setCloudSyncState("syncing");
      try {
        await saveCloudChats(user.uid, dirtyChats);
        for (const chat of dirtyChats) {
          lastCloudVersionsRef.current.set(chat.id, chat.updatedAt);
        }
        setCloudSyncState("synced");
      } catch (error) {
        console.error("Failed to save the Firebase notebook:", error);
        setCloudSyncState("error");
      }
    }, CLOUD_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [chats, hydrated, isFirebaseEnabled, isLoading, user]);

  // Derived messages for the active chat
  const activeChat = chats.find((c) => c.id === activeChatId);
  const activeChatSource = activeChat?.source ?? null;
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
      lastCloudVersionsRef.current.delete(id);
      if (user && isFirebaseEnabled) {
        setCloudSyncState("syncing");
        void deleteCloudChat(user.uid, id)
          .then(() => setCloudSyncState("synced"))
          .catch((error) => {
            console.error("Failed to delete the synced chat:", error);
            setCloudSyncState("error");
          });
      }
    },
    [activeChatId, isFirebaseEnabled, user]
  );

  const savePracticeToMessage = useCallback((messageId: string, practiceTest: { title: string; questions: Question[]; attempts?: PracticeAttempt[] }) => {
    setChats(prev => prev.map(c => {
      // Check if this chat contains the message we want to update
      const hasMessage = c.messages.some(m => m.id === messageId);
      if (!hasMessage) return c;

      // Update the Specific message inside this chat
      return {
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map(m => 
          m.id === messageId
            ? {
                ...m,
                practiceTest: {
                  ...practiceTest,
                  attempts:
                    practiceTest.attempts ?? m.practiceTest?.attempts,
                },
              }
            : m
        )
      };
    }));
  }, []);

  const savePracticeAttempt = useCallback(
    (messageId: string, attempt: PracticeAttempt) => {
      setChats((prev) =>
        prev.map((chat) => {
          const hasMessage = chat.messages.some(
            (message) => message.id === messageId && message.practiceTest,
          );
          if (!hasMessage) return chat;

          return {
            ...chat,
            updatedAt: Date.now(),
            messages: chat.messages.map((message) =>
              message.id === messageId && message.practiceTest
                ? {
                    ...message,
                    practiceTest: {
                      ...message.practiceTest,
                      attempts: [
                        attempt,
                        ...(message.practiceTest.attempts ?? []),
                      ].slice(0, 20),
                    },
                  }
                : message,
            ),
          };
        }),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      images?: { url: string; ocrText: string }[],
      options?: { forceNewChat?: boolean; source?: string },
    ) => {
      if ((!content.trim() && (!images || images.length === 0)) || isLoading) return;

      const displayContent = content.trim() || "Solve the above math problem.";

      const newUserMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content: displayContent,
        images: images && images.length > 0 ? images : undefined,
      };

      let chatId = options?.forceNewChat ? null : activeChatId;

      // If no active chat, create one
      if (!chatId) {
        chatId = crypto.randomUUID();
        const newChat: Chat = {
          id: chatId,
          title: generateTitle(displayContent),
          source: options?.source,
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
        const chatSource = currentChat?.source ?? options?.source;

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
          body: JSON.stringify({
            messages: apiMessages,
            captchaToken,
            source: chatSource,
          }),
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
    [activeChatId, getToken, isLoading]
  );

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChatId,
        activeChatSource,
        messages,
        isLoading,
        cloudSyncState,
        createNewChat,
        switchChat,
        deleteChat,
        sendMessage,
        savePracticeToMessage,
        savePracticeAttempt,
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
