import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query, queryOne, withTransaction } from "../db";

const campaignParamsSchema = z.object({
  campaignId: z.coerce.number().int().positive()
});

const visibilitySchema = z.enum([
  "public",
  "party_only",
  "player_only",
  "gm_only",
  "hidden_until_discovered"
]);

const diceRollBodySchema = z.object({
  userId: z.coerce.number().int().positive(),
  characterId: z.coerce.number().int().positive().optional(),
  formula: z.string().trim().regex(/^\d+d\d+([+-]\d+)?$/i),
  visibility: visibilitySchema.default("public")
});

type DiceFormula = {
  diceCount: number;
  diceType: number;
  modifier: number;
};

function parseDiceFormula(formula: string): DiceFormula {
  const match = /^(\d+)d(\d+)([+-]\d+)?$/i.exec(formula.trim());

  if (!match) {
    throw new Error("Unsupported dice formula");
  }

  const diceCount = Number(match[1]);
  const diceType = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (diceCount < 1 || diceCount > 20 || diceType < 2 || diceType > 1000) {
    throw new Error("Dice formula is out of supported range");
  }

  return { diceCount, diceType, modifier };
}

function rollDice({ diceCount, diceType, modifier }: DiceFormula) {
  const rolls = Array.from(
    { length: diceCount },
    () => Math.floor(Math.random() * diceType) + 1
  );
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return { rolls, total };
}

