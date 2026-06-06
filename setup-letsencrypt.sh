#!/bin/bash
# secretary — Let's Encrypt 証明書セットアップスクリプト
# 使い方: bash setup-letsencrypt.sh
# 
# 前提:
#   - Rocky Linux 9.4 で動作確認
#   - ドメインが本番サーバのIPを指していること
#   - ポート80/443が空いていること
set -euo pipefail

DOMAIN="${1:-tk2-245-32038.vs.sakura.ne.jp}"
KEYSTORE_DIR="/etc/secretary"
KEYSTORE_FILE="${KEYSTORE_DIR}/keystore.p12"
PASSWORD_FILE="${KEYSTORE_DIR}/keystore-password.txt"

echo "============================================"
echo " Let's Encrypt 証明書セットアップ"
echo " ドメイン: ${DOMAIN}"
echo "============================================"

# ---------- certbot インストール ----------
install_certbot() {
    if command -v certbot &>/dev/null; then
        echo "=== certbot already installed ==="
        return
    fi
    echo "=== Installing certbot ==="
    sudo dnf install -y epel-release
    sudo dnf install -y certbot
    echo "=== certbot installed ==="
}

# ---------- 証明書取得 ----------
get_certificate() {
    if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
        echo "=== Certificate already exists for ${DOMAIN} ==="
        return
    fi

    echo "=== Obtaining certificate for ${DOMAIN} ==="
    echo "!!! ポート80を一時的に解放します"
    echo "    socat（443→8443）が動いていたら一時停止します"

    # socat を一時停止
    sudo pkill -f "socat.*LISTEN:443" 2>/dev/null || true

    # nftables でポート80を許可
    if ! sudo nft list chain ip filter INPUT 2>/dev/null | grep -q "tcp dport 80"; then
        sudo nft insert rule ip filter INPUT ip protocol tcp tcp dport 80 counter accept
    fi

    # certbot standalone で証明書取得
    sudo certbot certonly --standalone \
        -d "${DOMAIN}" \
        --non-interactive \
        --agree-tos \
        --email "admin@${DOMAIN}" \
        --preferred-challenges http

    echo "=== Certificate obtained ==="
}

# ---------- PKCS12 に変換 ----------
convert_to_pkcs12() {
    echo "=== Converting to PKCS12 ==="
    local cert_dir="/etc/letsencrypt/live/${DOMAIN}"
    local password
    password=$(openssl rand -base64 32)
    echo "$password" | sudo tee "${PASSWORD_FILE}" > /dev/null
    sudo chmod 600 "${PASSWORD_FILE}"

    sudo mkdir -p "${KEYSTORE_DIR}"

    # Let's Encrypt → PKCS12 に変換
    sudo openssl pkcs12 -export \
        -in "${cert_dir}/fullchain.pem" \
        -inkey "${cert_dir}/privkey.pem" \
        -out "${KEYSTORE_FILE}" \
        -name secretary \
        -password "pass:${password}"

    sudo chmod 600 "${KEYSTORE_FILE}"
    echo "=== PKCS12 keystore generated: ${KEYSTORE_FILE} ==="
}

# ---------- 自動更新設定 ----------
setup_auto_renew() {
    echo "=== Setting up auto-renewal ==="

    # certbot の更新フックを作成（証明書更新時にキーストアを再生成）
    sudo mkdir -p "/etc/letsencrypt/renewal-hooks/post"
    sudo tee "/etc/letsencrypt/renewal-hooks/post/secretary-keystore.sh" > /dev/null <<EOF
#!/bin/bash
# Let's Encrypt 証明書更新後に secretary のキーストアを更新
set -euo pipefail

KEYSTORE_DIR="${KEYSTORE_DIR}"
KEYSTORE_FILE="${KEYSTORE_FILE}"
PASSWORD_FILE="${PASSWORD_FILE}"
DOMAIN="${DOMAIN}"
CERT_DIR="/etc/letsencrypt/live/\${DOMAIN}"

# パスワード生成
PASSWORD=\$(openssl rand -base64 32)
echo "\$PASSWORD" | sudo tee "\$PASSWORD_FILE" > /dev/null
sudo chmod 600 "\$PASSWORD_FILE"

# PKCS12 に変換
sudo openssl pkcs12 -export \
    -in "\${CERT_DIR}/fullchain.pem" \
    -inkey "\${CERT_DIR}/privkey.pem" \
    -out "\$KEYSTORE_FILE" \
    -name secretary \
    -password "pass:\$PASSWORD"

sudo chmod 600 "\$KEYSTORE_FILE"

# Dockerコンテナを再起動して新しい証明書を読み込ませる
docker restart secretary 2>/dev/null || true
EOF

    sudo chmod +x "/etc/letsencrypt/renewal-hooks/post/secretary-keystore.sh"

    # systemd timer（certbot の自動更新はデフォルトで有効）
    echo "=== Auto-renewal configured ==="
    echo "    証明書の自動更新: certbot renew (systemd timer)"
    echo "    更新後フック:     secretary-keystore.sh → Docker再起動"
}

# ---------- ポート80 の後片付け ----------
cleanup_ports() {
    echo "=== Cleaning up ==="
    # ポート80のnftablesルールを削除
    sudo nft delete rule ip filter INPUT handle "$(sudo nft -a list chain ip filter INPUT 2>/dev/null | grep 'tcp dport 80' | grep -o 'handle [0-9]*' | cut -d' ' -f2)" 2>/dev/null || true
    echo "=== Port 80 rule removed ==="
}

# ---------- 完了メッセージ ----------
print_summary() {
    echo ""
    echo "============================================"
    echo " Let's Encrypt セットアップ完了！"
    echo "============================================"
    echo ""
    echo " 証明書: ${DOMAIN}"
    echo " 有効期限: 90日（自動更新）"
    echo " キーストア: ${KEYSTORE_FILE}"
    echo ""
    echo " ブラウザで https://${DOMAIN}/ にアクセスして確認してみてね！"
    echo "（デプロイ後に反映されるよ）"
    echo ""
    echo " 手動で更新したいとき:"
    echo "   sudo certbot renew"
    echo ""
    echo " 今すぐキーストアだけ再生成したいとき:"
    echo "   sudo bash /etc/letsencrypt/renewal-hooks/post/secretary-keystore.sh"
    echo ""
}

# ---------- メイン ----------
main() {
    install_certbot
    get_certificate
    convert_to_pkcs12
    setup_auto_renew
    cleanup_ports
    print_summary
}

main "$@"
