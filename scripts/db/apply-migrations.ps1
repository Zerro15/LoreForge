$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$BaseSchema = Join-Path $ProjectRoot "dnd_campaign_schema.sql"
$UpgradeSchema = Join-Path $ProjectRoot "outputs\loreforge_schema_upgrade.sql"
$ContainerName = "loreforge-postgres-dev"
$DatabaseName = "loreforge_dev"
$DatabaseUser = "postgres"

function Assert-FileExists {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Required file was not found: $Path"
    }
}

function Assert-PostgresReady {
    docker exec $ContainerName pg_isready -U $DatabaseUser -d $DatabaseName
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL is not available. Start it with: docker compose up -d"
    }
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

Assert-FileExists $BaseSchema
Assert-FileExists $UpgradeSchema
Assert-PostgresReady

Invoke-SqlFile -HostPath $BaseSchema -ContainerPath "/tmp/dnd_campaign_schema.sql"
Invoke-SqlFile -HostPath $UpgradeSchema -ContainerPath "/tmp/loreforge_schema_upgrade.sql"

Write-Host "LoreForge migrations applied successfully." -ForegroundColor Green

