# GMod TTT Server Panel

Ein webbasiertes Admin-Panel für Garry's Mod TTT (Trouble in Terrorist Town) Server auf Linux-Root-Servern.

![Panel Screenshot](https://via.placeholder.com/800x400?text=GMod+TTT+Server+Panel)

## ✨ Features

- 🎮 **Server-Steuerung**: Starten, Stoppen, Neustarten über Webinterface
- 📊 **Echtzeit-Status**: Live-Anzeige von Server-Status, Uptime und Port-Status
- ⚙️ **Config-Editor**: Web-basierter Editor für `server.cfg` mit Syntax-Highlighting
- 📋 **Log-Viewer**: Echtzeit-Anzeige der Server-Logs mit verschiedenen Ansichten
- 🔐 **Sicheres Login**: Session-basierte Authentifizierung mit konfigurierbaren Benutzern
- 📱 **Responsive Design**: Optimiert für Desktop, Tablet und Mobile
- 🌙 **Dark/Light Mode**: Automatische Theme-Erkennung
- 🔄 **Auto-Refresh**: Automatische Aktualisierung des Server-Status
- 💾 **Backup-System**: Automatische Server-Backups mit Rotation
- 🔔 **Benachrichtigungen**: Toast-Notifications für alle Aktionen

## 🛠️ Technische Details

### Backend
- **Flask** (Python 3.8+) - Web Framework
- **Flask-Login** - Session Management
- **Subprocess** - Server-Kommunikation über Shell-Kommandos
- **JSON** - Benutzer- und Konfigurationsdaten

### Frontend
- **HTML5** - Semantisches Markup
- **CSS3** - Moderne Styles mit CSS Variables
- **Vanilla JavaScript** - Keine externen Abhängigkeiten
- **Responsive Design** - CSS Grid & Flexbox

### Systemintegration
- **Systemd** - Service Management
- **Nginx** - Reverse Proxy
- **Supervisor** - Prozess-Management
- **Logrotate** - Log-Rotation
- **UFW/Firewalld** - Firewall-Konfiguration

## 📋 Voraussetzungen

### System
- Linux-Server (Ubuntu 18.04+, Debian 10+, CentOS 7+)
- Root-Zugriff für Installation
- Mindestens 2GB RAM, 10GB freier Speicher
- Python 3.8 oder höher

### Software
- Garry's Mod Dedicated Server
- Systemd (für Service-Management)
- Nginx (als Reverse Proxy)
- Supervisor (für Prozess-Management)

## 🚀 Schnelle Installation

### 1. Repository klonen
```bash
git clone https://github.com/dein-username/gmod-ttt-panel.git
cd gmod-ttt-panel
```

### 2. Installation ausführen
```bash
sudo chmod +x setup.sh
sudo ./setup.sh
```

Das Setup-Script führt automatisch folgende Schritte aus:
- Installation aller Systemabhängigkeiten
- Erstellung des Benutzers `gmod`
- Python Virtual Environment Setup
- Nginx-Konfiguration
- Supervisor-Konfiguration
- Firewall-Setup
- SSL-Setup (optional)

### 3. GMod Server installieren
```bash
# Als gmod-Benutzer
sudo -u gmod -s
cd /home/gmod/server

# SteamCMD installieren
wget https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xvzf steamcmd_linux.tar.gz

# GMod Server herunterladen
./steamcmd.sh +login anonymous +force_install_dir /home/gmod/server +app_update 4020 +quit
```

### 4. Konfiguration anpassen
```bash
# Panel-Konfiguration
sudo -u gmod nano /home/gmod/panel/config.py

# Server-Konfiguration
sudo -u gmod nano /home/gmod/server/garrysmod/cfg/server.cfg
```

### 5. Services starten
```bash
# GMod Server starten
sudo systemctl start gmod-ttt
sudo systemctl enable gmod-ttt

# Panel-Status prüfen
sudo supervisorctl status gmod-panel
```

## 🔧 Manuelle Installation

Falls das automatische Setup nicht funktioniert:

### 1. System-Abhängigkeiten
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip python3-venv nginx supervisor git

# CentOS/RHEL
sudo yum update
sudo yum install python3 python3-pip nginx supervisor git
```

### 2. Benutzer erstellen
```bash
sudo useradd -m -s /bin/bash gmod
sudo mkdir -p /home/gmod/{server,panel,backups}
sudo chown -R gmod:gmod /home/gmod
```

### 3. Panel installieren
```bash
sudo -u gmod -s
cd /home/gmod/panel
git clone https://github.com/dein-username/gmod-ttt-panel.git .

# Virtual Environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Nginx konfigurieren
```bash
sudo cp configs/nginx/gmod-panel /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/gmod-panel /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Supervisor konfigurieren
```bash
sudo cp configs/supervisor/gmod-panel.conf /etc/supervisor/conf.d/
sudo systemctl restart supervisor
sudo supervisorctl reread
sudo supervisorctl update
```

## ⚙️ Konfiguration

### Panel-Konfiguration (`config.py`)
```python
SERVER_CONFIG = {
    'service_name': 'gmod-ttt',  # Systemd Service Name
    'server_path': '/home/gmod/server',  # Server-Verzeichnis
    'config_file': '/home/gmod/server/garrysmod/cfg/server.cfg',
    'log_file': '/home/gmod/server/console.log',
    'server_port': 27015,
    'rcon_password': 'dein_sicheres_passwort'  # ÄNDERN!
}
```

### Benutzer verwalten
```bash
# Als gmod-Benutzer
cd /home/gmod/panel
source venv/bin/activate
python3 manage_users.py add-user username password
python3 manage_users.py change-password username new_password
python3 manage_users.py list-users
```

### Server-Konfiguration (`server.cfg`)
```bash
# Standard TTT-Konfiguration
hostname "Mein TTT Server"
sv_password ""
maxplayers 32
sv_region 3

# TTT-spezifische Einstellungen
ttt_round_limit 6
ttt_time_limit_minutes 10
ttt_traitor_pct 0.25
```

## 🔐 Sicherheit

### Standard-Sicherheitsmaßnahmen
- Session-basierte Authentifizierung
- CSRF-Schutz
- Input-Sanitization
- Sichere HTTP-Headers
- Benutzerrechte-Trennung

### Empfohlene Sicherheitsschritte
1. **Passwörter ändern**: Standard-Login (`admin:admin123`) sofort ändern
2. **RCON-Passwort**: Starkes RCON-Passwort in `config.py` setzen
3. **SSL aktivieren**: HTTPS mit Let's Encrypt einrichten
4. **Firewall**: Nur notwendige Ports öffnen
5. **Updates**: System und Panel regelmäßig aktualisieren

### SSL/HTTPS einrichten
```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# Zertifikat erhalten
sudo certbot --nginx -d deine-domain.com

# Auto-Renewal testen
sudo certbot renew --dry-run
```

## 📊 Monitoring & Logs

### Log-Dateien
- **Panel**: `/var/log/gmod-panel.log`
- **GMod Server**: `/home/gmod/server/console.log`
- **Nginx**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

### Service-Status prüfen
```bash
# Panel-Status
sudo supervisorctl status gmod-panel

# GMod Server-Status
sudo systemctl status gmod-ttt

# Nginx-Status
sudo systemctl status nginx
```

### Performance-Monitoring
```bash
# Server-Ressourcen
htop
free -h
df -h

# Netzwerk-Verbindungen
sudo netstat -tulpn | grep :27015
sudo netstat -tulpn | grep :80
```

## 🔄 Backup & Wartung

### Automatische Backups
Das Panel erstellt automatisch tägliche Backups:
- **Zeit**: 03:00 Uhr
- **Location**: `/home/gmod/backups/`
- **Retention**: 10 Backups
- **Format**: `gmod_backup_YYYYMMDD_HHMMSS.tar.gz`

### Manuelles Backup
```bash
# Backup erstellen
sudo -u gmod /home/gmod/backup.sh

# Backup wiederherstellen
sudo systemctl stop gmod-ttt
sudo -u gmod tar -xzf /home/gmod/backups/gmod_backup_20231215_030000.tar.gz -C /home/gmod/server/
sudo systemctl start gmod-ttt
```

### Updates
```bash
# Panel aktualisieren
cd /home/gmod/panel
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo supervisorctl restart gmod-panel

# GMod Server aktualisieren
sudo systemctl stop gmod-ttt
sudo -u gmod /home/gmod/server/steamcmd.sh +login anonymous +force_install_dir /home/gmod/server +app_update 4020 +quit
sudo systemctl start gmod-ttt
```

## 🐛 Troubleshooting

### Häufige Probleme

#### Panel startet nicht
```bash
# Logs prüfen
sudo supervisorctl tail gmod-panel

# Manuell testen
cd /home/gmod/panel
source venv/bin/activate
python3 app.py
```

#### GMod Server startet nicht
```bash
# Service-Status prüfen
sudo systemctl status gmod-ttt

# Logs prüfen
sudo journalctl -u gmod-ttt -f

# Manuell testen
sudo -u gmod /home/gmod/server/srcds_run -game garrysmod +gamemode terrortown +map ttt_minecraft_b5
```

#### Nginx-Fehler
```bash
# Konfiguration testen
sudo nginx -t

# Logs prüfen
sudo tail -f /var/log/nginx/error.log

# Service neu starten
sudo systemctl restart nginx
```

#### Permission-Probleme
```bash
# Berechtigungen reparieren
sudo chown -R gmod:gmod /home/gmod
sudo chmod -R 755 /home/gmod
```

### Debug-Modus aktivieren
```bash
# In config.py
DEBUG = True

# Service neu starten
sudo supervisorctl restart gmod-panel
```

## 📝 API-Dokumentation

### REST-Endpoints

#### Server-Status
```http
GET /api/status
Response: {
    "service_active": true,
    "port_open": true,
    "uptime": "2 days, 5:30:20"
}
```

#### Server-Steuerung
```http
POST /api/start
POST /api/stop  
POST /api/restart
Response: {
    "success": true,
    "message": "Server started successfully"
}
```

#### Logs abrufen
```http
GET /api/logs?lines=100
Response: {
    "logs": "Server log content..."
}
```

#### Konfiguration
```http
GET /api/config
Response: {
    "config": "server.cfg content..."
}

POST /api/config
Body: {
    "config": "Updated server.cfg content..."
}
```

## 🤝 Contributing

### Development Setup
```bash
git clone https://github.com/dein-username/gmod-ttt-panel.git
cd gmod-ttt-panel
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

### Code-Style
- Python: PEP 8
- JavaScript: ES6+
- HTML: Semantic HTML5
- CSS: BEM Methodology

### Pull Requests
1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Committe deine Änderungen
4. Erstelle einen Pull Request

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei für Details.

## 👥 Support

- **Issues**: [GitHub Issues](https://github.com/dein-username/gmod-ttt-panel/issues)
- **Diskussionen**: [GitHub Discussions](https://github.com/dein-username/gmod-ttt-panel/discussions)
- **Wiki**: [GitHub Wiki](https://github.com/dein-username/gmod-ttt-panel/wiki)

## 🙏 Credits

- **Flask** - Web Framework
- **GMod Community** - Inspiration und Testing
- **Contributors** - Alle, die zum Projekt beigetragen haben

---

**⚠️ Hinweis**: Dieses Panel ist für private Server gedacht. Stelle sicher, dass alle Sicherheitsmaßnahmen implementiert sind, bevor du es in einer Produktionsumgebung einsetzt.
