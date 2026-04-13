#!/bin/bash
# ============================================================
#  AutoFlotta — Script di setup automatico VPS
#  Ubuntu 24.04 LTS
#  Esegui come root: bash vps-setup.sh
# ============================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERRORE]${NC} $1"; exit 1; }

APP_DIR="/var/www/autoflotta"
REPO="https://github.com/hercoleg03/Car-Booking-Portal.git"

echo ""
echo "=============================================="
echo "   AutoFlotta — Setup VPS automatico"
echo "=============================================="
echo ""

# ── Configurazione interattiva ─────────────────────────────
read -p "IP o dominio della VPS (es. 107.173.254.121): " SERVER_HOST
read -p "Password database PostgreSQL (inventala): " DB_PASS
read -p "Username admin portale [admin]: " PORTAL_USER
PORTAL_USER=${PORTAL_USER:-admin}
read -s -p "Password admin portale: " PORTAL_PASS
echo ""
read -s -p "SESSION_SECRET (lascia vuoto per generarne uno): " SESSION_SECRET
echo ""
if [ -z "$SESSION_SECRET" ]; then
  SESSION_SECRET=$(openssl rand -base64 48)
  info "SESSION_SECRET generato automaticamente"
fi

echo ""
info "Avvio installazione..."

# ── 1. Aggiorna sistema ────────────────────────────────────
info "Aggiornamento sistema..."
apt-get update -qq && apt-get upgrade -y -qq
success "Sistema aggiornato"

# ── 2. Node.js 20 ──────────────────────────────────────────
info "Installazione Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt-get install -y nodejs -qq
success "Node.js $(node -v) installato"

# ── 3. pnpm ────────────────────────────────────────────────
info "Installazione pnpm..."
npm install -g pnpm pm2 --silent
success "pnpm $(pnpm -v) e pm2 installati"

# ── 4. PostgreSQL ──────────────────────────────────────────
info "Installazione PostgreSQL..."
apt-get install -y postgresql postgresql-contrib -qq
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER autoflotta WITH PASSWORD '$DB_PASS';" 2>/dev/null || \
  warn "Utente autoflotta già esistente (ok)"
sudo -u postgres psql -c "CREATE DATABASE autoflotta OWNER autoflotta;" 2>/dev/null || \
  warn "Database autoflotta già esistente (ok)"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE autoflotta TO autoflotta;" > /dev/null
success "PostgreSQL configurato (db: autoflotta)"

# ── 5. nginx + git ────────────────────────────────────────
info "Installazione nginx e git..."
apt-get install -y nginx git -qq
success "nginx e git installati"

# ── 6. Clona repository da GitHub ─────────────────────────
info "Download progetto da GitHub..."
if [ -d "$APP_DIR/.git" ]; then
  warn "Progetto già presente — aggiorno all'ultima versione"
  cd "$APP_DIR" && git pull origin main
else
  rm -rf "$APP_DIR"
  git clone "$REPO" "$APP_DIR"
fi
success "Progetto scaricato in $APP_DIR"

# ── 7. Dipendenze progetto ─────────────────────────────────
info "Installazione dipendenze npm..."
cd "$APP_DIR"
pnpm install --silent
success "Dipendenze installate"

# ── 8. File .env ───────────────────────────────────────────
info "Creazione file .env..."
cat > "$APP_DIR/artifacts/api-server/.env" <<EOF
DATABASE_URL=postgresql://autoflotta:${DB_PASS}@localhost:5432/autoflotta
SESSION_SECRET=${SESSION_SECRET}
PORT=8080
NODE_ENV=production
PORTAL_USERNAME=${PORTAL_USER}
PORTAL_PASSWORD=${PORTAL_PASS}
EOF
chmod 600 "$APP_DIR/artifacts/api-server/.env"
success "File .env creato"

# ── 9. Migration database ──────────────────────────────────
info "Esecuzione migration database..."
cd "$APP_DIR"
export DATABASE_URL="postgresql://autoflotta:${DB_PASS}@localhost:5432/autoflotta"
pnpm --filter @workspace/db run push
success "Schema database applicato"

# ── 10. Build frontend ─────────────────────────────────────
info "Build frontend React..."
pnpm --filter @workspace/concessionaria run build
success "Frontend compilato"

# ── 11. Build backend ──────────────────────────────────────
info "Build backend Node.js..."
pnpm --filter @workspace/api-server run build
success "Backend compilato"

# ── 12. PM2 ────────────────────────────────────────────────
info "Avvio backend con pm2..."
cd "$APP_DIR/artifacts/api-server"
pm2 delete autoflotta-api 2>/dev/null || true
pm2 start dist/index.mjs --name autoflotta-api
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash
success "Backend avviato con pm2"

# ── 13. nginx ──────────────────────────────────────────────
info "Configurazione nginx..."
cat > /etc/nginx/sites-available/autoflotta <<EOF
server {
    listen 80;
    server_name ${SERVER_HOST};

    root ${APP_DIR}/artifacts/concessionaria/dist/public;
    index index.html;

    # Limite dimensione upload foto (20MB)
    client_max_body_size 20M;

    # Frontend SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API backend
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 20M;
    }

    # Compressione
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/autoflotta /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
success "nginx configurato e avviato"

# ── Fine ───────────────────────────────────────────────────
echo ""
echo "=============================================="
echo -e "${GREEN}   Installazione completata!${NC}"
echo "=============================================="
echo ""
echo -e "  Portale:   ${CYAN}http://${SERVER_HOST}${NC}"
echo -e "  Username:  ${CYAN}${PORTAL_USER}${NC}"
echo -e "  Password:  ${CYAN}${PORTAL_PASS}${NC}"
echo ""
echo "  Comandi utili:"
echo "    pm2 status           — stato del backend"
echo "    pm2 logs autoflotta-api  — log in tempo reale"
echo "    systemctl reload nginx   — ricarica nginx"
echo ""
echo -e "${YELLOW}  Vuoi HTTPS gratuito? Esegui:${NC}"
echo "    apt install certbot python3-certbot-nginx -y"
echo "    certbot --nginx -d tuodominio.com"
echo ""
