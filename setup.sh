#!/bin/bash
# GMod TTT Server Panel - Installation Script
# Dieses Script installiert das Web Panel auf einem Linux-Root-Server

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Prüfe Root-Rechte
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Dieses Script muss als root ausgeführt werden!"
        exit 1
    fi
}

# Erkenne Linux-Distribution
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "Kann Betriebssystem nicht erkennen!"
        exit 1
    fi
    log_info "Erkannte OS: $OS $VER"
}

# Installiere System-Abhängigkeiten
install_system_deps() {
    log_info "Installiere System-Abhängigkeiten..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt update
        apt install -y python3 python3-pip python3-venv nginx supervisor git curl wget
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        yum update -y
        yum install -y python3 python3-pip nginx supervisor git curl wget
    else
        log_warning "Unbekannte Distribution. Installiere manuell: python3, python3-pip, python3-venv, nginx, supervisor"
    fi
}

# Erstelle Benutzer für den Server
create_server_user() {
    log_info "Erstelle Server-Benutzer 'gmod'..."
    
    if ! id "gmod" &>/dev/null; then
        useradd -m -s /bin/bash gmod
        log_success "Benutzer 'gmod' erstellt"
    else
        log_info "Benutzer 'gmod' existiert bereits"
    fi
    
    # Erstelle notwendige Verzeichnisse
    mkdir -p /home/gmod/server
    mkdir -p /home/gmod/panel
    mkdir -p /home/gmod/backups
    chown -R gmod:gmod /home/gmod
}

# Installiere Python-Abhängigkeiten
install_python_deps() {
    log_info "Installiere Python-Abhängigkeiten..."
    
    cd /home/gmod/panel
    
    # Erstelle Virtual Environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Installiere Requirements
    pip install -r requirements.txt
    
    log_success "Python-Abhängigkeiten installiert"
}

# Konfiguriere Nginx
configure_nginx() {
    log_info "Konfiguriere Nginx..."
    
    cat > /etc/nginx/sites-available/gmod-panel << 'EOF'
server {
    listen 80;
    server_name _;  # Ändere dies zu deiner Domain
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        proxy_buffering off;
    }
    
    location /static {
        alias /home/gmod/panel/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF
    
    # Aktiviere Site
    ln -sf /etc/nginx/sites-available/gmod-panel /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Teste Nginx Config
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    log_success "Nginx konfiguriert"
}

# Konfiguriere Supervisor
configure_supervisor() {
    log_info "Konfiguriere Supervisor..."
    
    cat > /etc/supervisor/conf.d/gmod-panel.conf << 'EOF'
[program:gmod-panel]
command=/home/gmod/panel/venv/bin/python app.py
directory=/home/gmod/panel
user=gmod
group=gmod
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/gmod-panel.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=5
environment=FLASK_ENV="production"
EOF
    
    # Starte Supervisor Services
    systemctl restart supervisor
    systemctl enable supervisor
    supervisorctl reread
    supervisorctl update
    supervisorctl start gmod-panel
    
    log_success "Supervisor konfiguriert"
}

# Erstelle Systemd Service für GMod Server
create_gmod_service() {
    log_info "Erstelle GMod Server Service..."
    
    cat > /etc/systemd/system/gmod-ttt.service << 'EOF'
[Unit]
Description=Garry's Mod TTT Server
After=network.target

[Service]
Type=simple
User=gmod
Group=gmod
WorkingDirectory=/home/gmod/server
ExecStart=/home/gmod/server/srcds_run -game garrysmod +gamemode terrortown +map ttt_minecraft_b5 +maxplayers 32 +exec server.cfg -console
Restart=on-failure
RestartSec=5
KillMode=mixed
KillSignal=SIGINT
StandardOutput=append:/home/gmod/server/console.log
StandardError=append:/home/gmod/server/console.log

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable gmod-ttt
    
    log_success "GMod Service erstellt"
}

# Konfiguriere Firewall
configure_firewall() {
    log_info "Konfiguriere Firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        # Ubuntu/Debian UFW
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 27015/udp # GMod Server
        ufw allow 27015/tcp # GMod Server
        ufw --force enable
        log_success "UFW Firewall konfiguriert"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        # CentOS/RHEL firewalld
        firewall-cmd --permanent --add-port=22/tcp
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --permanent --add-port=27015/udp
        firewall-cmd --permanent --add-port=27015/tcp
        firewall-cmd --reload
        log_success "Firewalld konfiguriert"
    else
        log_warning "Kein unterstütztes Firewall-System gefunden. Konfiguriere manuell:"
        log_warning "  - Port 22 (SSH)"
        log_warning "  - Port 80 (HTTP)"
        log_warning "  - Port 443 (HTTPS)"
        log_warning "  - Port 27015 (GMod Server)"
    fi
}

# Erstelle Backup-Script
create_backup_script() {
    log_info "Erstelle Backup-Script..."
    
    cat > /home/gmod/backup.sh << 'EOF'
#!/bin/bash
# GMod Server Backup Script

BACKUP_DIR="/home/gmod/backups"
SERVER_DIR="/home/gmod/server"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gmod_backup_$TIMESTAMP.tar.gz"

# Stoppe Server für konsistentes Backup
systemctl stop gmod-ttt

# Erstelle Backup
tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$SERVER_DIR" .

# Starte Server wieder
systemctl start gmod-ttt

# Entferne alte Backups (behalte nur die letzten 10)
cd "$BACKUP_DIR"
ls -t gmod_backup_*.tar.gz | tail -n +11 | xargs -r rm

echo "Backup erstellt: $BACKUP_NAME"
EOF
    
    chmod +x /home/gmod/backup.sh
    chown gmod:gmod /home/gmod/backup.sh
    
    # Erstelle Cron-Job für automatische Backups
    (crontab -u gmod -l 2>/dev/null; echo "0 3 * * * /home/gmod/backup.sh") | crontab -u gmod -
    
    log_success "Backup-Script erstellt"
}

# Konfiguriere Logrotate
configure_logrotate() {
    log_info "Konfiguriere Logrotate..."
    
    cat > /etc/logrotate.d/gmod << 'EOF'
/home/gmod/server/console.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 gmod gmod
    postrotate
        systemctl reload gmod-ttt > /dev/null 2>&1 || true
    endscript
}

/var/log/gmod-panel.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 gmod gmod
}
EOF
    
    log_success "Logrotate konfiguriert"
}

