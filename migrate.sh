#!/bin/bash
set -eu

# secretary 本番DBマイグレーションスクリプト
# 初回セットアップ（setup-server.sh）以降に追加されたテーブルやカラムを適用する。
# ssh経由で本番サーバのDBに接続して実行する。
#
# 使い方:
#   1. 本番サーバにSSHでログインする
#   2. sudo -u postgres で実行するか、DB管理者権限のあるユーザーで実行
#   3. bash migrate.sh
#
# 恒等性: 何度実行しても安全。既存データには影響しない。

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-secretary}"
DB_USER="${DB_USER:-rogawa}"

echo "=== secretary DB Migration ==="
echo "DB: ${DB_HOST}/${DB_NAME} as ${DB_USER}"
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
    -- ============================================================
    --  1. 不足テーブルの作成（IF NOT EXISTS で安全）
    -- ============================================================

    -- 1-1. ユーザー
    CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT
    );

    -- 1-2. パスワードリセットトークン
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL
    );

    -- 1-3. ユーザー設定
    CREATE TABLE IF NOT EXISTS user_settings (
        id BIGSERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        chip_bg_color TEXT,
        first_day_of_week INTEGER,
        time_interval INTEGER NOT NULL DEFAULT 5
    );

    -- 1-4. シェアメン（旧 calendar_shares の置き換え）
    CREATE TABLE IF NOT EXISTS sharemen (
        id BIGSERIAL PRIMARY KEY,
        inviter_username TEXT NOT NULL,
        invitee_username TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(inviter_username, invitee_username)
    );

    -- 1-5. 予定メンバー
    CREATE TABLE IF NOT EXISTS schedule_members (
        id BIGSERIAL PRIMARY KEY,
        schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(schedule_id, username)
    );

    -- 1-6. グループ
    CREATE TABLE IF NOT EXISTS groups (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        owner_username TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 1-7. 予定-グループ結合テーブル
    CREATE TABLE IF NOT EXISTS schedule_groups (
        schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        group_id BIGINT NOT NULL,
        PRIMARY KEY (schedule_id, group_id)
    );

    -- 1-8. グループメンバー
    CREATE TABLE IF NOT EXISTS group_members (
        id BIGSERIAL PRIMARY KEY,
        group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        status TEXT NOT NULL DEFAULT 'ACCEPTED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(group_id, username)
    );

    -- 1-6. やることリストテーブル
    CREATE TABLE IF NOT EXISTS todo_items (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        owner TEXT NOT NULL,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        deadline TIMESTAMPTZ,
        completed BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS todo_item_groups (
        todo_item_id BIGINT NOT NULL REFERENCES todo_items(id) ON DELETE CASCADE,
        group_id BIGINT NOT NULL,
        UNIQUE(todo_item_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS todo_item_members (
        todo_item_id BIGINT NOT NULL REFERENCES todo_items(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        UNIQUE(todo_item_id, username)
    );

    -- 1-10. Remember-Me トークン（ログイン状態の保持）
    CREATE TABLE IF NOT EXISTS persistent_logins (
        username VARCHAR(64) NOT NULL,
        series VARCHAR(64) PRIMARY KEY,
        token VARCHAR(64) NOT NULL,
        last_used TIMESTAMP NOT NULL
    );

    -- ============================================================
    --  2. 不足カラムの追加（IF NOT EXISTS で安全）
    -- ============================================================

    -- 2-1. users.email
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

    -- 2-2. user_settings.time_interval
    ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_interval INTEGER NOT NULL DEFAULT 5;

    -- 2-3. schedules.shared（古いテーブル対策）
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shared BOOLEAN NOT NULL DEFAULT true;

    -- 2-4. schedules.id を BIGINT に（Hibernate の Long 型対応）
    ALTER TABLE schedules ALTER COLUMN id TYPE BIGINT;

    -- 2-5. schedules.group_id（旧単一グループカラム、データ移行用に維持）
    ALTER TABLE schedules ADD COLUMN IF NOT EXISTS group_id BIGINT;

    -- 2-6. groups.icon_data
    ALTER TABLE groups ADD COLUMN IF NOT EXISTS icon_data TEXT;

    -- 2-7. group_members.status（初回作成時の DEFAULT 'ACCEPTED' が効かない場合対策）
    ALTER TABLE group_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACCEPTED';

    -- 2-8. todo_items.deadline
    ALTER TABLE todo_items ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

    -- 2-9. todo_items.completed
    ALTER TABLE todo_items ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;

    -- ============================================================
    --  3. データ移行
    -- ============================================================

    -- 3-1. schedules.group_id → schedule_groups への移行
    --     旧コードでは schedules.group_id に単一グループIDを保存していた。
    --     新コードでは schedule_groups テーブルで管理する。
    --     まだ schedule_groups に移行していないレコードをINSERTする。
    INSERT INTO schedule_groups (schedule_id, group_id)
    SELECT s.id, s.group_id
    FROM schedules s
    WHERE s.group_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM schedule_groups sg
          WHERE sg.schedule_id = s.id AND sg.group_id = s.group_id
      );

    -- 3-2. users.email に UNIQUE 制約を追加（重複がなければ）
    --      @Column(unique=true) に対応。重複NULLはPostgreSQLでは許可される。
    DO \$\$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'users_email_key'
              AND conrelid = 'users'::regclass
        ) THEN
            -- 重複するemail値がない場合のみ制約を追加
            IF NOT EXISTS (
                SELECT email FROM users
                WHERE email IS NOT NULL
                GROUP BY email
                HAVING COUNT(*) > 1
            ) THEN
                ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
            ELSE
                RAISE NOTICE 'SKIP: users.email に重複があるため UNIQUE 制約を追加できません';
            END IF;
        END IF;
    END
    \$\$;

EOSQL

echo ""
echo "=== Migration complete ==="
echo ""
echo "確認: 以下のSQLを実行して移行状況を確認してね"
echo "  # schedules.group_id → schedule_groups の移行件数"
echo "  SELECT COUNT(*) FROM schedule_groups sg"
echo "  INNER JOIN schedules s ON s.id = sg.schedule_id"
echo "  WHERE s.group_id IS NOT NULL;"
echo ""
echo "  # まだ group_id が残っているスケジュール"
echo "  SELECT id, title, group_id FROM schedules WHERE group_id IS NOT NULL;"
