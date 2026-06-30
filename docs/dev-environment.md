# LoreForge Dev Environment

This document describes the local Windows development environment for LoreForge.

Scope:

- prepare local tools;
- run PostgreSQL 16 through Docker;
- connect with DBeaver;
- apply SQL schemas and demo seed data.

No backend or frontend setup is required at this stage.

## Required Tools

Install:

- Git
- Node.js LTS
- npm
- pnpm
- Docker Desktop
- PostgreSQL client tools with `psql`
- VS Code
- Python
- DBeaver or another PostgreSQL GUI

Check the environment:

```powershell
.\scripts\check-dev-env.ps1
```

If PowerShell blocks script execution for the current session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\check-dev-env.ps1
```

## Install With winget

Run PowerShell as a normal user or as Administrator if winget asks for permission.

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Docker.DockerDesktop -e
winget install --id PostgreSQL.PostgreSQL -e
winget install --id Microsoft.VisualStudioCode -e
winget install --id Python.Python.3.12 -e
winget install --id DBeaver.DBeaver.Community -e
```

Restart PowerShell after installing tools so `PATH` changes are loaded.

## Install pnpm

Preferred installation through Corepack:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

Alternative installation through npm:

```powershell
npm install -g pnpm
pnpm --version
```

## Docker Desktop

Start Docker Desktop from the Windows Start menu.

Check that Docker is running:

```powershell
docker info
docker compose version
```

If `docker info` fails, Docker Desktop is installed but the engine is not running yet. Start Docker Desktop, wait until it is ready, then try again.

## PostgreSQL 16 Through Docker

LoreForge includes a root `docker-compose.yml` for the dev database.

Start the dev database:

```powershell
docker compose up -d
```

Reset the dev database and apply all SQL files:

```powershell
.\scripts\db\reset-dev-db.ps1
```

Check the dev database:

```powershell
.\scripts\db\check-db.ps1
```

The included service uses:

```text
Host: localhost
Port: 5432 by default, or POSTGRES_PORT if it is set
Database: loreforge_dev
Username: postgres
Password: postgres
```

Reference compose service:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: loreforge-postgres-dev
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: loreforge_dev
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start PostgreSQL:

```powershell
docker compose up -d
```

Check the container:

```powershell
docker ps
docker exec loreforge-postgres-dev pg_isready -U postgres -d loreforge_dev
```

## Connect Through DBeaver

Create a new PostgreSQL connection:

```text
Host: localhost
Port: 5432 by default, or the value of POSTGRES_PORT
Database: loreforge_dev
Username: postgres
Password: postgres
```

Driver: PostgreSQL.

Click **Test Connection**. If DBeaver asks to download the driver, allow it.

If DBeaver connects to a local PostgreSQL server instead of Docker, the PostgreSQL installer probably started the Windows service `postgresql-x64-16` on port `5432`. Stop that service from an Administrator PowerShell, then recreate the Docker container:

```powershell
Stop-Service postgresql-x64-16
Set-Service postgresql-x64-16 -StartupType Manual
docker compose down
docker compose up -d
```

You can also keep the local PostgreSQL service running and set `POSTGRES_PORT=55432` in your local `.env`, but then DBeaver and local `psql` must use port `55432`.

## Apply SQL Files

Recommended order:

1. `dnd_campaign_schema.sql`
2. `loreforge_schema_upgrade.sql`
3. `seed_loreforge_demo.sql`

The first file creates the original schema. The second file upgrades LoreForge architecture. The seed file should be applied only after both schema files.

### Apply dnd_campaign_schema.sql

If `psql` is installed locally:

```powershell
psql "postgresql://postgres:postgres@localhost:5432/loreforge_dev" -v ON_ERROR_STOP=1 -f ".\dnd_campaign_schema.sql"
```

If local `psql` is not installed, use the Docker container:

```powershell
docker cp ".\dnd_campaign_schema.sql" loreforge-postgres-dev:/tmp/dnd_campaign_schema.sql
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -v ON_ERROR_STOP=1 -f /tmp/dnd_campaign_schema.sql
```

### Apply loreforge_schema_upgrade.sql

Using local `psql`:

```powershell
psql "postgresql://postgres:postgres@localhost:5432/loreforge_dev" -v ON_ERROR_STOP=1 -f ".\outputs\loreforge_schema_upgrade.sql"
```

Using Docker:

```powershell
docker cp ".\outputs\loreforge_schema_upgrade.sql" loreforge-postgres-dev:/tmp/loreforge_schema_upgrade.sql
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -v ON_ERROR_STOP=1 -f /tmp/loreforge_schema_upgrade.sql
```

### Apply seed_loreforge_demo.sql

Use this only after the base schema and upgrade migration are applied.

Using local `psql`:

```powershell
psql "postgresql://postgres:postgres@localhost:5432/loreforge_dev" -v ON_ERROR_STOP=1 -f ".\outputs\seed_loreforge_demo.sql"
```

Using Docker:

```powershell
docker cp ".\outputs\seed_loreforge_demo.sql" loreforge-postgres-dev:/tmp/seed_loreforge_demo.sql
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -v ON_ERROR_STOP=1 -f /tmp/seed_loreforge_demo.sql
```

## Useful Verification Queries

List all tables:

```powershell
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -c "\dt"
```

Check key upgrade tables:

```powershell
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('session_log','session_event','world_plugin','plugin_feature','campaign_plugin','character_stat','character_resource','ability','character_ability','campaign_invite','gm_note','tag','entity_tag','audit_log') ORDER BY table_name;"
```

Check `campaign` upgrade columns:

```powershell
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'campaign' AND column_name IN ('status','cover_attachment_id');"
```

Check `chat_message` upgrade columns:

```powershell
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_message' AND column_name IN ('message_type','visibility','metadata_json','dice_roll_id');"
```

## Notes

- `Docker Desktop` is required only if PostgreSQL is run through containers.
- `psql` is useful for local schema checks and CI-like migration testing.
- DBeaver is optional but convenient for inspecting tables, data, constraints and indexes.
- Apply schema files to a clean database when testing migrations.
