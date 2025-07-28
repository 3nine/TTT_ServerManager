# TTT Server Control Panel

Ein vollständiges Control Panel zur Verwaltung mehrerer Garry's Mod TTT-Server mit React Frontend und Python Flask Backend.

## Features

- **Dashboard**: Übersicht aller Server mit Status, Spielerzahl und aktueller Map
- **Server-Management**: Hinzufügen, Löschen und Konfigurieren von Servern
- **RCON-Steuerung**: Direkte Befehlseingabe über RCON-Konsole
- **Server-Aktionen**: Start, Stop, Restart von Servern
- **Authentifizierung**: Login-System für Administratoren
- **Echzeit-Updates**: Automatische Status-Aktualisierung alle 30 Sekunden
- **Responsive Design**: Optimiert für Desktop und Mobile

## Technologie-Stack

### Backend
- **Python Flask**: Web-Framework
- **SQLite**: Datenbank für Server- und Benutzerdaten
- **RCON-Client**: Eigene Implementierung für Garry's Mod Server
- **Threading**: Hintergrund-Monitoring der Server

### Frontend
- **React**: UI-Framework
- **Moderne CSS**: Responsive Design mit Flexbox/Grid
- **Fetch API**: HTTP-Kommunikation mit Backend

## Installation & Einrichtung

### Voraussetzungen
- Python 3.8+
- Node.js 16+
- NPM oder Yarn

### Backend Setup

1. **Repository klonen und Backend-Ordner erstellen:**
```bash
mkdir ttt-control-panel
cd ttt-control-panel
mkdir backend
cd backend
```

2. **Virtuelle Umgebung erstellen:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# oder
venv\Scripts\activate     # Windows
```

3. **Dependencies installieren:**
```bash
pip install -r requirements.txt
```

4. **Backend starten:**
```bash
python app.py
```

Das Backend läuft standardmäßig auf `http://localhost:5000`

### Frontend Setup

1. **Frontend-Ordner erstellen:**
```bash
cd ..
mkdir frontend
cd frontend
```

2. **React App initialisieren:**
```bash
npx create-react-app .
```

3. **Dependencies sind bereits in package.json definiert:**
```bash
npm install
```

4. **App.js und App.css ersetzen** mit den bereitgestellten Dateien

5. **Frontend starten:**
```bash
npm start
```

Das Frontend läuft standardmäßig auf `http://localhost:3000`

## Konfiguration

### Standard-Login
- **Benutzername**: `admin`
- **Passwort**: `admin123`

### Server hinzufügen
1. Nach dem Login auf "Add Server" klicken
2. Folgende Informationen eingeben:
   - **Server Name**: Anzeigename
   - **IP Address**: Server-IP-Adresse
   - **Game Port**: Standard 27015
   - **RCON Port**: Standard 27015 (meist gleich wie Game Port)
   - **RCON Password**: RCON-Passwort des Servers

### RCON-Konfiguration für GMod Server
In der `server.cfg` Ihres GMod-Servers:
```
rcon_password "IhrRCONPasswort"
net_maxfilesize 64
```

## Verwendung

### Dashboard
- Zeigt alle konfigurierten Server mit aktuellem Status
- Automatische Aktualisierung alle 30 Sekunden
- Farbkodierte Status-Anzeige (Grün=Online, Rot=Offline)

### Server-Steuerung
- **Start**: Server starten (implementierungsabhängig)
- **Stop**: Server über RCON beenden
- **Restart**: Server über RCON neu starten
- **Console**: RCON-Konsole für direkte Befehlseingabe

### Verfügbare RCON-Befehle (Beispiele)
```
status              - Server-Status anzeigen
changelevel ttt_67thway - Map wechseln
kick "Spielername"  - Spieler kicken
ban "Spielername"   - Spieler bannen
say "Nachricht"     - Server-Nachricht senden
```

## Projektstruktur

```
ttt-control-panel/
├── backend/
│   ├── app.py              # Flask-Anwendung
│   ├── requirements.txt    # Python-Dependencies
│   └── servers.db         # SQLite-Datenbank (wird automatisch erstellt)
└── frontend/
    ├── src/
    │   ├── App.js         # React-Hauptkomponente
    │   └── App.css        # Styling
    ├── package.json       # Node.js-Dependencies
    └── public/            # Statische Dateien
```

## Erweiterte Konfiguration

### Sicherheit
1. **Geheimen Schlüssel ändern:**
```python
app.secret_key = 'your-secure-secret-key-here'
```

2. **Admin-Passwort ändern:**
```python
# In init_db() Funktion
admin_hash = generate_password_hash('IhrNeuesPasswort')
```

### Produktions-Deployment
1. **Backend für Produktion:**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **Frontend build:**
```bash
npm run build
```

3. **Nginx-Konfiguration** (Beispiel):
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Häufige Probleme

1. **RCON-Verbindung fehlgeschlagen:**
   - RCON-Port und Passwort prüfen
   - Firewall-Einstellungen kontrollieren
   - Server-Konfiguration überprüfen

2. **Server wird als offline angezeigt:**
   - IP und Port korrekt eingegeben?
   - Server tatsächlich gestartet?
   - Netzwerk-Verbindung prüfen

3. **Frontend kann nicht mit Backend kommunizieren:**
   - CORS-Einstellungen prüfen
   - Backend läuft auf Port 5000?
   - API-URL im Frontend korrekt?

### Debug-Modus
Backend im Debug-Modus starten:
```bash
export FLASK_DEBUG=1  # Linux/Mac
set FLASK_DEBUG=1     # Windows
python app.py
```

## Erweiterungsmöglichkeiten

- **Logging**: Detaillierte Server-Logs
- **Statistiken**: Spieler-Statistiken und Diagramme
- **Automatisierung**: Geplante Server-Aktionen
- **Multi-User**: Mehrere Admin-Accounts
- **Plugin-Management**: Server-Plugins verwalten
- **Backup-System**: Automatische Server-Backups

## Support

Bei Problemen oder Fragen:
1. Logs im Backend-Terminal prüfen
2. Browser-Entwicklerkonsole für Frontend-Fehler
3. RCON-Verbindung manuell testen
4. Server-Logs des GMod-Servers kontrollieren

## Lizenz

Dieses Projekt ist für den privaten und kommerziellen Gebrauch frei verfügbar.
