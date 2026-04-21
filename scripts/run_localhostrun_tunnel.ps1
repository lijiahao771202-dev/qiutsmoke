param(
    [int]$LocalPort = 3000,
    [string]$LogPath = "",
    [string]$UrlPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
if (-not $LogPath) {
    $LogPath = Join-Path $repoRoot ".localhostrun-keep.log"
}
if (-not $UrlPath) {
    $UrlPath = Join-Path $repoRoot ".localhostrun-url.txt"
}

function Write-Log {
    param([string]$Message)

    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -LiteralPath $LogPath -Value $line
}

function Update-UrlFile {
    param([string]$Line)

    $match = [regex]::Match($Line, '([a-z0-9]+\.(lhr\.life|localhost\.run))')
    if ($match.Success) {
        Set-Content -LiteralPath $UrlPath -Value ("https://{0}" -f $match.Groups[1].Value)
    }
}

New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($LogPath)) | Out-Null
if (-not (Test-Path -LiteralPath $LogPath)) {
    New-Item -ItemType File -Path $LogPath | Out-Null
}

while ($true) {
    Write-Log "Starting localhost.run tunnel for 127.0.0.1:$LocalPort"

    try {
        $sshCommand = @(
            'ssh',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=NUL',
            '-o', 'ServerAliveInterval=20',
            '-o', 'ServerAliveCountMax=3',
            '-R', ('80:127.0.0.1:{0}' -f $LocalPort),
            'nokey@localhost.run',
            '2>&1'
        ) -join ' '

        & cmd.exe /d /c $sshCommand |
            ForEach-Object {
                $line = "$_"
                Add-Content -LiteralPath $LogPath -Value $line
                Update-UrlFile -Line $line
            }
    } catch {
        Write-Log ("Tunnel process error: {0}" -f $_.Exception.Message)
    }

    Write-Log "Tunnel exited, reconnecting in 3 seconds"
    Start-Sleep -Seconds 3
}
