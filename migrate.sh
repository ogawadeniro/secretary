#!/bin/bash
set -eu

# ============================================================
# secretary — DBマイグレーションスクリプト
#
# 旧コードではカラム名 `datetime` だったが、
# リファクタ後は JPA フィールド名 startDatetime に統一し、
# DBカラムは start_datetime になった。
#
# このスクリプトは既存テーブルを新しいスキーマに合わせる。
#
# 使い方:
#   export DB_HOST=localhost
#   export DB_ADMIN_USER=postgres
#   export DB_ADMIN_PASSWORD=your-password
#   bash migrate.sh
# ============================================================

DB_HOST="${DB_HOST:-localhost}"
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"
DB_NAME="${DB_NAME:-secretary}"

PSQL="psql -h ${DB_HOST} -U ${DB_ADMIN_USER} -d ${DB_NAME}"

check_column() {
    ${PSQL} -Atc "
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'schedules' AND column_name = '$1';
    "
}

backup_table() {
    local backup_file="schedules_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo "=== Backing up schedules table to ${backup_file} ==="
    pg_dump -h "${DB_HOST}" -U "${DB_ADMIN_USER}" \
        --data-only --table=schedules "${DB_NAME}" > "${backup_file}"
    echo "    Backup saved to ${backup_file}"
}

main() {
    echo "============================================"
    echo " Secretary - DB Migration"
    echo "============================================"

    # バックアップ
    backup_table

    # 現在のカラム構成を確認
    local has_datetime
    has_datetime=$(check_column "datetime")

    local has_start_datetime
    has_start_datetime=$(check_column "start_datetime")

    echo ""
    echo "=== Checking schedules table columns ==="

    if [ -n "${has_datetime}" ] && [ -z "${has_start_datetime}" ]; then
        echo "    Found: datetime (old naming)"
        echo "    Missing: start_datetime"
        echo "=== Renaming datetime -> start_datetime ==="
        ${PSQL} -c "ALTER TABLE schedules RENAME COLUMN datetime TO start_datetime;"
        echo "    Done!"
    elif [ -n "${has_start_datetime}" ]; then
        echo "    Found: start_datetime (already correct)"
        echo "=== No migration needed ==="
    else
        echo "    ERROR: Neither 'datetime' nor 'start_datetime' column found."
        echo "    Check the table structure manually."
        exit 1
    fi

    echo ""
    echo "=== Final schema verification ==="
    ${PSQL} -c "\d schedules"

    echo ""
    echo "============================================"
    echo " Migration complete!"
    echo "============================================"
}

main "$@"
