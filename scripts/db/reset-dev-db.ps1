$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"
$BaseSchema = Join-Path $ProjectRoot "dnd_campaign_schema.sql"
$UpgradeSchema = Join-Path $ProjectRoot "outputs\loreforge_schema_upgrade.sql"
$SeedSchema = Join-Path $ProjectRoot "outputs\seed_loreforge_demo.sql"
$ContainerName = "loreforge-postgres-dev"
$DatabaseName = "loreforge_dev"
$DatabaseUser = "postgres"

function Assert-FileExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file was not found: $Path"
    }
}

function Wait-PostgresHealthy {
    Write-Host "Waiting for PostgreSQL healthcheck..." -ForegroundColor Cyan

    for ($i = 1; $i -le 60; $i++) {
        $status = docker inspect --format "{{.State.Health.Status}}" $ContainerName 2>$null

        if ($LASTEXITCODE -eq 0 -and $status -eq "healthy") {
            Write-Host "PostgreSQL is healthy." -ForegroundColor Green
            return
        }

        Start-Sleep -Seconds 2
    }

    docker logs $ContainerName --tail 80
    throw "PostgreSQL container did not become healthy in time."
}

function Invoke-SqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$HostPath,

        [Parameter(Mandatory = $true)]
        [string]$ContainerPath
    )

    Write-Host "Applying $HostPath" -ForegroundColor Cyan
    docker cp $HostPath "${ContainerName}:$ContainerPath"
    if ($LASTEXITCODE -ne 0) {
        throw "docker cp failed for $HostPath"
    }

    docker exec $ContainerName psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -f $ContainerPath
    if ($LASTEXITCODE -ne 0) {
        throw "psql failed for $HostPath"
    }
}

Set-Location $ProjectRoot

Assert-FileExists $ComposeFile
Assert-FileExists $BaseSchema
Assert-FileExists $UpgradeSchema

Write-Host "Resetting LoreForge dev database..." -ForegroundColor Cyan
& docker compose -f $ComposeFile down --volumes --remove-orphans
if ($LASTEXITCODE -ne 0) {
    throw "docker compose down failed with exit code $LASTEXITCODE"
}

& docker compose -f $ComposeFile up --detach
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed with exit code $LASTEXITCODE"
}

Wait-PostgresHealthy

Invoke-SqlFile -HostPath $BaseSchema -ContainerPath "/tmp/dnd_campaign_schema.sql"
Invoke-SqlFile -HostPath $UpgradeSchema -ContainerPath "/tmp/loreforge_schema_upgrade.sql"

if (Test-Path -LiteralPath $SeedSchema) {
    Invoke-SqlFile -HostPath $SeedSchema -ContainerPath "/tmp/seed_loreforge_demo.sql"
}
else {
    Write-Host "Seed file not found, skipping: $SeedSchema" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Tables in ${DatabaseName}:" -ForegroundColor Cyan
docker exec $ContainerName psql -U $DatabaseUser -d $DatabaseName -At -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"
if ($LASTEXITCODE -ne 0) {
    throw "Could not list database tables."
}

Write-Host ""
Write-Host "LoreForge dev database reset completed successfully." -ForegroundColor Green
