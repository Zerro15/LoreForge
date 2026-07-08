import { QueryResultRow } from "pg";

export type VisionDTO = {
  campaign_id: string;
  scene_id: string;
  viewer_user_id: string;
  viewer_role: string;
  can_manage_vision: boolean;
  revealed_data: unknown;
  layers: QueryResultRow[];
};

export function toVisionDTO(input: VisionDTO): VisionDTO {
  return input;
}
