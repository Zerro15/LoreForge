$ErrorActionPreference = "Stop"

$ContainerName = "loreforge-postgres-dev"
$DatabaseName = "loreforge_dev"
$DatabaseUser = "postgres"

$RequiredTables = @(
    "campaign",
    "campaign_member",
    "character",
    "npc",
    "location",
    "chat_message",
    "dice_roll",
    "session_log",
    "session_event",
    "world_plugin",
    "plugin_feature",
    "campaign_plugin",
    "character_stat",
    "character_resource",
    "ability",
    "character_ability",
    "gm_note",
    "tag",
    "entity_tag",
    "audit_log"
)

function Invoke-DbScalar {
    param([Parameter(Mandatory = $true)][string]$Sql)

    docker exec $ContainerName psql -U $DatabaseUser -d $DatabaseName -At -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "Database query failed."
    }
}

function Wait-PostgresReady {
    Write-Host "Waiting for PostgreSQL readiness..." -ForegroundColor Cyan

    for ($i = 1; $i -le 30; $i++) {
        docker exec $ContainerName pg_isready -U $DatabaseUser -d $DatabaseName *> $null

        if ($LASTEXITCODE -eq 0) {
            docker exec $ContainerName psql -U $DatabaseUser -d $DatabaseName -At -c "SELECT 1;" *> $null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "PostgreSQL is ready." -ForegroundColor Green
                return
            }
        }

        Start-Sleep -Seconds 2
    }

    docker logs $ContainerName --tail 80
    throw "PostgreSQL is not available after waiting. Start it with: docker compose up -d"
}

Write-Host "Checking LoreForge dev database..." -ForegroundColor Cyan

Wait-PostgresReady

Write-Host ""
Write-Host "PostgreSQL version:" -ForegroundColor Cyan
Invoke-DbScalar "SELECT version();"

Write-Host ""
Write-Host "Tables:" -ForegroundColor Cyan
$tables = @(Invoke-DbScalar "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;")
$tables | ForEach-Object { Write-Host $_ }

Write-Host ""
Write-Host "Table count: $($tables.Count)" -ForegroundColor Cyan

Write-Host ""
Write-Host "Required table check:" -ForegroundColor Cyan
$missing = @()

foreach ($table in $RequiredTables) {
    if ($tables -contains $table) {
        Write-Host "OK      $table" -ForegroundColor Green
    }
    else {
        Write-Host "MISSING $table" -ForegroundColor Red
        $missing += $table
    }
}

if ($missing.Count -gt 0) {
    throw "Missing required tables: $($missing -join ', ')"
}

Write-Host ""
Write-Host "LoreForge dev database check passed." -ForegroundColor Green
