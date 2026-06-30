$ErrorActionPreference = "Continue"

function Get-CommandInfo {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string[]]$VersionArgs
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue

    if (-not $command) {
        return [PSCustomObject]@{
            Command = $Name
            Found   = "NO"
            Path    = "-"
            Version = "-"
        }
    }

    $version = "-"

    foreach ($arg in $VersionArgs) {
        try {
            $output = & $command.Source $arg 2>&1
            if ($LASTEXITCODE -eq 0 -and $output) {
                $version = ($output | Select-Object -First 1).ToString().Trim()
                break
            }
        }
        catch {
            $version = "version check failed: $($_.Exception.Message)"
        }
    }

    return [PSCustomObject]@{
        Command = $Name
        Found   = "YES"
        Path    = $command.Source
        Version = $version
    }
}

function Get-DockerComposeInfo {
    $docker = Get-Command docker -ErrorAction SilentlyContinue

    if (-not $docker) {
        return [PSCustomObject]@{
            Command = "docker compose"
            Found   = "NO"
            Path    = "-"
            Version = "-"
        }
    }

    try {
        $output = & $docker.Source compose version 2>&1
        if ($LASTEXITCODE -eq 0 -and $output) {
            return [PSCustomObject]@{
                Command = "docker compose"
                Found   = "YES"
                Path    = $docker.Source
                Version = ($output | Select-Object -First 1).ToString().Trim()
            }
        }
    }
    catch {
        return [PSCustomObject]@{
            Command = "docker compose"
            Found   = "NO"
            Path    = $docker.Source
            Version = "compose check failed: $($_.Exception.Message)"
        }
    }

    return [PSCustomObject]@{
        Command = "docker compose"
        Found   = "NO"
        Path    = $docker.Source
        Version = "docker compose is not available"
    }
}

Write-Host ""
Write-Host "LoreForge local development environment check" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$checks = @(
    (Get-CommandInfo -Name "git" -VersionArgs @("--version")),
    (Get-CommandInfo -Name "node" -VersionArgs @("--version", "-v")),
    (Get-CommandInfo -Name "npm" -VersionArgs @("--version", "-v")),
    (Get-CommandInfo -Name "pnpm" -VersionArgs @("--version", "-v")),
    (Get-CommandInfo -Name "docker" -VersionArgs @("--version", "-v")),
    (Get-DockerComposeInfo),
    (Get-CommandInfo -Name "psql" -VersionArgs @("--version")),
    (Get-CommandInfo -Name "code" -VersionArgs @("--version")),
    (Get-CommandInfo -Name "python" -VersionArgs @("--version", "-V"))
)

$checks | Format-Table -AutoSize

Write-Host ""
Write-Host "Docker engine status" -ForegroundColor Cyan
Write-Host "--------------------" -ForegroundColor Cyan

$docker = Get-Command docker -ErrorAction SilentlyContinue

if (-not $docker) {
    Write-Host "Docker CLI was not found. Install Docker Desktop and restart PowerShell." -ForegroundColor Yellow
}
else {
    try {
        $info = & $docker.Source info 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker is running." -ForegroundColor Green
            $serverVersion = ($info | Select-String -Pattern "Server Version" | Select-Object -First 1)
            if ($serverVersion) {
                Write-Host $serverVersion.ToString().Trim()
            }
        }
        else {
            Write-Host "Docker CLI is installed, but Docker engine is not running." -ForegroundColor Yellow
            Write-Host "Start Docker Desktop from the Start menu, wait until it says Docker is running, then run this script again." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "Docker CLI is installed, but docker info failed." -ForegroundColor Yellow
        Write-Host "Start Docker Desktop and run this script again." -ForegroundColor Yellow
        Write-Host $_.Exception.Message -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "Notes" -ForegroundColor Cyan
Write-Host "-----" -ForegroundColor Cyan
Write-Host "DBeaver is a GUI application, not a required CLI command. Check it manually from the Start menu or install it with winget."
Write-Host "PostgreSQL GUI tools are optional if psql and Docker are available."
Write-Host ""

