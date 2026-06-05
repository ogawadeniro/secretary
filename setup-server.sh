#!/bin/bash
set -eu

# Rocky Linux 9.4 初期セットアップスクリプト
# 初回のみ実行（Dockerインストール + DB初期化）

# ---------- Dockerインストール ----------
install_docker() {
    if command -v docker &>/dev/null; then
        echo "=== Docker already installed ==="
        return
    fi
    echo "=== Installing Docker on Rocky Linux 9 ==="
    sudo dnf install -y dnf-plugins-core
    sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$(whoami)"
    echo "=== Docker installed ==="
    echo "!!! 一旦ログアウト/再ログインするか、以下を実行してグループを反映してね:"
    echo "    newgrp docker"
}

# ---------- DBセットアップ ----------
setup_database() {
    echo "=== Setting up PostgreSQL database ==="
    echo "Enter DB host [192.168.40.254]:"
    read -r db_host
    db_host="${db_host:-192.168.40.254}"

    echo "Enter DB admin user [postgres]:"
    read -r db_admin
    db_admin="${db_admin:-postgres}"

    PGPASSWORD="${DB_ADMIN_PASSWORD:-}" psql -h "$db_host" -U "$db_admin" -d postgres <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rogawa') THEN
                CREATE ROLE rogawa WITH LOGIN CREATEDB;
            END IF;
        END
        \$\$;
EOSQL

    PGPASSWORD="${DB_ADMIN_PASSWORD:-}" psql -h "$db_host" -U "$db_admin" -d postgres -c "CREATE DATABASE secretary OWNER rogawa;" 2>/dev/null || echo "Database 'secretary' already exists"

    PGPASSWORD="${DB_ADMIN_PASSWORD:-}" psql -h "$db_host" -U "$db_admin" -d secretary <<-EOSQL
        CREATE TABLE IF NOT EXISTS schedules (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            is_all_day BOOLEAN NOT NULL,
            start_datetime TIMESTAMPTZ NOT NULL,
            end_datetime TIMESTAMPTZ NOT NULL,
            owner TEXT NOT NULL,
            description TEXT,
            update_time TIMESTAMPTZ NOT NULL
        );
EOSQL
    echo "=== Database setup complete ==="
}

# ---------- メイン ----------
main() {
    echo "============================================"
    echo " Secretary - Rocky Linux 9.4 Setup"
    echo "============================================"
    install_docker
    setup_database
    echo "============================================"
    echo " Setup complete!"
    echo ""
    echo " 次のステップ:"
    echo "   1. グループ反映: newgrp docker"
    echo "      (または一旦ログアウトして再ログイン)"
    echo "   2. デプロイ:     bash deploy.sh"
    echo "============================================"
}

main "$@"
