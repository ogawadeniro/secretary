#!/bin/bash
set -eu

# ============================================================
# secretary — Rocky Linux 9.4 デプロイスクリプト
#
# 使い方（初回セットアップ済みの場合）:
#   export GHCR_USER=ogawadeniro
#   export GHCR_TOKEN=your-github-pat
#   export DB_PASSWORD=your-db-password
#   bash deploy.sh
#
# 初回セットアップ（Docker, DB）:
#   bash setup-server.sh
#
# 環境変数デフォルト値:
#   IMAGE          = ghcr.io/ogawadeniro/secretary:latest
#   DB_URL         = jdbc:postgresql://localhost:5432/secretary
#   DB_USERNAME    = rogawa
#   CONTAINER_NAME = secretary
# ============================================================

REPO="${GITHUB_REPOSITORY:-$(git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null || echo 'secretary')}"
IMAGE="${IMAGE:-ghcr.io/ogawadeniro/secretary:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-secretary}"
DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/secretary}"
DB_USERNAME="${DB_USERNAME:-rogawa}"
SSL_PORT="${SSL_PORT:-}"
SSL_KEYSTORE_PASSWORD="${SSL_KEYSTORE_PASSWORD:-}"

# ---------- 前提チェック ----------
check_prerequisites() {
    if ! command -v docker &>/dev/null; then
        echo "ERROR: Docker not found. Run 'bash setup-server.sh' first."
        exit 1
    fi
    if ! docker info &>/dev/null; then
        echo "ERROR: Cannot connect to Docker daemon."
        echo "  Permission denied? 以下のいずれかを試してね:"
        echo "    newgrp docker        # グループを即時反映"
        echo "    または"
        echo "    ログアウトして再ログイン"
        exit 1
    fi
    if [ -z "${DB_PASSWORD:-}" ]; then
        echo "ERROR: DB_PASSWORD is not set."
        echo "  export DB_PASSWORD=your-db-password"
        exit 1
    fi
}

# ---------- GHCRログイン ----------
ghcr_login() {
    if [ -n "${GHCR_TOKEN:-}" ]; then
        echo "=== Logging in to GHCR ==="
        echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
    fi
}

# ---------- デプロイ ----------
deploy() {
    echo "=== Pulling image: ${IMAGE} ==="
    docker pull "${IMAGE}"

    echo "=== Stopping existing container ==="
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    docker rm "${CONTAINER_NAME}" 2>/dev/null || true

    echo "=== Starting container: ${CONTAINER_NAME} ==="

    local docker_opts=(
        --name "${CONTAINER_NAME}"
        --restart unless-stopped
        --network host
        -e SPRING_PROFILES_ACTIVE=product
        -e SPRING_DATASOURCE_URL="${DB_URL}"
        -e SPRING_DATASOURCE_USERNAME="${DB_USERNAME}"
        -e SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}"
    )

    # HTTPS設定（keystoreがあれば注入）
    if [ -f /etc/secretary/keystore.p12 ] && [ -n "$SSL_KEYSTORE_PASSWORD" ]; then
        docker_opts+=(
            -e SERVER_PORT="${SSL_PORT:-8443}"
            -e SERVER_SSL_KEY_STORE=file:/etc/secretary/keystore.p12
            -e SERVER_SSL_KEY_STORE_PASSWORD="${SSL_KEYSTORE_PASSWORD}"
            -e SERVER_SSL_KEY_STORE_TYPE=PKCS12
            -e SERVER_SSL_KEY_ALIAS=secretary
        )
        echo "  HTTPS enabled on port ${SSL_PORT:-8443}"
    elif [ -f /etc/secretary/keystore.p12 ]; then
        echo "  WARNING: keystore exists but SSL_KEYSTORE_PASSWORD not set. Skipping HTTPS."
    fi

    # keystoreディレクトリをマウント
    if [ -d /etc/secretary ]; then
        docker_opts+=(-v /etc/secretary:/etc/secretary:ro)
        echo "  Mounted /etc/secretary (read-only)"
    fi

    docker run -d "${docker_opts[@]}" "${IMAGE}"

    echo "=== Container started ==="
    docker logs --tail 20 "${CONTAINER_NAME}"
}

# ---------- ヘルスチェック ----------
health_check() {
    echo "=== Health check ==="
    sleep 3
    if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" --format "{{.Names}}" | grep -q "${CONTAINER_NAME}"; then
        echo "OK: ${CONTAINER_NAME} is running"
        local scheme="http"
        local port="8080"
        if [ -f /etc/secretary/keystore.p12 ] && [ -n "$SSL_KEYSTORE_PASSWORD" ]; then
            scheme="https"
            port="${SSL_PORT:-8443}"
            curl -sk -o /dev/null -w "HTTP %{http_code}" "${scheme}://localhost:${port}/api/v1/schedules" || echo " (API not ready yet)"
        else
            curl -s -o /dev/null -w "HTTP %{http_code}" "${scheme}://localhost:${port}/api/v1/schedules" || echo " (API not ready yet)"
        fi
        echo ""
    else
        echo "FAIL: ${CONTAINER_NAME} is not running"
        docker logs "${CONTAINER_NAME}" 2>/dev/null || true
        exit 1
    fi
}

# ---------- メイン ----------
main() {
    echo "============================================"
    echo " Secretary - Deploy"
    echo "============================================"
    check_prerequisites
    ghcr_login
    deploy
    health_check
    echo "============================================"
    echo " Deploy complete!"
    if [ -f /etc/secretary/keystore.p12 ] && [ -n "$SSL_KEYSTORE_PASSWORD" ]; then
        local port="${SSL_PORT:-8443}"
        echo " Web UI: https://localhost:${port}/"
        echo " API:    https://localhost:${port}/api/v1/schedules"
    else
        echo " Web UI: http://localhost:8080/"
        echo " API:    http://localhost:8080/api/v1/schedules"
    fi
    echo "============================================"
}

main "$@"
