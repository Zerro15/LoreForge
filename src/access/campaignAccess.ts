import { FastifyRequest } from "fastify";
import { PoolClient, QueryResultRow } from "pg";
import { CurrentUser, getCurrentUserByToken, readSessionToken } from "../auth/session";
import { queryOne } from "../db";

export type CampaignRole = "owner" | "gm" | "co_gm" | "player" | "viewer";

export type CampaignMember = {
  user_id: string;
  campaign_id: string;
  role: CampaignRole;
  is_active: boolean;
};

export type CurrentMemberPermissions = {
  role: CampaignRole;
  canManageCampaign: boolean;
  canManageLocations: boolean;
  canViewGMSecrets: boolean;
  canApproveGMRequests: boolean;
  canUploadLocationImages: boolean;
  canRollDice: boolean;
  canCreateTravelRequest: boolean;
};

export type CampaignAccess = {
  user: CurrentUser;
  member: CampaignMember;
  permissions: CurrentMemberPermissions;
};

type Queryable = Pick<PoolClient, "query">;

const gmRoles = new Set<CampaignRole>(["owner", "gm", "co_gm"]);

function isCampaignRole(role: string): role is CampaignRole {
  return ["owner", "gm", "co_gm", "player", "viewer"].includes(role);
}

async function queryOneMaybeClient<T extends QueryResultRow>(
  client: Queryable | undefined,
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  if (client) {
    const result = await client.query<T>(text, params);
    return result.rows[0] ?? null;
  }

  return queryOne<T>(text, params);
}

export function canManageCampaign(role: CampaignRole) {
  return role === "owner" || role === "gm";
}

export function canManageLocations(role: CampaignRole) {
  return gmRoles.has(role);
}

export function canViewGMSecrets(role: CampaignRole) {
  return gmRoles.has(role);
}

export function canApproveGMRequests(role: CampaignRole) {
  return gmRoles.has(role);
}

export function canUploadLocationImages(role: CampaignRole) {
  return gmRoles.has(role);
}

export function canRollDice(role: CampaignRole) {
  return role !== "viewer";
}

export function canCreateTravelRequest(role: CampaignRole) {
  return role === "player";
}

export function getPermissions(role: CampaignRole): CurrentMemberPermissions {
  return {
    role,
    canManageCampaign: canManageCampaign(role),
    canManageLocations: canManageLocations(role),
    canViewGMSecrets: canViewGMSecrets(role),
    canApproveGMRequests: canApproveGMRequests(role),
    canUploadLocationImages: canUploadLocationImages(role),
    canRollDice: canRollDice(role),
    canCreateTravelRequest: canCreateTravelRequest(role)
  };
}

export async function getAuthenticatedUser(request: FastifyRequest) {
  const token = readSessionToken(request);

  if (!token) {
    return null;
  }

  return getCurrentUserByToken(token);
}

export async function getCampaignMember(
  userId: string | number,
  campaignId: string | number,
  client?: Queryable
) {
  const member = await queryOneMaybeClient<{
    user_id: string;
    campaign_id: string;
    role: string;
    is_active: boolean;
  }>(
    client,
    `
    SELECT
      cm.user_id::TEXT AS user_id,
      cm.campaign_id::TEXT AS campaign_id,
      cm.role,
      cm.is_active
    FROM campaign_member cm
    WHERE cm.campaign_id = $1
      AND cm.user_id = $2
      AND cm.is_active = TRUE
    LIMIT 1
    `,
    [campaignId, userId]
  );

  if (!member || !isCampaignRole(member.role)) {
    return null;
  }

  return {
    ...member,
    role: member.role
  } satisfies CampaignMember;
}

export async function getCampaignAccess(
  request: FastifyRequest,
  campaignId: string | number,
  client?: Queryable
): Promise<CampaignAccess | null> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return null;
  }

  const member = await getCampaignMember(user.user_id, campaignId, client);

  if (!member) {
    return null;
  }

  return {
    user,
    member,
    permissions: getPermissions(member.role)
  };
}

export async function requireCampaignMember(
  requestOrUserId: FastifyRequest | string | number,
  campaignId: string | number,
  client?: Queryable
) {
  if (typeof requestOrUserId !== "object") {
    const member = await getCampaignMember(requestOrUserId, campaignId, client);

    if (!member) {
      const error = new Error("Campaign membership required");
      error.name = "Forbidden";
      throw error;
    }

    return member;
  }

  const access = await getCampaignAccess(requestOrUserId, campaignId, client);

  if (!access) {
    const error = new Error("Campaign membership required");
    error.name = "Forbidden";
    throw error;
  }

  return access;
}

export async function requireGameMaster(
  requestOrUserId: FastifyRequest | string | number,
  campaignId: string | number,
  client?: Queryable
) {
  const result = await requireCampaignMember(requestOrUserId, campaignId, client);
  const role = "permissions" in result ? result.permissions.role : result.role;

  if (!canManageLocations(role)) {
    const error = new Error("GM permissions required");
    error.name = "Forbidden";
    throw error;
  }

  return result;
}

export async function requireOwnerOrGM(
  requestOrUserId: FastifyRequest | string | number,
  campaignId: string | number,
  client?: Queryable
) {
  const result = await requireCampaignMember(requestOrUserId, campaignId, client);
  const role = "permissions" in result ? result.permissions.role : result.role;

  if (!canManageCampaign(role)) {
    const error = new Error("Owner or GM permissions required");
    error.name = "Forbidden";
    throw error;
  }

  return result;
}

export function requireAuthenticatedUser(user: CurrentUser | null) {
  if (!user) {
    const error = new Error("Not authenticated");
    error.name = "Unauthorized";
    throw error;
  }

  return user;
}

export function canViewVisibility(
  access: CampaignAccess,
  visibility: string | null | undefined,
  options: { targetUserId?: string | number | null } = {}
) {
  if (access.permissions.canViewGMSecrets) {
    return true;
  }

  if (visibility === "gm_only" || visibility === "hidden_until_discovered") {
    return false;
  }

  if (visibility === "player_only") {
    return (
      options.targetUserId != null &&
      String(options.targetUserId) === String(access.user.user_id)
    );
  }

  return visibility === "public" || visibility === "party_only";
}

