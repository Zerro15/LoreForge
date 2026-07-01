import bcrypt from "bcryptjs";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { queryOne, withTransaction } from "../db";
import {
  clearSessionCookie,
  createSession,
  getCurrentUserByToken,
  readSessionToken,
  revokeSession,
  setSessionCookie
} from "../auth/session";

const registerBodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
  displayName: z.string().trim().min(2)
});

const loginBodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

type AuthAccountRow = {
  user_id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  display_name: string;
};

type CurrentUserRow = {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const body = registerBodySchema.parse(request.body);

    const existing = await queryOne(
      "SELECT auth_account_id FROM auth_account WHERE email = $1",
      [body.email]
    );

    if (existing) {
      return reply.code(409).send({
        error: "Email is already registered"
      });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const created = await withTransaction(async (client) => {
      const userResult = await client.query<CurrentUserRow>(
        `
        INSERT INTO app_user (username, display_name)
        VALUES ($1, $2)
        RETURNING user_id::TEXT, display_name
        `,
        [body.email, body.displayName]
      );

      const user = userResult.rows[0];

      await client.query(
        `
        INSERT INTO user_profile (user_id, full_name)
        VALUES ($1, $2)
        `,
        [user.user_id, body.displayName]
      );

      const accountResult = await client.query<{ email: string }>(
        `
        INSERT INTO auth_account (user_id, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING email
        `,
        [user.user_id, body.email, passwordHash]
      );

      const token = await createSession(client, user.user_id, request);

      return {
        token,
        user: {
          user_id: user.user_id,
          email: accountResult.rows[0].email,
          display_name: user.display_name,
          avatar_url: null
        }
      };
    });

    setSessionCookie(reply, created.token);

    return created.user;
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const account = await queryOne<AuthAccountRow>(
      `
      SELECT
        aa.user_id::TEXT,
        aa.email,
        aa.password_hash,
        aa.is_active,
        u.display_name
      FROM auth_account aa
      JOIN app_user u ON u.user_id = aa.user_id
      WHERE aa.email = $1
      `,
      [body.email]
    );

    if (!account || !account.is_active) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(
      body.password,
      account.password_hash
    );

    if (!isPasswordValid) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    const created = await withTransaction(async (client) => {
      await client.query(
        "UPDATE auth_account SET last_login_at = NOW() WHERE user_id = $1",
        [account.user_id]
      );

      const token = await createSession(client, account.user_id, request);

      return {
        token,
        user: {
          user_id: account.user_id,
          email: account.email,
          display_name: account.display_name,
          avatar_url: null
        }
      };
    });

    setSessionCookie(reply, created.token);

    return created.user;
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const token = readSessionToken(request);

    if (token) {
      await revokeSession(token);
    }

    clearSessionCookie(reply);

    return { ok: true };
  });

  app.get("/api/auth/me", async (request, reply) => {
    const token = readSessionToken(request);

    if (!token) {
      return reply.code(401).send({ error: "Not authenticated" });
    }

    const user = await getCurrentUserByToken(token);

    if (!user) {
      clearSessionCookie(reply);
      return reply.code(401).send({ error: "Not authenticated" });
    }

    return user;
  });
}
