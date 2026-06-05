#!/bin/bash
set -eu

PROD_HOST="${PROD_HOST:-tk2-245-32038.vs.sakura.ne.jp}"
PROD_USER="${PROD_USER:-rocky}"
IMAGE_NAME="${IMAGE_NAME:-secretary}"
JAR_FILE="target/secretary-0.0.1-SNAPSHOT.jar"

red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }
cyan() { echo -e "\033[36m$1\033[0m"; }
bold() { echo -e "\033[1m$1\033[0m"; }

step() {
    echo ""
    cyan "◆ $1"
}
ok() { echo "$(green "[OK]") $1"; }
warn() { echo "$(yellow "[WARN]") $1"; }
fail() { echo "$(red "[ERR]") $1"; }
info() { echo "[info] $1"; }

calc_width() {
    local url="https://${PROD_HOST}/"
    # "  Access: " + url = 10 + url_len, plus 6 for borders and breathing room
    local w=$((${#url} + 16))
    [ $w -lt 44 ] && w=44
    echo $w
}

header() {
    local width=$1
    local text="Secretary - Deploy"
    local left_pad=$(( (width - 2 - ${#text}) / 2 ))
    local right_pad=$(( width - 2 - ${#text} - left_pad ))
    local border
    printf -v border '%*s' "$((width - 2))" ''
    border="${border// /═}"
    echo ""
    echo "$(cyan "╔${border}╗")"
    printf "$(cyan '║')%*s%s%*s$(cyan '║')\n" $left_pad "" "$text" $right_pad ""
    echo "$(cyan "╚${border}╝")"
}

footer() {
    local width=$1
    local url="https://${PROD_HOST}/"
    # │ + 2spaces + "Access: " + url + pad + │ = 12 + url + pad
    local pad=$(( width - 12 - ${#url} ))
    [ $pad -lt 2 ] && pad=2
    local border
    printf -v border '%*s' "$((width - 2))" ''
    border="${border// /─}"
    echo ""
    echo "$(cyan "┌${border}┐")"
    printf "$(cyan '│')  $(bold 'Access:') %s%*s$(cyan '│')\n" "${url}" $pad ""
    echo "$(cyan "└${border}┘")"
    echo ""
}

load_keystore_password() {
    if [ -n "${SSL_KEYSTORE_PASSWORD:-}" ]; then
        return
    fi
    step "Reading keystore password from server..."
    SSL_KEYSTORE_PASSWORD=$(ssh "${PROD_USER}@${PROD_HOST}" "sudo cat /etc/secretary/keystore-password.txt 2>/dev/null" 2>/dev/null || true)
    if [ -z "$SSL_KEYSTORE_PASSWORD" ]; then
        warn "keystore not found. HTTPS will be disabled."
    else
        ok "keystore password loaded."
    fi
}

check_prerequisites() {
    if [ -z "${SECRETARY_DB_PASSWORD:-}" ]; then
        fail "SECRETARY_DB_PASSWORD not set."
        info "  export SECRETARY_DB_PASSWORD=your-password"
        exit 1
    fi
    if [ ! -f "$JAR_FILE" ]; then
        step "Building JAR (React + Spring Boot)..."
        bash build.sh
        ok "JAR built."
    fi
}

transfer_files() {
    step "Transferring files to $(bold "${PROD_USER}@${PROD_HOST}")..."
    ssh "${PROD_USER}@${PROD_HOST}" "mkdir -p ~/secretary/target"
    scp "$JAR_FILE" "${PROD_USER}@${PROD_HOST}:~/secretary/target/"
    scp Dockerfile .dockerignore "${PROD_USER}@${PROD_HOST}:~/secretary/"
    ok "transfer complete."
}

build_and_run_remote() {
    step "Building image and starting container on remote..."

    ssh "${PROD_USER}@${PROD_HOST}" "SECRETARY_DB_PASSWORD='${SECRETARY_DB_PASSWORD}' SSL_KEYSTORE_PASSWORD='${SSL_KEYSTORE_PASSWORD:-}' bash -s" <<'REMOTE'
        set -eu
        IMAGE_NAME="secretary"
        CONTAINER_NAME="secretary"

        remote_info()  { echo "[INFO] $1"; }
        remote_ok()    { echo -e "\033[32m[OK]\033[0m $1"; }
        remote_warn()  { echo -e "\033[33m[WARN]\033[0m $1"; }
        remote_step()  { echo ""; echo -e "\033[36m◇ $1\033[0m"; }

        cd ~/secretary

        if pgrep -f "secretary.*SNAPSHOT" > /dev/null; then
            remote_step "Stopping old Java process..."
            pkill -f "secretary.*SNAPSHOT" 2>/dev/null || true
            sleep 2
            remote_ok "stopped."
        fi

        remote_step "Building Docker image..."
        docker build -t "${IMAGE_NAME}:latest" .
        remote_ok "image built."

        remote_step "Stopping old container..."
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        remote_ok "stopped."

        # nftables で port 443 を許可（なければ追加）
        if ! sudo nft list chain ip filter INPUT 2>/dev/null | grep -q "tcp dport 443"; then
            remote_step "Adding nftables rule for port 443..."
            sudo nft insert rule ip filter INPUT ip protocol tcp tcp dport 443 counter accept
            remote_ok "nftables rule added."
        fi

        if ! pgrep -f "socat.*LISTEN:443" > /dev/null; then
            remote_step "Starting socat (443 → 8443)..."
            sudo nohup socat TCP-LISTEN:443,fork,reuseaddr TCP:localhost:8443 > /dev/null 2>&1 &
            remote_ok "socat started."
        fi

        remote_step "Starting container..."
        docker run -d \
            --name "${CONTAINER_NAME}" \
            --restart unless-stopped \
            --network host \
            -e SPRING_PROFILES_ACTIVE=product \
            -e SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/secretary" \
            -e SPRING_DATASOURCE_USERNAME=rogawa \
            -e SPRING_DATASOURCE_PASSWORD="${SECRETARY_DB_PASSWORD}" \
            -e SERVER_PORT=8443 \
            -e SERVER_SSL_KEY_STORE=file:/etc/secretary/keystore.p12 \
            -e SERVER_SSL_KEY_STORE_PASSWORD="${SSL_KEYSTORE_PASSWORD:-}" \
            -e SERVER_SSL_KEY_STORE_TYPE=PKCS12 \
            -e SERVER_SSL_KEY_ALIAS=secretary \
            -v /etc/secretary:/etc/secretary:ro \
            "${IMAGE_NAME}:latest"

        remote_ok "container started."

        remote_step "Health check..."
        retries=0
        max_retries=10
        while [ $retries -lt $max_retries ]; do
            sleep 3
            http_code=$(curl -sk -o /dev/null -w "%{http_code}" https://localhost:8443/api/v1/schedules 2>/dev/null || true)
            if [ "$http_code" = "200" ]; then
                remote_ok "Application is running! (HTTP 200)"
                break
            fi
            retries=$((retries + 1))
            remote_info "waiting... ($((retries * 3))s, HTTP ${http_code})"
        done
        if [ $retries -ge $max_retries ]; then
            remote_warn "Health check failed after $((max_retries * 3))s. Check: docker logs ${CONTAINER_NAME}"
        fi
REMOTE
}

internet_health_check() {
    step "Internet health check..."
    sleep 2
    local http_code
    http_code=$(curl -sk -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://${PROD_HOST}/api/v1/schedules" 2>/dev/null || true)
    if [ "$http_code" = "200" ]; then
        ok "https://${PROD_HOST}/ answered with HTTP 200"
    else
        warn "https://${PROD_HOST}/ returned HTTP ${http_code:-"connection failed"}"
    fi
}

main() {
    local width
    width=$(calc_width)
    header $width
    check_prerequisites
    load_keystore_password
    transfer_files
    build_and_run_remote
    internet_health_check
    footer $width
}

main "$@"
