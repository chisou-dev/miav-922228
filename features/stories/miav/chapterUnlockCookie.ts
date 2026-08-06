import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { FREE_THROUGH_CHAPTER } from "@/features/stories/miav/chapterProgress";

export const UNLOCK_COOKIE_NAME = "miav_chapter_unlock_v1";
export const READ_SESSION_COOKIE_NAME = "miav_chapter_read_session_v1";

const UNLOCK_MAX_AGE_SEC = 60 * 60 * 24 * 400;
const READ_SESSION_MAX_AGE_SEC = 60 * 60 * 2;
const UNLOCK_COOKIE_VERSION = 1;
const READ_SESSION_VERSION = 1;

export type UnlockPayload = {
  v: number;
  unlockedThrough: number;
  iat: number;
};

export type ReadSessionPayload = {
  v: number;
  chapterNumber: number;
  startedAt: number;
  nonce: string;
};

function getSecret(): string | null {
  const secret = process.env.MIAV_CHAPTER_UNLOCK_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function b64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function fromB64urlJson(raw: string): unknown {
  return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function encodeSigned(payload: unknown, secret: string): string {
  const payloadB64 = b64urlJson(payload);
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

function decodeSigned<T>(
  token: string,
  secret: string,
  parse: (value: unknown) => T | null,
): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;
  const expected = sign(payloadB64, secret);
  if (!safeEqual(signature, expected)) return null;
  try {
    return parse(fromB64urlJson(payloadB64));
  } catch {
    return null;
  }
}

function clampUnlockedThrough(
  value: number,
  maxChapterNumber: number,
): number {
  const max = Math.max(FREE_THROUGH_CHAPTER, maxChapterNumber);
  return Math.min(max, Math.max(FREE_THROUGH_CHAPTER, Math.floor(value)));
}

function parseUnlockPayload(value: unknown): UnlockPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const v = Number(record.v);
  const unlockedThrough = Number(record.unlockedThrough);
  const iat = Number(record.iat);
  if (v !== UNLOCK_COOKIE_VERSION) return null;
  if (!Number.isFinite(unlockedThrough) || unlockedThrough < 1) return null;
  if (!Number.isFinite(iat) || iat <= 0) return null;
  return {
    v: UNLOCK_COOKIE_VERSION,
    unlockedThrough: Math.floor(unlockedThrough),
    iat: Math.floor(iat),
  };
}

function parseReadSessionPayload(value: unknown): ReadSessionPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const v = Number(record.v);
  const chapterNumber = Number(record.chapterNumber);
  const startedAt = Number(record.startedAt);
  const nonce = record.nonce;
  if (v !== READ_SESSION_VERSION) return null;
  if (!Number.isFinite(chapterNumber) || chapterNumber < 1) return null;
  if (!Number.isFinite(startedAt) || startedAt <= 0) return null;
  if (typeof nonce !== "string" || nonce.length < 8) return null;
  return {
    v: READ_SESSION_VERSION,
    chapterNumber: Math.floor(chapterNumber),
    startedAt: Math.floor(startedAt),
    nonce,
  };
}

function cookieBaseOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export function defaultUnlockedThrough(): number {
  return FREE_THROUGH_CHAPTER;
}

/** Fail-closed: missing/invalid secret or cookie → free-through only. */
export async function readUnlockedThrough(
  maxChapterNumber: number,
): Promise<number> {
  const secret = getSecret();
  if (!secret) return defaultUnlockedThrough();

  const jar = await cookies();
  const raw = jar.get(UNLOCK_COOKIE_NAME)?.value;
  if (!raw) return defaultUnlockedThrough();

  const payload = decodeSigned(raw, secret, parseUnlockPayload);
  if (!payload) return defaultUnlockedThrough();

  const ageMs = Date.now() - payload.iat * 1000;
  if (ageMs > UNLOCK_MAX_AGE_SEC * 1000 || ageMs < -60_000) {
    return defaultUnlockedThrough();
  }

  return clampUnlockedThrough(payload.unlockedThrough, maxChapterNumber);
}

export function isChapterUnlockedServer(
  chapterNumber: number,
  unlockedThrough: number,
): boolean {
  if (chapterNumber <= FREE_THROUGH_CHAPTER) return true;
  return chapterNumber <= unlockedThrough;
}

export async function writeUnlockCookie(
  unlockedThrough: number,
  maxChapterNumber: number,
): Promise<number> {
  const secret = getSecret();
  const clamped = clampUnlockedThrough(unlockedThrough, maxChapterNumber);
  if (!secret) return defaultUnlockedThrough();

  const payload: UnlockPayload = {
    v: UNLOCK_COOKIE_VERSION,
    unlockedThrough: clamped,
    iat: Math.floor(Date.now() / 1000),
  };

  const jar = await cookies();
  jar.set(
    UNLOCK_COOKIE_NAME,
    encodeSigned(payload, secret),
    cookieBaseOptions(UNLOCK_MAX_AGE_SEC),
  );
  return clamped;
}

export async function readReadSession(): Promise<ReadSessionPayload | null> {
  const secret = getSecret();
  if (!secret) return null;

  const jar = await cookies();
  const raw = jar.get(READ_SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = decodeSigned(raw, secret, parseReadSessionPayload);
  if (!payload) return null;

  const ageMs = Date.now() - payload.startedAt;
  if (ageMs > READ_SESSION_MAX_AGE_SEC * 1000 || ageMs < -60_000) {
    return null;
  }
  return payload;
}

export async function writeReadSession(
  chapterNumber: number,
): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const payload: ReadSessionPayload = {
    v: READ_SESSION_VERSION,
    chapterNumber: Math.floor(chapterNumber),
    startedAt: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  };

  const jar = await cookies();
  jar.set(
    READ_SESSION_COOKIE_NAME,
    encodeSigned(payload, secret),
    cookieBaseOptions(READ_SESSION_MAX_AGE_SEC),
  );
  return true;
}

export async function clearReadSession(): Promise<void> {
  const jar = await cookies();
  jar.set(READ_SESSION_COOKIE_NAME, "", {
    ...cookieBaseOptions(0),
    maxAge: 0,
  });
}

export function hasUnlockSecret(): boolean {
  return getSecret() !== null;
}

export const MIN_SERVER_READ_MS = 20_000;
