import { QueryResultRow } from "pg";

export type CampaignDTO = QueryResultRow;

export function toCampaignDTO(row: QueryResultRow): CampaignDTO {
  return row;
}

export function toCampaignListDTO(rows: QueryResultRow[]): CampaignDTO[] {
  return rows.map(toCampaignDTO);
}
