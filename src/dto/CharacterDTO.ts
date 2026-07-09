import { QueryResultRow } from "pg";
import type { CampaignAccess } from "../access/campaignAccess";
import {
  canViewCharacterSecrets,
  canViewPrivateNotes
} from "../domain/character/rules";

export type CharacterDTO = QueryResultRow;

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export function toCharacterDTO(
  row: QueryResultRow,
  access: CampaignAccess
): CharacterDTO {
  const ownerUserId = row.owner_user_id ? String(row.owner_user_id) : null;
  const role = access.permissions.role;
  const actorUserId = String(access.user.user_id);
  const showPrivateNotes = canViewPrivateNotes(role, actorUserId, ownerUserId);
  const showGMNotes = canViewCharacterSecrets(role);

  return {
    character_id: String(row.character_id),
    campaign_id: String(row.campaign_id),
    owner_user_id: ownerUserId,
    created_by_user_id: row.created_by_user_id
      ? String(row.created_by_user_id)
      : null,
    current_location_id: row.current_location_id
      ? String(row.current_location_id)
      : null,
    current_scene_id: row.current_scene_id ? String(row.current_scene_id) : null,
    avatar_attachment_id: row.avatar_attachment_id
      ? String(row.avatar_attachment_id)
      : null,
    name: row.name,
    title: row.title,
    public_description: row.public_description,
    private_notes: showPrivateNotes ? row.private_notes : null,
    gm_notes: showGMNotes ? row.gm_notes : null,
    secret_description: showGMNotes ? row.secret_description : null,
    notes: showPrivateNotes ? row.notes : null,
    status_text: row.status_text,
    visibility: row.visibility,
    status: row.status,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner: row.owner,
    stats: asArray(row.stats),
    resources: asArray(row.resources),
    abilities: asArray(row.abilities)
  };
}

export function toCharacterListDTO(
  rows: QueryResultRow[],
  access: CampaignAccess
): CharacterDTO[] {
  return rows.map((row) => toCharacterDTO(row, access));
}
