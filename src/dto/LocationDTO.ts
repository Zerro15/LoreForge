import { QueryResultRow } from "pg";

export type LocationDTO = QueryResultRow;
export type GMRequestDTO = QueryResultRow;

export function toLocationDTO(row: QueryResultRow): LocationDTO {
  return row;
}

export function toLocationListDTO(rows: QueryResultRow[]): LocationDTO[] {
  return rows.map(toLocationDTO);
}

export function toGMRequestDTO(row: QueryResultRow): GMRequestDTO {
  return row;
}

export function toGMRequestListDTO(rows: QueryResultRow[]): GMRequestDTO[] {
  return rows.map(toGMRequestDTO);
}
