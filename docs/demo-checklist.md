# Demo checklist LoreForge

## Перед показом

- [ ] Открыть PowerShell в корне проекта.
- [ ] Проверить, что Docker Desktop запущен.
- [ ] Поднять PostgreSQL:

```powershell
docker compose up -d
```

- [ ] Сбросить dev-БД и применить seed:

```powershell
.\scripts\db\reset-dev-db.ps1
```

- [ ] Проверить БД:

```powershell
.\scripts\db\check-db.ps1
```

- [ ] Установить зависимости, если нужно:

```powershell
pnpm install
```

- [ ] Запустить backend и frontend:

```powershell
pnpm dev
```

## Проверить страницы

- [ ] `/login`
- [ ] `/campaigns`
- [ ] `/campaigns/1`
- [ ] `/campaigns/1/characters`
- [ ] `/campaigns/1/npcs`
- [ ] `/campaigns/1/locations`
- [ ] `/campaigns/1/chat`
- [ ] `/campaigns/1/session-log`

## Проверить demo flow

- [ ] На `/login` нажать `Войти`.
- [ ] На `/campaigns` открыть `Туман над Баклундом`.
- [ ] На dashboard показать `Mistbound`.
- [ ] Открыть персонажей.
- [ ] Открыть NPC и показать `SecretBlock`.
- [ ] Открыть чат.
- [ ] Нажать быстрый бросок `1d20`.
- [ ] Убедиться, что dice-сообщение появилось в чате.
- [ ] Открыть журнал сессии.

## Если что-то не работает

- Проверить `NEXT_PUBLIC_API_URL`.
- Проверить `DATABASE_URL`.
- Если порт `5432` занят, использовать `POSTGRES_PORT=55432`.
- Перезапустить Docker Desktop.
- Повторить:

```powershell
.\scripts\db\reset-dev-db.ps1
pnpm dev
```
