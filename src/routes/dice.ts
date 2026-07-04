import { FastifyInstance } from "fastify";
import { z } from "zod";
import { canRollDice, getCampaignAccess } from "../access/campaignAccess";
import { queryOne, withTransaction } from "../db";

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

export async function diceRoutes(app: FastifyInstance) {
  app.post("/api/campaigns/:campaignId/dice-roll", async (request, reply) => {
    const { campaignId } = campaignParamsSchema.parse(request.params);
    const access = await getCampaignAccess(request, campaignId);

    if (!access) {
      return reply.code(403).send({ error: "Campaign membership required" });
    }

    if (!canRollDice(access.member.role)) {
      return reply.code(403).send({ error: "Viewer role cannot roll dice" });
    }

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
          VALUES ($1, 'Main chat', 'campaign')
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
        [access.user.user_id]
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
          access.user.user_id,
          body.characterId ?? null,
          `${actorName} rolls ${body.formula}.`,
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
          access.user.user_id,
          body.characterId ?? null,
          `${actorName} rolls ${body.formula}: ${result.total}.`,
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
