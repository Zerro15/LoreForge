# Отчет бетатестера LoreForge

## 1. Дата проверки

Проверка выполнена: 01.07.2026.

## 2. ОС и окружение

- ОС: Microsoft Windows 11 Pro 10.0.26200.
- Node.js: v24.13.0.
- pnpm: 11.7.0.
- Docker: Docker 29.2.1.
- Docker Compose: v5.0.2.
- PostgreSQL client: psql 16.14.
- PostgreSQL server в Docker: PostgreSQL 16.13.
- Browser: встроенный браузер Codex на Chromium.
- Video tool: FFmpeg 8.1.2 full build от Gyan.

## 3. Какие команды запускались

```powershell
docker compose up -d
.\scripts\db\reset-dev-db.ps1
.\scripts\db\check-db.ps1
pnpm install
pnpm typecheck
pnpm build
pnpm dev
```

Дополнительно для проверки:

```powershell
curl http://localhost:3001/health
curl http://localhost:3001/api/campaigns
curl http://localhost:3000/login
```

Для записи видео использовался локально установленный `ffmpeg`.

## 4. Проверенные backend endpoint-ы

| Endpoint | Метод | Результат |
| --- | --- | --- |
| `/health` | GET | 200 OK |
| `/api/auth/login` | POST | 200 OK |
| `/api/auth/me` | GET | 200 OK после login |
| `/api/auth/logout` | POST | 200 OK |
| `/api/auth/me` после logout | GET | 401 Unauthorized, ожидаемо |
| `/api/auth/register` | POST | 200 OK |
| `/api/campaigns` | GET | 200 OK |
| `/api/campaigns/1/dashboard` | GET | 200 OK |
| `/api/campaigns/1/characters` | GET | 200 OK |
| `/api/campaigns/1/npcs` | GET | 200 OK |
| `/api/campaigns/1/locations` | GET | 200 OK |
| `/api/campaigns/1/chat` | GET | 200 OK |
| `/api/campaigns/1/dice-roll` | POST | 200 OK |
| `/api/campaigns/1/session-log` | GET | 200 OK |
| `/api/world-plugins` | GET | 200 OK |

## 5. Проверенные frontend страницы

| Страница | HTTP | Результат UI-проверки |
| --- | --- | --- |
| `/login` | 200 | Экран входа отображается, demo user входит |
| `/register` | 200 | Новый пользователь создается, current user отображается |
| `/campaigns` | 200 | Demo-кампания отображается |
| `/campaigns/1` | 200 | Dashboard показывает кампанию, Mistbound, статистику, сообщения и события |
| `/campaigns/1/characters` | 200 | Карточки персонажей, статы, ресурсы и способности видны |
| `/campaigns/1/npcs` | 200 | NPC dossier cards и SecretBlock видны |
| `/campaigns/1/locations` | 200 | Дерево локаций и SecretBlock видны |
| `/campaigns/1/chat` | 200 | Чат работает, быстрые броски добавляются |
| `/campaigns/1/session-log` | 200 | Timeline журнала отображается |

## 6. Что работает

- Docker PostgreSQL поднимается.
- Миграции и demo seed применяются без ошибок.
- DB check проходит, найдено 53 таблицы.
- Backend API отвечает по всем проверенным endpoint-ам.
- Auth работает: login, register, current user, logout.
- После logout `/api/auth/me` возвращает 401.
- Frontend открывает все основные страницы.
- Dashboard дает понятный обзор demo-кампании.
- Characters показывают путь, последовательность, духовность, рассудок, усвоение, риск и способности.
- NPC и locations показывают SecretBlock.
- Chat отображает сообщения и dice cards.
- Быстрые броски `1d20`, `1d100`, `2d6` появляются в чате.
- Session log отображает события в timeline-like формате.
- В консоли браузера во время UI-прохода ошибок не найдено.

## 7. Что работает частично

- Страницы кампании пока не защищены обязательным frontend auth guard. Это ожидаемо для текущего этапа, но для продукта нужно закрыть доступ.
- SecretBlock виден всем пользователям. Нужен следующий слой roles/access control.
- Discord и Google на login page декоративные.
- В dev-режиме видна кнопка Next.js Dev Tools. Для production build это не критично.
- Видео записано как UI walkthrough; доказательства terminal-команд зафиксированы в этом отчете.

## 8. Найденные баги

Критичных багов приложения не найдено.

Найденные мелкие замечания:

- В login screen строка demo credentials содержит видимые обратные кавычки вокруг email/password. Это не ломает сценарий, но можно визуально отполировать.
- В ТЗ быстрые кнопки описаны как `d20`, `d100`, `2d6`, а в UI фактически используются `1d20`, `1d100`, `2d6`. Это логически корректнее для dice formula, но отличается от формулировки сценария.
- Некоторые seed-события имеют одинаковое время, из-за чего timeline выглядит немного искусственно.

## 9. UX-проблемы

- После регистрации нового пользователя он попадает в список кампаний, но неочевидно, почему он видит demo-кампанию. Для продукта нужен invite/member flow.
- Нет явного сообщения после успешного броска кубика, кроме появления сообщения в чате.
- Нет явного loading indicator на некоторых переходах, если backend будет отвечать медленно.
- Logout находится в topbar, но в mobile/узких состояниях это нужно отдельно перепроверить.

## 10. Странные данные

- Demo seed намеренно показывает GM-секреты всем пользователям.
- `campaign_id`, `user_id`, `roll_id` приходят как строки. Это нормально для PostgreSQL bigint через `pg`, но frontend должен учитывать тип.
- Пользователи, созданные во время register-теста, сохраняются до следующего `reset-dev-db`.

## 11. Ошибки в консоли браузера

Во время UI-прохода ошибок уровня `error` в консоли браузера не найдено.

## 12. Ошибки в терминале

Ошибок приложения не найдено.

Были две технические ошибки тестового окружения:

- Первый PowerShell smoke-скрипт для API содержал некорректный синтаксис substring. Скрипт был исправлен, повторный прогон прошел успешно.
- Первая запись mp4 была принудительно остановлена, из-за чего `ffprobe` сообщил `moov atom not found`. Видео было перезаписано с фиксированной длительностью FFmpeg, итоговый файл валиден.

## 13. Что исправить в первую очередь

- Добавить roles/access control и проверку `campaign_member`.
- Закрыть SecretBlock реальными правами GM/co-GM.
- Добавить auth guard для campaign pages.
- Явно связать нового пользователя с кампанией через invite/member flow.

## 14. Что можно улучшить позже

- Убрать визуальные обратные кавычки из demo credentials на login page.
- Добавить toast после dice roll.
- Добавить больше empty/loading/error states на уровне отдельных карточек.
- Добавить Playwright e2e smoke tests для login, dashboard и dice roll.
- Добавить mobile UI QA.

## 15. Видео проверки

Видео сохранено локально:

```text
outputs/loreforge_beta_test_walkthrough.mp4
```

Размер файла: около 4 МБ. Длительность: 70 секунд.

Видео не добавлено в git, чтобы не хранить бинарный артефакт в репозитории.

