import { QueryResultRow } from "pg";

export type NPCDTO = QueryResultRow;
export type TagDTO = QueryResultRow;

export function toNPCDTO(row: QueryResultRow): NPCDTO {
  return row;
}

export function toNPCListDTO(rows: QueryResultRow[]): NPCDTO[] {
  return rows.map(toNPCDTO);
}

export function toTagDTO(row: QueryResultRow): TagDTO {
  return row;
}

export function toTagListDTO(rows: QueryResultRow[]): TagDTO[] {
  return rows.map(toTagDTO);
}
