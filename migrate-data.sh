#!/bin/bash
set -eu

# secretary 本番DBデータ移行スクリプト
# ユーザー ryoma / nanaho を共有グループ「家族」に参加させ、
# 両者の既存予定をグループと紐付ける。
#
# 使い方:
#   bash migrate-data.sh
#
# 恒等性: 何度実行しても安全。

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-secretary}"
DB_USER="${DB_USER:-rogawa}"

echo "=== secretary Data Migration ==="
echo "DB: ${DB_HOST}/${DB_NAME} as ${DB_USER}"
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
    -- ============================================================
    --  1. 共有グループ「家族」を作成
    -- ============================================================
    DO \$\$
    DECLARE
        v_group_id BIGINT;
        v_ryoma_exists BOOLEAN;
        v_nanaho_exists BOOLEAN;
        v_ryoma_count INTEGER;
        v_nanaho_count INTEGER;
    BEGIN
        -- 既にグループが存在するか確認
        SELECT id INTO v_group_id FROM groups WHERE name = '家族' LIMIT 1;

        IF v_group_id IS NULL THEN
            INSERT INTO groups (name, owner_username, created_at, updated_at)
            VALUES ('家族', 'ryoma', now(), now())
            RETURNING id INTO v_group_id;
            RAISE NOTICE 'グループ「家族」を作成しました (id=%)', v_group_id;

            -- オーナーを承諾済みメンバーとして追加
            INSERT INTO group_members (group_id, username, role, status, created_at)
            VALUES (v_group_id, 'ryoma', 'OWNER', 'ACCEPTED', now());
            RAISE NOTICE 'ryoma をオーナーとして追加しました';
        ELSE
            RAISE NOTICE 'グループ「家族」は既に存在します (id=%)', v_group_id;
        END IF;

        -- ============================================================
        --  2. メンバー追加（nanaho）
        -- ============================================================
        SELECT EXISTS(
            SELECT 1 FROM group_members
            WHERE group_id = v_group_id AND username = 'nanaho'
        ) INTO v_nanaho_exists;

        IF NOT v_nanaho_exists THEN
            INSERT INTO group_members (group_id, username, role, status, created_at)
            VALUES (v_group_id, 'nanaho', 'MEMBER', 'ACCEPTED', now());
            RAISE NOTICE 'nanaho をメンバーとして追加しました';
        ELSE
            RAISE NOTICE 'nanaho は既にメンバーです';
        END IF;

        -- ryoma がメンバーになっているか確認（オーナー追加はグループ作成時に行うため、通常は不要）
        SELECT EXISTS(
            SELECT 1 FROM group_members
            WHERE group_id = v_group_id AND username = 'ryoma'
        ) INTO v_ryoma_exists;

        IF NOT v_ryoma_exists THEN
            INSERT INTO group_members (group_id, username, role, status, created_at)
            VALUES (v_group_id, 'ryoma', 'MEMBER', 'ACCEPTED', now());
            RAISE NOTICE 'ryoma をメンバーとして追加しました（オーナーとは別に）';
        END IF;

        -- ============================================================
        --  3. 既存予定をグループと紐付け
        -- ============================================================

        -- ryoma の予定を紐付け（まだ紐付いていないもののみ）
        INSERT INTO schedule_groups (schedule_id, group_id)
        SELECT s.id, v_group_id
        FROM schedules s
        WHERE s.owner = 'ryoma'
          AND NOT EXISTS (
              SELECT 1 FROM schedule_groups sg
              WHERE sg.schedule_id = s.id AND sg.group_id = v_group_id
          );
        GET DIAGNOSTICS v_ryoma_count = ROW_COUNT;
        IF v_ryoma_count > 0 THEN
            RAISE NOTICE 'ryoma の予定 % 件を「家族」に紐付けました', v_ryoma_count;
        ELSE
            RAISE NOTICE 'ryoma の紐付け対象予定はありませんでした';
        END IF;

        -- nanaho の予定を紐付け（まだ紐付いていないもののみ）
        INSERT INTO schedule_groups (schedule_id, group_id)
        SELECT s.id, v_group_id
        FROM schedules s
        WHERE s.owner = 'nanaho'
          AND NOT EXISTS (
              SELECT 1 FROM schedule_groups sg
              WHERE sg.schedule_id = s.id AND sg.group_id = v_group_id
          );
        GET DIAGNOSTICS v_nanaho_count = ROW_COUNT;
        IF v_nanaho_count > 0 THEN
            RAISE NOTICE 'nanaho の予定 % 件を「家族」に紐付けました', v_nanaho_count;
        ELSE
            RAISE NOTICE 'nanaho の紐付け対象予定はありませんでした';
        END IF;
    END
    \$\$;

EOSQL

echo ""
echo "=== Migration complete ==="
echo ""
echo "確認:"
echo "  # グループ一覧"
echo "  SELECT id, name, owner_username FROM groups WHERE name = '家族';"
echo ""
echo "  # グループメンバー"
echo "  SELECT gm.group_id, g.name, gm.username, gm.role, gm.status"
echo "  FROM group_members gm"
echo "  JOIN groups g ON g.id = gm.group_id"
echo "  WHERE g.name = '家族';"
echo ""
echo "  # グループに紐付いた予定"
echo "  SELECT sg.schedule_id, s.title, s.owner"
echo "  FROM schedule_groups sg"
echo "  JOIN schedules s ON s.id = sg.schedule_id"
echo "  JOIN groups g ON g.id = sg.group_id"
echo "  WHERE g.name = '家族';"
