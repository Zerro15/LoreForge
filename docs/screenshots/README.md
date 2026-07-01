# Screenshots для презентации

Скриншоты лучше сделать вручную после запуска демо, чтобы зафиксировать актуальный вид интерфейса на нужном разрешении.

## Как запустить

```powershell
docker compose up -d
.\scripts\db\reset-dev-db.ps1
pnpm dev
```

Открыть:

```text
http://localhost:3000/login
```

## Какие скриншоты сделать

- `login.png` — страница входа.
- `campaigns.png` — список кампаний.
- `dashboard.png` — dashboard кампании `Туман над Баклундом`.
- `characters.png` — персонажи с ресурсами Mistbound.
- `npc.png` — NPC dossier и SecretBlock.
- `chat.png` — чат с dice-сообщением.
- `session-log.png` — timeline журнала сессии.

## Рекомендации

- Использовать desktop viewport примерно `1440x900`.
- Перед скриншотом чата нажать быстрый бросок `1d20`.
- Не показывать лишние окна IDE или терминала.
- Проверить, что виден тёмный фон, glass cards и purple glow.
