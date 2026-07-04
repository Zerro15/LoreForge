export type CampaignRole = "owner" | "gm" | "co_gm" | "player" | "viewer";

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

const gmRoles = new Set<CampaignRole>(["owner", "gm", "co_gm"]);

export function isCampaignRole(role: string): role is CampaignRole {
  return ["owner", "gm", "co_gm", "player", "viewer"].includes(role);
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
