export type Visibility =
  | "public"
  | "party_only"
  | "player_only"
  | "gm_only"
  | "hidden_until_discovered";

export type CampaignSummary = {
  campaign_id: string;
  title: string;
  description: string | null;
  status: string;
  visibility?: "private" | "public";
  max_players?: number;
  created_at: string;
  updated_at: string;
  active_plugin_name: string | null;
  members_count: number;
  characters_count: number;
  npcs_count: number;
  locations_count: number;
};

export type CurrentUser = {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

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

export type Dashboard = {
  campaign: {
    campaign_id: string;
    title: string;
    setting_name: string | null;
    description: string | null;
    status: string;
    public_journal: string | null;
    gm_journal: string | null;
  };
  activePlugin: {
    name: string;
    slug: string;
    description: string | null;
  } | null;
  currentMember: CurrentMemberPermissions;
  members: Array<{
    user_id: string;
    username: string;
    display_name: string;
    role: string;
  }>;
  stats: {
    charactersCount: number;
    npcsCount: number;
    locationsCount: number;
    investigationsCount: number;
    sessionEventsCount: number;
  };
  characters: Array<CharacterPreview>;
  npcs: Array<NpcPreview>;
  locations: Array<LocationPreview>;
  recentMessages: Array<ChatMessage>;
  recentDiceRolls: Array<DiceRoll>;
  recentSessionEvents: Array<SessionEvent>;
  investigations: Array<Investigation>;
};

export type Character = {
  character_id: string;
  campaign_id?: string;
  owner_user_id: string | null;
  created_by_user_id?: string | null;
  current_location_id?: string | null;
  current_scene_id?: string | null;
  avatar_attachment_id?: string | null;
  name: string;
  title: string | null;
  public_description: string | null;
  private_notes: string | null;
  gm_notes: string | null;
  secret_description: string | null;
  notes: string | null;
  status_text: string | null;
  visibility: Visibility;
  status: "active" | "archived";
  archived_at: string | null;
  created_at?: string;
  updated_at?: string;
  owner: {
    user_id: string;
    username: string;
    display_name: string;
  } | null;
  stats: Array<{ name: string; value: number }>;
  resources: Array<{
    name: string;
    current_value: number;
    max_value: number | null;
  }>;
  abilities: Array<{
    name: string;
    description: string | null;
    ability_type: string;
    is_unlocked: boolean;
    uses_left: number | null;
    cooldown: number | null;
  }>;
};

export type CharacterPreview = Pick<
  Character,
  "character_id" | "name" | "public_description" | "status_text"
> & {
  owner_display_name: string;
};

export type NpcPreview = {
  npc_id: string;
  campaign_id?: string;
  name: string;
  title: string | null;
  public_description: string | null;
  status_text: string | null;
  visibility: Visibility;
  status?: "active" | "archived";
  archived_at?: string | null;
};

export type Npc = NpcPreview & {
  secret_description: string | null;
  gm_secrets: string | null;
  campaign_journal: string | null;
  tags: Array<{ tag_id: number; name: string; color: string | null }>;
};

export type Tag = {
  tag_id: number;
  campaign_id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export type LocationPreview = {
  location_id: string;
  campaign_id?: string;
  parent_location_id: string | null;
  name: string;
  location_type: string | null;
  public_description: string | null;
  state_text: string | null;
  visibility: Visibility;
  status?: "active" | "hidden" | "archived";
  is_event_location?: boolean;
  expires_at?: string | null;
  archived_at?: string | null;
  cover_attachment_id?: string | null;
  is_active_location?: boolean;
  has_player_access?: boolean;
  cover_attachment?: Attachment | null;
};

export type Location = LocationPreview & {
  secret_description: string | null;
  children?: Array<{
    location_id: string;
    name: string;
    visibility: Visibility;
    status: string;
  }>;
  parent?: {
    location_id: string;
    name: string;
  } | null;
};

export type Attachment = {
  attachment_id: string;
  filename: string;
  mime_type: string | null;
  file_size_bytes: string | number | null;
  public_url: string | null;
  metadata?: unknown;
};

export type DiceRoll = {
  roll_id: string;
  description: string | null;
  expression: string;
  visibility: Visibility;
  result_total: number | null;
  result_details: unknown;
  created_at: string;
};

export type ChatMessage = {
  message_id: string;
  message_type: string;
  content: string;
  visibility: Visibility;
  created_at: string;
  sender?: {
    display_name?: string | null;
    character_name?: string | null;
    npc_name?: string | null;
  };
  sender_user?: string | null;
  sender_character?: string | null;
  sender_npc?: string | null;
  dice_roll?: DiceRoll | null;
};

export type SessionEvent = {
  session_event_id: string | number;
  event_type: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  created_at: string;
};

export type SessionLog = {
  session_log_id: string;
  title: string;
  summary_public: string | null;
  summary_private: string | null;
  session_date: string | null;
  visibility: Visibility;
  events: SessionEvent[];
};

export type Investigation = {
  investigation_id: string;
  name: string;
  description: string | null;
  status: string;
  visibility: Visibility;
};

export type WorldPlugin = {
  world_plugin_id: string;
  name: string;
  slug: string;
  description: string | null;
  features: Array<{
    plugin_feature_id: number;
    feature_type: string;
    name: string;
    description: string | null;
  }>;
};

export type GMRequest = {
  request_id: string;
  request_type: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "applied";
  title: string;
  message: string | null;
  gm_comment: string | null;
  created_at: string;
  resolved_at: string | null;
  requester: {
    user_id: string;
    display_name: string;
    username: string;
  };
  character: {
    character_id: string;
    name: string;
  } | null;
  target_location: {
    location_id: string;
    name: string;
    visibility: Visibility;
    status: string;
  };
};
