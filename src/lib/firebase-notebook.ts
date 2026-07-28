"use client";

import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from "firebase/firestore/lite";
import type { Chat } from "@/context/ChatContext";
import type { Message } from "@/components/chat/MessageList";
import { getFirebaseClient } from "@/lib/firebase-client";

const CHAT_SCHEMA_VERSION = 1;
const FIRESTORE_BATCH_LIMIT = 200;

type CloudChatDocument = Chat & {
  schemaVersion: typeof CHAT_SCHEMA_VERSION;
};

function sanitizeMessageForCloud(message: Message): Message {
  const sanitized: Message = {
    id: message.id,
    role: message.role,
    content: message.content,
  };

  if (typeof message.isCorrect === "boolean") {
    sanitized.isCorrect = message.isCorrect;
  }

  // Browser data URLs can exceed Firestore's per-document size limit. Keep the
  // OCR text so synced conversations retain their mathematical context, while
  // the original image remains in this browser's local notebook.
  if (message.images?.length) {
    sanitized.images = message.images.map((image) => ({
      ocrText: image.ocrText,
    }));
  }

  if (message.practiceTest) {
    sanitized.practiceTest = message.practiceTest;
  }

  return sanitized;
}

function sanitizeChatForCloud(chat: Chat): CloudChatDocument {
  const sanitized: CloudChatDocument = {
    schemaVersion: CHAT_SCHEMA_VERSION,
    id: chat.id,
    title: chat.title,
    messages: chat.messages.map(sanitizeMessageForCloud),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };

  if (chat.source) {
    sanitized.source = chat.source;
  }

  return sanitized;
}

function isCloudChat(value: unknown): value is CloudChatDocument {
  if (!value || typeof value !== "object") return false;
  const chat = value as Partial<CloudChatDocument>;

  return (
    chat.schemaVersion === CHAT_SCHEMA_VERSION &&
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    Array.isArray(chat.messages) &&
    typeof chat.createdAt === "number" &&
    typeof chat.updatedAt === "number"
  );
}

export type CloudNotebook = {
  chats: Chat[];
  deletions: Map<string, number>;
};

export async function loadCloudNotebook(
  userId: string,
): Promise<CloudNotebook> {
  const client = getFirebaseClient();
  if (!client) return { chats: [], deletions: new Map() };

  const [chatSnapshot, deletionSnapshot] = await Promise.all([
    getDocs(collection(client.db, "users", userId, "chats")),
    getDocs(collection(client.db, "users", userId, "chatDeletions")),
  ]);

  const chats = chatSnapshot.docs
    .map((snapshotDoc) => snapshotDoc.data())
    .filter(isCloudChat)
    .map((cloudChat) => ({
      id: cloudChat.id,
      title: cloudChat.title,
      source: cloudChat.source,
      messages: cloudChat.messages,
      createdAt: cloudChat.createdAt,
      updatedAt: cloudChat.updatedAt,
    }));

  const deletions = new Map<string, number>();
  for (const deletionDoc of deletionSnapshot.docs) {
    const deletedAt = deletionDoc.data().deletedAt;
    if (typeof deletedAt === "number") {
      deletions.set(deletionDoc.id, deletedAt);
    }
  }

  return { chats, deletions };
}

export async function saveCloudChats(
  userId: string,
  chats: Chat[],
): Promise<void> {
  const client = getFirebaseClient();
  if (!client || chats.length === 0) return;

  for (let index = 0; index < chats.length; index += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(client.db);
    const chunk = chats.slice(index, index + FIRESTORE_BATCH_LIMIT);

    for (const chat of chunk) {
      batch.set(
        doc(client.db, "users", userId, "chats", chat.id),
        sanitizeChatForCloud(chat),
      );
      batch.delete(
        doc(client.db, "users", userId, "chatDeletions", chat.id),
      );
    }

    await batch.commit();
  }
}

export async function deleteCloudChat(
  userId: string,
  chatId: string,
): Promise<void> {
  const client = getFirebaseClient();
  if (!client) return;

  const batch = writeBatch(client.db);
  batch.delete(doc(client.db, "users", userId, "chats", chatId));
  batch.set(doc(client.db, "users", userId, "chatDeletions", chatId), {
    deletedAt: Date.now(),
  });
  await batch.commit();
}
