import { Conversation, ChatMessage } from "./types";

const STORAGE_KEY = "chat_conversations";

function readAll(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Conversation[]) : [];
  } catch {
    return [];
  }
}

function writeAll(conversations: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

/** Get all conversations sorted by id (newest first) */
export function getAllConversations(): Conversation[] {
  return readAll().sort((a, b) => b.id.localeCompare(a.id));
}

/** Get a single conversation by id */
export function getConversation(id: string): Conversation | undefined {
  return readAll().find((c) => c.id === id);
}

/** Create a new empty conversation and return it */
export function createConversation(id: string): Conversation {
  const conv: Conversation = {
    id,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const all = readAll();
  all.push(conv);
  writeAll(all);
  return conv;
}

/** Save messages for a given conversation */
export function saveMessages(id: string, messages: ChatMessage[]) {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx !== -1) {
    all[idx].messages = messages;
    all[idx].updatedAt = Date.now();
  } else {
    all.push({
      id,
      messages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  writeAll(all);
}

/** Rename a conversation */
export function renameConversation(id: string, title: string) {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx !== -1) {
    all[idx].title = title;
    writeAll(all);
  }
}

/** Delete a conversation */
export function deleteConversation(id: string) {
  writeAll(readAll().filter((c) => c.id !== id));
}
