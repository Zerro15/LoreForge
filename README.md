# LoreForge

LoreForge is a web platform for running tabletop RPG campaigns.

It is designed as:

```text
Roll20 + Notion for GMs + world/rules plugins
```

The current repository contains early architecture artifacts:

- database schema upgrade migration;
- PostgreSQL migration test report;
- domain model notes;
- local Windows development environment check script;
- developer environment documentation.

## Dev Environment

Check local tools on Windows:

```powershell
.\scripts\check-dev-env.ps1
```

Read the setup guide:

```text
docs/dev-environment.md
```

## AI agents

Правила работы для Codex и других AI-агентов описаны в `AGENTS.md`.

## Backend API

Минимальный API и команды запуска описаны в `docs/backend-api.md`.

## Database

Apply SQL files in this order:

1. `dnd_campaign_schema.sql`
2. `outputs/loreforge_schema_upgrade.sql`
3. `outputs/seed_loreforge_demo.sql` when the seed file exists
