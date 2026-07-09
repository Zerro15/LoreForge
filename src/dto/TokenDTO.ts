import { QueryResultRow } from "pg";

export type TokenDTO = QueryResultRow;

export function toTokenDTO(row: QueryResultRow): TokenDTO {
  return row;
}

export function toTokenListDTO(rows: QueryResultRow[]): TokenDTO[] {
  return rows.map(toTokenDTO);
}
