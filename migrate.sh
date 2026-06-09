#!/bin/bash
set -eu

# secretary 本番DBマイグレーションスクリプト
# 初回セットアップ（setup-server.sh）以降に追加されたテーブルやカラムを適用する。
#  ssh経由で本番サーバのDBに接続して実行する。
#
# 使い方:
#   1. 本番サーバにSSHでログインする
#   2. sudo -u postgres で実行するか、DB管理者権限のあるユーザーで実行
#   3. bash migrate.sh

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-secretary}"
DB_USER="${DB_USER:-rogawa}"

echo "=== secretary DB Migration ==="
echo "DB: ${DB_HOST}/${DB_NAME} as ${DB_USER}"
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
    -- 1. users テーブルに email カラムを追加
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

    -- 2. password_reset_tokens テーブルを作成
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL
    );

    -- 3. user_settings に time_interval カラムを追加
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_interval INTEGER NOT NULL DEFAULT 5;

    -- 4. schedules に shared カラムを追加（古いテーブル対策）
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shared BOOLEAN NOT NULL DEFAULT true;

    -- 5. 不足しているテーブルをまとめて作成
    CREATE TABLE IF NOT EXISTS calendar_shares (
        id BIGSERIAL PRIMARY KEY,
        owner_username TEXT NOT NULL,
        shared_with_username TEXT NOT NULL,
        permission TEXT NOT NULL DEFAULT 'READ',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(owner_username, shared_with_username)
    );

    CREATE TABLE IF NOT EXISTS schedule_members (
        id BIGSERIAL PRIMARY KEY,
        schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(schedule_id, username)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        chip_bg_color TEXT,
        first_day_of_week INTEGER,
        time_interval INTEGER NOT NULL DEFAULT 5
    );
EOSQL

echo "=== Migration complete ==="
