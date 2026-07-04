import { randomUUID } from "node:crypto";
import path from "node:path";
import { PoolClient } from "pg";

export const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
export const uploadRoot = path.resolve(process.cwd(), "uploads");

export class LocationService {
  static async ensureCampaignChat(client: PoolClient, campaignId: number) {
    const existing = await client.query<{ chat_id: number }>(
      `
      SELECT chat_id
      FROM campaign_chat
      WHERE campaign_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      `,
      [campaignId]
    );

    if (existing.rows[0]) {
      return existing.rows[0].chat_id;
    }

    const inserted = await client.query<{ chat_id: number }>(
      `
      INSERT INTO campaign_chat (campaign_id, name, chat_type)
      VALUES ($1, 'Main chat', 'campaign')
      RETURNING chat_id
      `,
      [campaignId]
    );

    return inserted.rows[0].chat_id;
  }

  static async ensureSystemSessionLog(
    client: PoolClient,
    campaignId: number,
    userId: string
  ) {
    const existing = await client.query<{ session_log_id: number }>(
      `
      SELECT session_log_id
      FROM session_log
      WHERE campaign_id = $1
      ORDER BY session_date DESC NULLS LAST, created_at DESC
      LIMIT 1
      `,
      [campaignId]
    );

    if (existing.rows[0]) {
      return existing.rows[0].session_log_id;
    }

    const inserted = await client.query<{ session_log_id: number }>(
      `
      INSERT INTO session_log (
        campaign_id,
        title,
        summary_public,
        visibility,
        created_by_user_id,
        session_date
      )
      VALUES ($1, 'System location journal', 'Location management events.', 'party_only', $2, CURRENT_DATE)
      RETURNING session_log_id
      `,
      [campaignId, userId]
    );

    return inserted.rows[0].session_log_id;
  }

  static async writeLocationEvent(
    client: PoolClient,
    options: {
      campaignId: number;
      userId: string;
      eventType: string;
      title: string;
      description?: string | null;
      locationId?: number | null;
      chatMessage?: string | null;
      visibility?: string;
    }
  ) {
    const sessionLogId = await LocationService.ensureSystemSessionLog(
      client,
      options.campaignId,
      options.userId
    );

    await client.query(
      `
      INSERT INTO session_event (
        session_log_id,
        campaign_id,
        event_type,
        title,
        description,
        related_entity_type,
        related_entity_id,
        visibility
      )
      VALUES ($1, $2, $3, $4, $5, 'location', $6, $7)
      `,
      [
        sessionLogId,
        options.campaignId,
        options.eventType,
        options.title,
        options.description ?? null,
        options.locationId ?? null,
        options.visibility ?? "party_only"
      ]
    );

    if (options.chatMessage) {
      const chatId = await LocationService.ensureCampaignChat(
        client,
        options.campaignId
      );

      await client.query(
        `
        INSERT INTO chat_message (
          chat_id,
          sender_user_id,
          body,
          message_type,
          visibility,
          metadata_json
        )
        VALUES ($1, $2, $3, 'system', $4, $5)
        `,
        [
          chatId,
          options.userId,
          options.chatMessage,
          options.visibility ?? "party_only",
          JSON.stringify({
            eventType: options.eventType,
            locationId: options.locationId ?? null
          })
        ]
      );
    }
  }

  static toNullableDate(value: string | null | undefined) {
    return value ? new Date(value).toISOString() : null;
  }

  static safeUploadedFilename(originalName: string) {
    const extension = path.extname(originalName).toLowerCase();
    const allowed = new Set([".png", ".jpg", ".jpeg", ".webp"]);
    const finalExtension = allowed.has(extension) ? extension : ".img";

    return `${randomUUID()}${finalExtension}`;
  }

  static getMimeTypeByPath(filePath: string) {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === ".png") {
      return "image/png";
    }

    if (extension === ".webp") {
      return "image/webp";
    }

    if (extension === ".jpg" || extension === ".jpeg") {
      return "image/jpeg";
    }

    return "application/octet-stream";
  }

  static async setActiveLocation(
    client: PoolClient,
    campaignId: number,
    locationId: number
  ) {
    await client.query(
      `
      UPDATE campaign
      SET active_location_id = $1,
          updated_at = NOW()
      WHERE campaign_id = $2
      `,
      [locationId, campaignId]
    );
  }
}
