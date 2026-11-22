# Creates the local development database and user from the values in
# .env.local (MARIADB_ROOT_PASSWORD and DATABASE_URL). Safe to re-run.
# Usage (from the project folder):  .\scripts\setup-local-db.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env.local'
if (-not (Test-Path $envFile)) { throw '.env.local not found' }

$vars = @{}
Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } |
    ForEach-Object { $vars[$Matches[1]] = $Matches[2].Trim() }

if ($vars['DATABASE_URL'] -notmatch '^mysql://([^:]+):([^@]+)@([^:/]+):(\d+)/(\w+)$') {
    throw 'DATABASE_URL must look like mysql://user:password@host:port/dbname'
}
$user, $pass, $dbHost, $port, $db = $Matches[1], $Matches[2], $Matches[3], $Matches[4], $Matches[5]

$client = Get-ChildItem 'C:\Program Files\MariaDB*\bin\mariadb.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
if (-not $client) { throw 'mariadb.exe not found under C:\Program Files\MariaDB*' }

$sql = @"
CREATE DATABASE IF NOT EXISTS ``$db`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$user'@'localhost' IDENTIFIED BY '$pass';
CREATE USER IF NOT EXISTS '$user'@'127.0.0.1' IDENTIFIED BY '$pass';
ALTER USER '$user'@'localhost' IDENTIFIED BY '$pass';
ALTER USER '$user'@'127.0.0.1' IDENTIFIED BY '$pass';
GRANT ALL PRIVILEGES ON ``$db``.* TO '$user'@'localhost';
GRANT ALL PRIVILEGES ON ``$db``.* TO '$user'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

$env:MYSQL_PWD = $vars['MARIADB_ROOT_PASSWORD']
try {
    # --skip-ssl: the local dev server has no TLS, and this never leaves the PC.
    $sql | & $client -u root -h $dbHost -P $port --skip-ssl
    if ($LASTEXITCODE -ne 0) { throw "mariadb exited with $LASTEXITCODE" }
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}
Write-Host "Database '$db' and user '$user' are ready."