# Setze Berechtigungen
set_permissions() {
    log_info "Setze Berechtigungen..."
    
    # Panel-Verzeichnis
    chown -R gmod:gmod /home/gmod/panel
    chmod -R 755 /home/gmod/panel
    
    # Server-Verzeichnis
    chown -R gmod:gmod /home/gmod/server
    chmod -R 755 /home/gmod/server
    
    # Backup-Verzeichnis
    chown -R gmod:gmod /home/gmod/backups
    chmod -R 755 /home/gmod/backups
    
    # Sudo-Rechte für Panel-Benutzer (nur für systemctl)
    echo "gmod ALL=(ALL) NOPASSWD: /bin/systemctl start gmod-ttt, /bin/systemctl stop gmod-ttt, /bin/systemctl restart gmod-ttt, /bin/systemctl status gmod-ttt" >> /etc/sudoers.d/gmod-panel
    
    log_success "Berechtigungen gesetzt"
}

# Erstelle Standard-Konfiguration
create_default_config() {
    log_info "Erstelle Standard-Konfiguration..."
    
    # Erstelle server.cfg falls nicht vorhanden
    if [[ ! -f /home/gmod/server/garrysmod/cfg/server.cfg ]]; then
        mkdir -p /home/gmod/server/garrysmod/cfg
        cat > /home/gmod/server/garrysmod/cfg/server.cfg << 'EOF'
// === GMod TTT Server Configuration ===
// Standard-Konfiguration vom Panel

hostname "GMod TTT Server - [DE] 24/7"
sv_password ""
maxplayers 32
sv_region 3
sv_lan 0

// RCON - ÄNDERE DAS PASSWORT!
rcon_password "changeme123"

// Netzwerk
sv_allowupload 1
sv_allowdownload 1
net_maxfilesize 64

// TTT Einstellungen
ttt_round_limit 6
ttt_time_limit_minutes 10
ttt_traitor_pct 0.25
ttt_detective_pct 0.13

echo "Server.cfg loaded!"
EOF
        chown gmod:gmod /home/gmod/server/garrysmod/cfg/server.cfg
    fi
    
    log_success "Standard-Konfiguration erstellt"
}

# SSL/HTTPS Setup (optional)
setup_ssl() {
    read -p "Möchten Sie SSL/HTTPS mit Let's Encrypt einrichten? (y/n): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Geben Sie Ihre Domain ein (z.B. panel.example.com): " DOMAIN
        
        if [[ -n "$DOMAIN" ]]; then
            # Installiere Certbot
            if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
                apt install -y certbot python3-certbot-nginx
            elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
                yum install -y certbot python3-certbot-nginx
            fi
            
            # Erhalte SSL-Zertifikat
            certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"
            
            # Auto-Renewal
            (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            
            log_success "SSL für $DOMAIN eingerichtet"
        else
            log_warning "Keine Domain angegeben, SSL übersprungen"
        fi
    fi
}

# Installation durchführen
main() {
    log_info "Starte Installation des GMod TTT Server Panels..."
    
    check_root
    detect_os
    install_system_deps
    create_server_user
    
    # Kopiere Panel-Dateien
    log_info "Kopiere Panel-Dateien..."
    cp -r . /home/gmod/panel/
    chown -R gmod:gmod /home/gmod/panel
    
    install_python_deps
    configure_nginx
    configure_supervisor
    create_gmod_service
    configure_firewall
    create_backup_script
    configure_logrotate
    set_permissions
    create_default_config
    setup_ssl
    
    log_success "Installation abgeschlossen!"
    echo
    log_info "Nächste Schritte:"
    echo "  1. Installiere deinen GMod Server in /home/gmod/server/"
    echo "  2. Passe die Konfiguration in /home/gmod/panel/config.py an"
    echo "  3. Ändere das RCON-Passwort in der server.cfg"
    echo "  4. Starte den GMod Server: systemctl start gmod-ttt"
    echo "  5. Öffne das Panel in deinem Browser: http://$(hostname -I | awk '{print $1}')"
    echo
    log_info "Standard-Login: admin / admin123"
    log_warning "WICHTIG: Ändere das Standard-Passwort nach dem ersten Login!"
    echo
    log_info "Logs:"
    echo "  - Panel: /var/log/gmod-panel.log"
    echo "  - GMod Server: /home/gmod/server/console.log"
    echo "  - Nginx: /var/log/nginx/"
    echo
    log_info "Services:"
    echo "  - Panel: supervisorctl status gmod-panel"
    echo "  - GMod Server: systemctl status gmod-ttt"
    echo "  - Nginx: systemctl status nginx"
}

# Fehlerbehandlung
trap 'log_error "Installation fehlgeschlagen in Zeile $LINENO"' ERR

# Prüfe ob alle Dateien vorhanden sind
if [[ ! -f "app.py" ]] || [[ ! -f "requirements.txt" ]]; then
    log_error "Panel-Dateien nicht gefunden! Führe das Script im Panel-Verzeichnis aus."
    exit 1
fi

# Starte Installation
main "$@"
