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
    -- 1. users テーブルを作成（初回セットアップ漏れ対策）
    CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT
    );

    -- 2. users テーブルに email カラムを追加
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

    -- 3. password_reset_tokens テーブルを作成
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL
    );

    -- 4. user_settings に time_interval カラムを追加
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_interval INTEGER NOT NULL DEFAULT 5;

    -- 5. schedules に shared カラムを追加（古いテーブル対策）
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shared BOOLEAN NOT NULL DEFAULT true;

    -- 6. schedules.id を INTEGER (SERIAL) → BIGINT (BIGSERIAL) に変更
    --    Hibernate が Long 型として認識するため validation に通す
    ALTER TABLE schedules ALTER COLUMN id TYPE BIGINT;

    -- 7. schedules に group_id カラムを追加
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS group_id BIGINT;

    -- 8. 旧 calendar_shares テーブルを削除（sharemen に移行済み）
    DROP TABLE IF EXISTS calendar_shares;

    -- 9. 不足しているテーブルをまとめて作成
    -- シェアメン（旧 calendar_shares の置き換え）
    CREATE TABLE IF NOT EXISTS sharemen (
        id BIGSERIAL PRIMARY KEY,
        inviter_username TEXT NOT NULL,
        invitee_username TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(inviter_username, invitee_username)
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

    -- グループ
    CREATE TABLE IF NOT EXISTS groups (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        owner_username TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- グループメンバー
    CREATE TABLE IF NOT EXISTS group_members (
        id BIGSERIAL PRIMARY KEY,
        group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(group_id, username)
    );
EOSQL

echo "=== Migration complete ==="
