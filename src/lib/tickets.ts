import "server-only";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Entrance tickets. Records live in NOTEBOOKS_KV under `ticket:<sha256 of code>`
 * (manage them with scripts/tickets.mjs). Redeeming a ticket sets a signed
 * httpOnly cookie; every protected route and page re-checks that cookie and the
 * KV record, so expiry and revocation are decided here and never by the client.
 */

const KEY_PREFIX = "ticket:";
const COOKIE_NAME = "lf_ticket";
const MAX_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CODE_LENGTH = 200;
const MIN_SECRET_LENGTH = 32;

interface TicketRecord {
  label: string;
  /** Lifetime counted from first redemption; null means it never expires. */
  durationDays: number | null;
  createdAt: string;
  firstUsedAt?: string;
  expiresAt?: string;
  revoked?: boolean;
}

interface SessionPayload {
  ticketId: string;
  exp: number;
}

function ticketId(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function isUsable(record: TicketRecord | null, now: number): record is TicketRecord {
  if (!record || record.revoked) return false;
  return !record.expiresAt || Date.parse(record.expiresAt) > now;
}

function ticketStore(): KVNamespace {
  return getCloudflareContext().env.NOTEBOOKS_KV;
}

async function signingKey(): Promise<CryptoKey> {
  const secret = getCloudflareContext().env.TICKET_SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error("Entrance tickets are not configured on this server.");
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: SessionPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(body)
  );
  return `${body}.${Buffer.from(signature).toString("base64url")}`;
}

async function verify(token: string): Promise<SessionPayload | null> {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    new Uint8Array(Buffer.from(signature, "base64url")),
    new TextEncoder().encode(body)
  );
  if (!valid) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (typeof payload?.ticketId !== "string" || typeof payload?.exp !== "number") {
    return null;
  }
  return payload;
}

/**
 * Validates a code and sets the session cookie. Returns false for an unknown,
 * revoked or expired ticket. The clock of a timed ticket starts on first use
 * and is stored in KV, so clearing the browser cannot restart it.
 */
export async function redeemTicket(rawCode: string, hostname: string): Promise<boolean> {
  const code = rawCode.trim();
  if (!code || code.length > MAX_CODE_LENGTH) return false;

  const id = ticketId(code);
  const store = ticketStore();
  const record = await store.get<TicketRecord>(`${KEY_PREFIX}${id}`, "json");
  const now = Date.now();
  if (!isUsable(record, now)) return false;

  if (record.durationDays !== null && !record.expiresAt) {
    record.firstUsedAt = new Date(now).toISOString();
    record.expiresAt = new Date(
      now + record.durationDays * 24 * 60 * 60 * 1000
    ).toISOString();
    await store.put(`${KEY_PREFIX}${id}`, JSON.stringify(record));
  }

  const ticketExpiry = record.expiresAt ? Date.parse(record.expiresAt) : Infinity;
  const exp = Math.min(ticketExpiry, now + MAX_SESSION_MS);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await sign({ ticketId: id, exp }), {
    httpOnly: true,
    secure: hostname !== "localhost" && hostname !== "127.0.0.1",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
  return true;
}

/** True when the request carries a valid, unexpired, unrevoked ticket session. */
export async function hasTicketSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  let session: SessionPayload | null;
  try {
    session = await verify(token);
  } catch (error) {
    console.error("Ticket session could not be verified:", error);
    return false;
  }
  const now = Date.now();
  if (!session || session.exp <= now) return false;

  const record = await ticketStore().get<TicketRecord>(
    `${KEY_PREFIX}${session.ticketId}`,
    { type: "json", cacheTtl: 60 }
  );
  return isUsable(record, now);
}

/** Route handler guard: returns a 401 to send back, or null to continue. */
export async function requireTicket(): Promise<NextResponse | null> {
  if (await hasTicketSession()) return null;
  return NextResponse.json(
    { error: "Your entrance ticket is missing or has expired. Reload the page to enter it." },
    { status: 401 }
  );
}
