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
