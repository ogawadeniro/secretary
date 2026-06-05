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

# ---------- HTTPS用keystore生成 ----------
setup_keystore() {
    local keystore_dir="/etc/secretary"
    local keystore_file="${keystore_dir}/keystore.p12"
    local password_file="${keystore_dir}/keystore-password.txt"

    if [ -f "$keystore_file" ]; then
        echo "=== Keystore already exists: ${keystore_file} ==="
        return
    fi

    echo "=== Generating self-signed keystore ==="
    sudo mkdir -p "$keystore_dir"

    local password
    password=$(openssl rand -base64 32)
    echo "$password" | sudo tee "$password_file" > /dev/null
    sudo chmod 600 "$password_file"

    sudo keytool -genkeypair \
        -alias secretary \
        -keyalg RSA \
        -keysize 2048 \
        -storetype PKCS12 \
        -keystore "$keystore_file" \
        -storepass "$password" \
        -dname "CN=secretary.local, O=secretary, C=JP" \
        -validity 3650

    sudo chmod 600 "$keystore_file"
    echo "=== Keystore generated: ${keystore_file} ==="
    echo "    Password saved to: ${password_file}"
    echo "!!! 自己証明書なのでブラウザで警告が出るよ。"
    echo "    必要なら後で正式な証明書に差し替えてね。"
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
    setup_keystore
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
