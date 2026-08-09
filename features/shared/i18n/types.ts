import type { en } from "./messages/en";

export type MessageKey = keyof typeof en;
export type MessageCatalog = Record<MessageKey, string>;
export type TVars = Record<string, string | number>;
