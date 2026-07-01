import { createHash, randomBytes } from "node:crypto";
import { FastifyReply, FastifyRequest } from "fastify";
import { PoolClient } from "pg";
import { queryOne } from "../db";

const DEFAULT_SESSION_DAYS = 30;

export type CurrentUser = {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

export function getAuthCookieName() {
  return process.env.AUTH_COOKIE_NAME ?? "loreforge_session";
}

export function getSessionDays() {
  const parsed = Number(process.env.AUTH_SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_DAYS;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function getSessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + getSessionDays());
  return expiresAt;
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.setCookie(getAuthCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    signed: true,
    maxAge: getSessionDays() * 24 * 60 * 60
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(getAuthCookieName(), {
    path: "/"
  });
}

export function readSessionToken(request: FastifyRequest) {
  const rawCookie = request.cookies[getAuthCookieName()];

  if (!rawCookie) {
    return null;
  }

  const unsigned = request.unsignCookie(rawCookie);

  if (!unsigned.valid || !unsigned.value) {
    return null;
  }

  return unsigned.value;
}

export async function createSession(
  client: PoolClient,
  userId: string | number,
  request: FastifyRequest
) {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiresAt();
  const ipAddress = request.ip;
  const userAgent = request.headers["user-agent"] ?? null;

  await client.query(
    `
    INSERT INTO auth_session (
      user_id,
      session_token_hash,
      ip_address,
      user_agent,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, tokenHash, ipAddress, userAgent, expiresAt]
  );

  return token;
}

export async function revokeSession(token: string) {
  await queryOne(
    `
    UPDATE auth_session
    SET revoked_at = NOW()
    WHERE session_token_hash = $1 AND revoked_at IS NULL
    RETURNING auth_session_id
    `,
    [hashSessionToken(token)]
  );
}

export async function getCurrentUserByToken(token: string) {
  return queryOne<CurrentUser>(
    `
    UPDATE auth_session s
    SET last_seen_at = NOW()
    FROM app_user u
    JOIN auth_account aa ON aa.user_id = u.user_id
    WHERE
      s.user_id = u.user_id
      AND s.session_token_hash = $1
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
      AND aa.is_active = TRUE
    RETURNING
      u.user_id::TEXT AS user_id,
      aa.email,
      u.display_name,
      NULL::TEXT AS avatar_url
    `,
    [hashSessionToken(token)]
  );
}
