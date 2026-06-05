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
#   IMAGE         = ghcr.io/<リポジトリ>/secretary:latest
#   DB_URL        = jdbc:postgresql://192.168.40.254:5432/secretary
#   DB_USERNAME   = rogawa
#   CONTAINER_NAME = secretary
#   HOST_PORT     = 8080
# ============================================================

REPO="${GITHUB_REPOSITORY:-$(git rev-parse --show-toplevel 2>/dev/null | xargs basename 2>/dev/null || echo 'secretary')}"
IMAGE="${IMAGE:-ghcr.io/${GHCR_USER}/${REPO}:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-secretary}"
HOST_PORT="${HOST_PORT:-8080}"
DB_URL="${DB_URL:-jdbc:postgresql://192.168.40.254:5432/secretary}"
DB_USERNAME="${DB_USERNAME:-rogawa}"

# ---------- 前提チェック ----------
check_prerequisites() {
    if ! command -v docker &>/dev/null; then
        echo "ERROR: Docker not found. Run 'bash setup-server.sh' first."
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
    docker run -d \
        --name "${CONTAINER_NAME}" \
        --restart unless-stopped \
        -p "${HOST_PORT}:8080" \
        -e SPRING_DATASOURCE_URL="${DB_URL}" \
        -e SPRING_DATASOURCE_USERNAME="${DB_USERNAME}" \
        -e SPRING_DATASOURCE_PASSWORD="${DB_PASSWORD}" \
        "${IMAGE}"

    echo "=== Container started ==="
    docker logs --tail 20 "${CONTAINER_NAME}"
}

# ---------- ヘルスチェック ----------
health_check() {
    echo "=== Health check ==="
    sleep 3
    if docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" --format "{{.Names}}" | grep -q "${CONTAINER_NAME}"; then
        echo "OK: ${CONTAINER_NAME} is running"
        curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:${HOST_PORT}/api/v1/schedules || echo " (API not ready yet)"
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
    echo " Web UI: http://localhost:${HOST_PORT}/"
    echo " API:    http://localhost:${HOST_PORT}/api/v1/schedules"
    echo "============================================"
}

main "$@"
