#!/bin/bash
set -eu

# Rocky Linux 9.4 初期セットアップスクリプト
# 初回のみ実行（Dockerインストール + DB初期化 + HTTPS用keystore生成）

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
    echo "Enter DB host [localhost]:"
    read -r db_host
    db_host="${db_host:-localhost}"

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
        -- 予定
        CREATE TABLE IF NOT EXISTS schedules (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            is_all_day BOOLEAN NOT NULL,
            start_datetime TIMESTAMPTZ NOT NULL,
            end_datetime TIMESTAMPTZ NOT NULL,
            owner TEXT NOT NULL,
            description TEXT,
            update_time TIMESTAMPTZ NOT NULL,
            shared BOOLEAN NOT NULL DEFAULT true
        );

        -- 旧 calendar_shares テーブルを削除（sharemen に移行済み）
        DROP TABLE IF EXISTS calendar_shares;

        -- 予定メンバー
        CREATE TABLE IF NOT EXISTS schedule_members (
            id BIGSERIAL PRIMARY KEY,
            schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
            username TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(schedule_id, username)
        );

        -- ユーザー
        CREATE TABLE IF NOT EXISTS users (
            id BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            display_name TEXT
        );

        -- ユーザー設定
        CREATE TABLE IF NOT EXISTS user_settings (
            id BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            chip_bg_color TEXT,
            first_day_of_week INTEGER,
            time_interval INTEGER NOT NULL DEFAULT 5
        );

        -- パスワードリセットトークン
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL
        );

        -- メールアドレスカラム追加（既存テーブルへの追記。なければ追加）
        ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

        -- schedules に group_id カラム追加
        ALTER TABLE schedules ADD COLUMN IF NOT EXISTS group_id BIGINT;

        -- シェアメン（カレンダー共有の置き換え）
        CREATE TABLE IF NOT EXISTS sharemen (
            id BIGSERIAL PRIMARY KEY,
            inviter_username TEXT NOT NULL,
            invitee_username TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(inviter_username, invitee_username)
        );

        -- グループ
        CREATE TABLE IF NOT EXISTS groups (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            owner_username TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        -- 予定-グループ結合テーブル
        CREATE TABLE IF NOT EXISTS schedule_groups (
            schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
            group_id BIGINT NOT NULL,
            PRIMARY KEY (schedule_id, group_id)
        );

        -- グループメンバー
        CREATE TABLE IF NOT EXISTS group_members (
            id BIGSERIAL PRIMARY KEY,
            group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            username TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'MEMBER',
            status TEXT NOT NULL DEFAULT 'ACCEPTED',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE(group_id, username)
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
    echo "   1. ログアウトして再ログイン（Docker権限反映）"
    echo "      または newgrp docker"
    echo "   2. Let's Encrypt で正式な証明書を取得する場合:"
    echo "       bash setup-letsencrypt.sh"
    echo "       ※自己証明書でOKならスキップしてね"
    echo "   3. 開発マシンで JARビルド & デプロイ:"
    echo "       bash build.sh"
    echo "       bash deploy.sh（パスワードを対話式で入力）"
    echo "       ※keystoreパスワードは自動で本番サーバから読み込むよ"
    echo "============================================"
}

main "$@"
