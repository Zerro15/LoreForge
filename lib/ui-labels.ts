import type { CampaignRole, Visibility } from "./types";

export const visibilityLabels: Record<Visibility, string> = {
  public: "Открытый",
  party_only: "Для группы",
  player_only: "Только игроку",
  gm_only: "Только ГМу",
  hidden_until_discovered: "Скрыт до обнаружения"
};

export const roleLabels: Record<CampaignRole, string> = {
  owner: "Владелец",
  gm: "ГМ",
  co_gm: "Со-ГМ",
  player: "Игрок",
  viewer: "Наблюдатель"
};

export const statusLabels: Record<string, string> = {
  active: "Активный",
  hidden: "Скрытый",
  archived: "Архивный",
  draft: "Черновик"
};

export const requestStatusLabels: Record<string, string> = {
  pending: "Ожидает решения",
  approved: "Одобрено",
  rejected: "Отклонено",
  cancelled: "Отменено",
  applied: "Применено"
};

export const messageTypeLabels: Record<string, string> = {
  text: "Сообщение",
  system: "Система",
  dice: "Бросок кубиков",
  note: "Заметка"
};

export const sessionEventTypeLabels: Record<string, string> = {
  arrival: "Прибытие",
  conversation: "Разговор",
  ability: "Способность",
  clue_found: "Найдена зацепка",
  sighting: "Наблюдение",
  travel: "Переход",
  location_access: "Доступ к локации"
};

export const locationTypeLabels: Record<string, string> = {
  location: "Локация",
  district: "Район",
  building: "Здание",
  room: "Комната",
  scene: "Сцена"
};

export const scenePresentationModeLabels: Record<string, string> = {
  tactical_map: "Тактическая карта",
  illustration: "Иллюстрация / вид сцены"
};

export const imageFitLabels: Record<string, string> = {
  contain: "Вписать полностью",
  cover: "Заполнить область"
};

export function getLabel<T extends string>(
  map: Partial<Record<T, string>>,
  value: T | null | undefined,
  fallback = "Неизвестно"
) {
  if (!value) {
    return fallback;
  }

  return map[value] ?? fallback;
}
