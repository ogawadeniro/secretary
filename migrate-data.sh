#!/bin/bash
set -eu

# secretary 既存データ移行スクリプト
# 旧ユーザー名から新ユーザー名へのデータ移行を行う。
#   ssh経由で本番サーバのDBに接続して実行する。
#
# 使い方:
#   1. 本番サーバにSSHでログインする
#   2. sudo -u postgres で実行するか、DB管理者権限のあるユーザーで実行
#   3. bash migrate-data.sh

DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-secretary}"
DB_USER="${DB_USER:-rogawa}"

echo "=== secretary Data Migration ==="
echo "DB: ${DB_HOST}/${DB_NAME} as ${DB_USER}"
echo ""

psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
    -- 1. りょうま → ryoma（owner変更のみ）
    UPDATE schedules SET owner = 'ryoma' WHERE owner = 'りょうま';

    -- 2. りょうまななほ → ryoma（owner変更）
    --     メンバーnanahoを追加してからownerを変更する
    INSERT INTO schedule_members (schedule_id, username)
    SELECT id, 'nanaho' FROM schedules s
    WHERE s.owner = 'りょうまななほ'
      AND NOT EXISTS (
          SELECT 1 FROM schedule_members sm
          WHERE sm.schedule_id = s.id AND sm.username = 'nanaho'
      );
    UPDATE schedules SET owner = 'ryoma' WHERE owner = 'りょうまななほ';

    -- 3. ななほ → nanaho（owner変更のみ）
    UPDATE schedules SET owner = 'nanaho' WHERE owner = 'ななほ';
EOSQL

echo "=== Data Migration complete ==="
