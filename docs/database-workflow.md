# LoreForge Database Workflow

This document describes the local database workflow for LoreForge development.

## SQL Order

Always apply SQL files in this order:

1. `dnd_campaign_schema.sql`
2. `outputs/loreforge_schema_upgrade.sql`
3. `outputs/seed_loreforge_demo.sql`, when the seed file exists

The base schema creates the original LoreForge/DnD campaign tables. The upgrade migration adds the stronger LoreForge domain architecture. The seed file is optional demo data and should only run after both schema files.

## Docker Dev Database

The root `docker-compose.yml` starts PostgreSQL 16:

```text
Container: loreforge-postgres-dev
Database: loreforge_dev
User: postgres
Password: postgres
Port: 5432
```

Start the database without resetting data:

```powershell
docker compose up -d
```

Stop the database:

```powershell
docker compose down
```

Stop the database and delete its volume:

```powershell
docker compose down -v
```

## Scripts

### `scripts/db/reset-dev-db.ps1`

Use this when you want a clean local database.

It does:

- `docker compose down -v`;
- `docker compose up -d`;
- waits for PostgreSQL healthcheck;
- applies `dnd_campaign_schema.sql`;
- applies `outputs/loreforge_schema_upgrade.sql`;
- applies `outputs/seed_loreforge_demo.sql` if it exists;
- prints the final table list.

Run:

```powershell
.\scripts\db\reset-dev-db.ps1
```

### `scripts/db/apply-migrations.ps1`

Use this when the container is already running and you want to apply the schema files.

It does:

- checks PostgreSQL availability;
- applies `dnd_campaign_schema.sql`;
- applies `outputs/loreforge_schema_upgrade.sql`.

Run:

```powershell
.\scripts\db\apply-migrations.ps1
```

### `scripts/db/check-db.ps1`

Use this to verify the dev database.

It does:

- checks connection to `loreforge_dev`;
- prints PostgreSQL version;
- prints all public tables;
- checks key LoreForge tables.

Run:

```powershell
.\scripts\db\check-db.ps1
```

## DBeaver Connection

Create a PostgreSQL connection:

```text
Host: localhost
Port: 5432
Database: loreforge_dev
User: postgres
Password: postgres
```

Click **Test Connection**. If DBeaver asks to download the PostgreSQL driver, allow it.

## ERD in DBeaver

To inspect the schema:

1. Open the `loreforge_dev` connection.
2. Expand `Schemas`.
3. Expand `public`.
4. Select the tables you want.
5. Right-click and choose **View Diagram** or **ER Diagram**.
6. Save or export the diagram if needed for presentation.

For a full diagram, select the most important domain tables first:

- `campaign`
- `campaign_member`
- `character`
- `npc`
- `location`
- `scene`
- `chat_message`
- `dice_roll`
- `session_log`
- `world_plugin`
- `plugin_feature`
- `campaign_plugin`
- `gm_note`
- `entity_relation`
- `investigation`

## If Port 5432 Is Busy

Check what is using the port:

```powershell
netstat -ano | findstr :5432
```

Options:

- stop the other PostgreSQL service from an Administrator PowerShell:

```powershell
Stop-Service postgresql-x64-16
Set-Service postgresql-x64-16 -StartupType Manual
docker compose down
docker compose up -d
```

- stop the other Docker container using port `5432`;
- change the compose port mapping to another host port, for example:

```yaml
ports:
  - "55432:5432"
```

If you change the host port, update DBeaver and local `psql` connection strings accordingly.

## If the Container Does Not Start

Check container status:

```powershell
docker compose ps
```

Check logs:

```powershell
docker compose logs postgres
```

Common fixes:

- Start Docker Desktop and wait until Docker is running.
- Free port `5432`.
- Reset the database volume:

```powershell
docker compose down -v
docker compose up -d
```

- Re-run the full reset:

```powershell
.\scripts\db\reset-dev-db.ps1
```

## Useful Manual Commands

List tables:

```powershell
docker exec loreforge-postgres-dev psql -U postgres -d loreforge_dev -c "\dt"
```

Open an interactive SQL shell:

```powershell
docker exec -it loreforge-postgres-dev psql -U postgres -d loreforge_dev
```

Connect with local `psql`:

```powershell
psql "postgresql://postgres:postgres@localhost:5432/loreforge_dev"
```
