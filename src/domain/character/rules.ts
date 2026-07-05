import type { CampaignRole } from "../access/permissions";

const gmRoles = new Set<CampaignRole>(["owner", "gm", "co_gm"]);

export function canManageAnyCharacter(role: CampaignRole) {
  return gmRoles.has(role);
}

export function canCreateCharacter(role: CampaignRole) {
  return role !== "viewer";
}

export function canViewCharacterSecrets(role: CampaignRole) {
  return gmRoles.has(role);
}

export function canEditCharacter(
  role: CampaignRole,
  actorUserId: string,
  ownerUserId: string | null
) {
  return canManageAnyCharacter(role) || ownerUserId === actorUserId;
}

export function canArchiveCharacter(
  role: CampaignRole,
  actorUserId: string,
  ownerUserId: string | null
) {
  return canEditCharacter(role, actorUserId, ownerUserId);
}

export function canViewPrivateNotes(
  role: CampaignRole,
  actorUserId: string,
  ownerUserId: string | null
) {
  return canManageAnyCharacter(role) || ownerUserId === actorUserId;
}
