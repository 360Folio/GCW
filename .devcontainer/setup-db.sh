#!/usr/bin/env bash
# Runs every time the Codespace starts. Installs MariaDB inside this single
# container (first start only), starts it, and creates the local test
# database. Credentials here are for this throwaway Codespace only.
set -euo pipefail

if ! command -v mariadbd >/dev/null 2>&1; then
  echo "Installing MariaDB (first start only)..."
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq mariadb-server >/dev/null
fi

sudo service mariadb start >/dev/null

# Root uses socket auth inside the container, so sudo needs no password.
sudo mariadb <<'SQL'
CREATE DATABASE IF NOT EXISTS gcw CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'gcw'@'127.0.0.1' IDENTIFIED BY 'gcw_codespace_only';
CREATE USER IF NOT EXISTS 'gcw'@'localhost' IDENTIFIED BY 'gcw_codespace_only';
GRANT ALL PRIVILEGES ON gcw.* TO 'gcw'@'127.0.0.1';
GRANT ALL PRIVILEGES ON gcw.* TO 'gcw'@'localhost';
FLUSH PRIVILEGES;
SQL

# Local settings for this Codespace. Real secrets come from Codespaces
# secrets (environment variables), which take priority over this file.
if [ ! -f .env.local ]; then
  cat > .env.local <<EOF
# Codespace only. Never commit.
DATABASE_URL=mysql://gcw:gcw_codespace_only@127.0.0.1:3306/gcw
SITE_URL=https://${CODESPACE_NAME:-localhost}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}
AUTH_SECRET=$(openssl rand -base64 32)
EOF
fi

# Codespaces' port forwarding passes sign-in requests to the site as coming
# from http://localhost:3000, so the sign-in check must accept that address.
# Added to older .env.local files too. Codespace only, never on the live site.
if ! grep -q '^BETTER_AUTH_TRUSTED_ORIGINS=' .env.local; then
  echo 'BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000' >> .env.local
fi

echo "MariaDB is running; database 'gcw' is ready."