export async function campaignsRoutes(app: FastifyInstance) {
  app.get("/api/campaigns", async () => {
    return query(
      `
      SELECT
        c.campaign_id,
        c.name AS title,
        c.description,
        c.status,
        c.created_at,
        c.updated_at,
        wp.name AS active_plugin_name,
        COUNT(DISTINCT cm.user_id)::INT AS members_count,
        COUNT(DISTINCT ch.character_id)::INT AS characters_count,
        COUNT(DISTINCT n.npc_id)::INT AS npcs_count,
        COUNT(DISTINCT l.location_id)::INT AS locations_count
      FROM campaign c
      LEFT JOIN campaign_member cm ON cm.campaign_id = c.campaign_id AND cm.is_active = TRUE
      LEFT JOIN "character" ch ON ch.campaign_id = c.campaign_id
      LEFT JOIN npc n ON n.campaign_id = c.campaign_id
      LEFT JOIN location l ON l.campaign_id = c.campaign_id
      LEFT JOIN campaign_plugin cp ON cp.campaign_id = c.campaign_id AND cp.is_active = TRUE
      LEFT JOIN world_plugin wp ON wp.world_plugin_id = cp.world_plugin_id
      GROUP BY c.campaign_id, wp.name
      ORDER BY c.created_at DESC
      `
    );
  });

  app.get("/api/campaigns/:campaignId/dashboard", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);

    const campaign = await queryOne(
      `
      SELECT
        c.campaign_id,
        c.name AS title,
        c.setting_name,
        c.description,
        c.status,
        c.public_journal,
        c.gm_journal,
        c.created_at,
        c.updated_at
      FROM campaign c
      WHERE c.campaign_id = $1
      `,
      [campaignId]
    );

    if (!campaign) {
      return reply.code(404).send({ error: "Campaign not found" });
    }

    const [
      activePlugin,
      members,
      stats,
      characters,
      npcs,
      locations,
      recentMessages,
      recentDiceRolls,
      recentSessionEvents,
      investigations
    ] = await Promise.all([
      queryOne(
        `
        SELECT
          wp.world_plugin_id,
          wp.name,
          wp.slug,
          wp.description,
          cp.campaign_plugin_id,
          cp.is_active,
          cp.config_json
        FROM campaign_plugin cp
        JOIN world_plugin wp ON wp.world_plugin_id = cp.world_plugin_id
        WHERE cp.campaign_id = $1 AND cp.is_active = TRUE
        ORDER BY cp.created_at DESC
        LIMIT 1
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          cm.user_id,
          u.username,
          u.display_name,
          cm.role,
          cm.is_active,
          cm.joined_at
        FROM campaign_member cm
        JOIN app_user u ON u.user_id = cm.user_id
        WHERE cm.campaign_id = $1
        ORDER BY cm.role, u.display_name
        `,
        [campaignId]
      ),
      queryOne(
        `
        SELECT
          (SELECT COUNT(*)::INT FROM "character" WHERE campaign_id = $1) AS "charactersCount",
          (SELECT COUNT(*)::INT FROM npc WHERE campaign_id = $1) AS "npcsCount",
          (SELECT COUNT(*)::INT FROM location WHERE campaign_id = $1) AS "locationsCount",
          (SELECT COUNT(*)::INT FROM investigation WHERE campaign_id = $1) AS "investigationsCount",
          (SELECT COUNT(*)::INT FROM session_event WHERE campaign_id = $1) AS "sessionEventsCount"
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          ch.character_id,
          ch.name,
          ch.public_description,
          ch.status_text,
          u.display_name AS owner_display_name
        FROM "character" ch
        JOIN app_user u ON u.user_id = ch.owner_user_id
        WHERE ch.campaign_id = $1
        ORDER BY ch.name
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          npc_id,
          name,
          title,
          public_description,
          status_text,
          visibility
        FROM npc
        WHERE campaign_id = $1
        ORDER BY name
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          location_id,
          parent_location_id,
          name,
          location_type,
          public_description,
          state_text,
          visibility
        FROM location
        WHERE campaign_id = $1
        ORDER BY parent_location_id NULLS FIRST, name
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          m.message_id,
          m.body AS content,
          m.message_type,
          m.visibility,
          m.created_at,
          u.display_name AS sender_user,
          ch.name AS sender_character,
          n.name AS sender_npc
        FROM chat_message m
        JOIN campaign_chat cc ON cc.chat_id = m.chat_id
        LEFT JOIN app_user u ON u.user_id = m.sender_user_id
        LEFT JOIN "character" ch ON ch.character_id = m.sender_character_id
        LEFT JOIN npc n ON n.npc_id = m.sender_npc_id
        WHERE cc.campaign_id = $1
        ORDER BY m.created_at DESC
        LIMIT 10
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          roll_id,
          description,
          expression,
          visibility,
          result_total,
          result_details,
          created_at
        FROM dice_roll
        WHERE campaign_id = $1
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          session_event_id,
          event_type,
          title,
          description,
          related_entity_type,
          related_entity_id,
          visibility,
          created_at
        FROM session_event
        WHERE campaign_id = $1
        ORDER BY created_at DESC
        LIMIT 10
        `,
        [campaignId]
      ),
      query(
        `
        SELECT
          investigation_id,
          name,
          description,
          status,
          visibility
        FROM investigation
        WHERE campaign_id = $1
        ORDER BY name
        `,
        [campaignId]
      )
    ]);

    return {
      campaign,
      activePlugin,
      members,
      stats,
      characters,
      npcs,
      locations,
      recentMessages,
      recentDiceRolls,
      recentSessionEvents,
      investigations
    };
  });

  app.get("/api/campaigns/:campaignId/npcs", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);

    return query(
      `
      SELECT
        n.npc_id,
        n.name,
        n.title,
        n.public_description,
        n.secret_description,
        n.gm_secrets,
        n.campaign_journal,
        n.status_text,
        n.visibility,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'tag_id', t.tag_id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.tag_id IS NOT NULL),
          '[]'
        ) AS tags,
        'Access control is planned for GM-only fields' AS access_control_note
      FROM npc n
      LEFT JOIN entity_tag et ON et.entity_type = 'npc' AND et.entity_id = n.npc_id
      LEFT JOIN tag t ON t.tag_id = et.tag_id
      WHERE n.campaign_id = $1
      GROUP BY n.npc_id
      ORDER BY n.name
      `,
      [campaignId]
    );
  });

  app.get("/api/campaigns/:campaignId/locations", async (request) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);

    return query(
      `
      SELECT
        location_id,
        parent_location_id,
        name,
        location_type,
        public_description,
        secret_description,
        state_text,
        map_url,
        grid_enabled,
        visibility,
        created_at,
        updated_at
      FROM location
      WHERE campaign_id = $1
      ORDER BY parent_location_id NULLS FIRST, name
      `,
      [campaignId]
    );
  });

  app.post("/api/campaigns/:campaignId/dice-roll", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const body = diceRollBodySchema.parse(request.body);
    const parsedFormula = parseDiceFormula(body.formula);
    const result = rollDice(parsedFormula);

    const campaign = await queryOne(
      "SELECT campaign_id FROM campaign WHERE campaign_id = $1",
      [campaignId]
    );

    if (!campaign) {
      return reply.code(404).send({ error: "Campaign not found" });
    }

    const inserted = await withTransaction(async (client) => {
      let chat = await client.query<{ chat_id: number }>(
        `
        SELECT chat_id
        FROM campaign_chat
        WHERE campaign_id = $1
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [campaignId]
      );

      if (!chat.rows[0]) {
        chat = await client.query<{ chat_id: number }>(
          `
          INSERT INTO campaign_chat (campaign_id, name, chat_type)
          VALUES ($1, 'Основной чат', 'campaign')
          RETURNING chat_id
          `,
          [campaignId]
        );
      }

      const chatId = chat.rows[0].chat_id;

      const character = body.characterId
        ? await client.query<{ name: string }>(
            `
            SELECT name
            FROM "character"
            WHERE character_id = $1 AND campaign_id = $2
            `,
            [body.characterId, campaignId]
          )
        : null;

      const user = await client.query<{ display_name: string }>(
        "SELECT display_name FROM app_user WHERE user_id = $1",
        [body.userId]
      );

      if (!user.rows[0]) {
        throw new Error("User not found");
      }

      if (body.characterId && !character?.rows[0]) {
        throw new Error("Character not found in campaign");
      }

      const actorName = character?.rows[0]?.name ?? user.rows[0].display_name;

      const roll = await client.query(
        `
        INSERT INTO dice_roll (
          campaign_id,
          chat_id,
          actor_user_id,
          actor_character_id,
          description,
          expression,
          dice_count,
          dice_type,
          modifier,
          visibility,
          result_total,
          result_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        `,
        [
          campaignId,
          chatId,
          body.userId,
          body.characterId ?? null,
          `${actorName} бросает ${body.formula}.`,
          body.formula,
          parsedFormula.diceCount,
          parsedFormula.diceType,
          parsedFormula.modifier,
          body.visibility,
          result.total,
          JSON.stringify({
            rolls: result.rolls,
            modifier: parsedFormula.modifier
          })
        ]
      );

      const message = await client.query(
        `
        INSERT INTO chat_message (
          chat_id,
          sender_user_id,
          sender_character_id,
          body,
          message_type,
          visibility,
          metadata_json,
          dice_roll_id
        )
        VALUES ($1, $2, $3, $4, 'dice', $5, $6, $7)
        RETURNING *
        `,
        [
          chatId,
          body.userId,
          body.characterId ?? null,
          `${actorName} бросает ${body.formula}: ${result.total}.`,
          body.visibility,
          JSON.stringify({
            expression: body.formula,
            rolls: result.rolls,
            modifier: parsedFormula.modifier,
            total: result.total
          }),
          roll.rows[0].roll_id
        ]
      );

      return {
        roll: roll.rows[0],
        message: message.rows[0]
      };
    });

    return inserted;
  });
}
