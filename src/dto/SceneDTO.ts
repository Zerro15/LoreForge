import { QueryResultRow } from "pg";

export type SceneDTO = QueryResultRow;

export function toSceneDTO(row: QueryResultRow): SceneDTO {
  return row;
}

export function toSceneListDTO(rows: QueryResultRow[]): SceneDTO[] {
  return rows.map(toSceneDTO);
}
