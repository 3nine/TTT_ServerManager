#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Garry's Mod TTT Server Web Panel
Flask Backend für die Verwaltung eines GMod TTT Servers
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import subprocess
import os
import json
import hashlib
import time
import re
from datetime import datetime, timedelta
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)  # Sichere Session-Keys generieren

# Login Manager Setup
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Konfiguration - Passe diese Pfade an deine Server-Installation an
SERVER_CONFIG = {
    'service_name': 'gmod-ttt',  # Name des systemd Service
    'server_path': '/home/gmod/server',  # Pfad zum Server-Verzeichnis
    'config_file': '/home/gmod/server/garrysmod/cfg/server.cfg',  # Pfad zur server.cfg
    'log_file': '/home/gmod/server/console.log',  # Pfad zum Server-Log
    'rcon_password': 'your_rcon_password',  # RCON Passwort (falls verfügbar)
    'server_port': 27015  # Server Port
}

class User(UserMixin):
    def __init__(self, username):
        self.id = username
        self.username = username

def load_users():
    """Lädt Benutzerdaten aus JSON-Datei"""
    users_file = os.path.join('instance', 'users.json')
    if not os.path.exists('instance'):
        os.makedirs('instance')
    
    if not os.path.exists(users_file):
        # Erstelle Standard-Admin-User
        default_users = {
            'admin': {
                'password': hashlib.sha256('admin123'.encode()).hexdigest(),
                'role': 'admin'
            }
        }
        with open(users_file, 'w') as f:
            json.dump(default_users, f, indent=2)
    
    with open(users_file, 'r') as f:
        return json.load(f)

@login_manager.user_loader
def load_user(username):
    users = load_users()
    if username in users:
        return User(username)
    return None

def run_command(command, timeout=30):
    """Führt Shell-Kommando aus und gibt Ergebnis zurück"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'stdout': '',
            'stderr': 'Command timed out',
            'returncode': -1
        }
    except Exception as e:
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'returncode': -1
        }

def get_server_status():
    """Ermittelt den aktuellen Server-Status"""
    service_name = SERVER_CONFIG['service_name']
    
    # Systemd Service Status prüfen
    systemd_result = run_command(f'systemctl is-active {service_name}')
    is_active = systemd_result['stdout'].strip() == 'active'
    
    # Prozess-Details ermitteln
    process_info = None
    if is_active:
        ps_result = run_command(f'ps aux | grep {service_name} | grep -v grep')
        if ps_result['success'] and ps_result['stdout']:
            process_info = ps_result['stdout'].strip()
    
    # Server-Port prüfen
    port_check = run_command(f'netstat -tulpn | grep :{SERVER_CONFIG["server_port"]}')
    port_open = port_check['success'] and port_check['stdout']
    
    return {
        'service_active': is_active,
        'process_info': process_info,
        'port_open': bool(port_open),
        'uptime': get_service_uptime() if is_active else None
    }

def get_service_uptime():
    """Ermittelt die Laufzeit des Services"""
    service_name = SERVER_CONFIG['service_name']
    result = run_command(f'systemctl show {service_name} --property=ActiveEnterTimestamp')
    
    if result['success'] and result['stdout']:
        timestamp_line = result['stdout'].strip()
        if '=' in timestamp_line:
            timestamp_str = timestamp_line.split('=', 1)[1].strip()
            if timestamp_str and timestamp_str != 'n/a':
                try:
                    start_time = datetime.strptime(timestamp_str, '%a %Y-%m-%d %H:%M:%S %Z')
                    uptime = datetime.now() - start_time
                    return str(uptime).split('.')[0]  # Entferne Mikrosekunden
                except:
                    pass
    return 'Unknown'

def get_server_logs(lines=100):
    """Liest die letzten Zeilen aus dem Server-Log"""
    log_file = SERVER_CONFIG['log_file']
    if os.path.exists(log_file):
        result = run_command(f'tail -n {lines} "{log_file}"')
        if result['success']:
            return result['stdout']
    return 'Log file not found or not accessible'

def read_server_config():
    """Liest die server.cfg Datei"""
    config_file = SERVER_CONFIG['config_file']
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f'Error reading config file: {str(e)}'

def write_server_config(content):
    """Schreibt die server.cfg Datei"""
    config_file = SERVER_CONFIG['config_file']
    try:
        # Backup erstellen
        backup_file = f"{config_file}.backup.{int(time.time())}"
        if os.path.exists(config_file):
            subprocess.run(['cp', config_file, backup_file])
        
        with open(config_file, 'w', encoding='utf-8') as f:
            f.write(content)
        return {'success': True, 'message': 'Config saved successfully'}
    except Exception as e:
        return {'success': False, 'message': f'Error saving config: {str(e)}'}

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        users = load_users()
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        if username in users and users[username]['password'] == password_hash:
            user = User(username)
            login_user(user, remember=True, duration=timedelta(hours=8))
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/status')
@login_required
def api_status():
    """API Endpoint für Server-Status"""
    status = get_server_status()
    return jsonify(status)

@app.route('/api/start', methods=['POST'])
@login_required
def api_start():
    """Startet den Server"""
    service_name = SERVER_CONFIG['service_name']
    result = run_command(f'sudo systemctl start {service_name}')
    return jsonify({
        'success': result['success'],
        'message': 'Server start initiated' if result['success'] else result['stderr']
    })

@app.route('/api/stop', methods=['POST'])
@login_required
def api_stop():
    """Stoppt den Server"""
    service_name = SERVER_CONFIG['service_name']
    result = run_command(f'sudo systemctl stop {service_name}')
    return jsonify({
        'success': result['success'],
        'message': 'Server stop initiated' if result['success'] else result['stderr']
    })

@app.route('/api/restart', methods=['POST'])
@login_required
def api_restart():
    """Startet den Server neu"""
    service_name = SERVER_CONFIG['service_name']
    result = run_command(f'sudo systemctl restart {service_name}')
    return jsonify({
        'success': result['success'],
        'message': 'Server restart initiated' if result['success'] else result['stderr']
    })

@app.route('/api/logs')
@login_required
def api_logs():
    """API Endpoint für Server-Logs"""
    lines = request.args.get('lines', 100, type=int)
    logs = get_server_logs(lines)
    return jsonify({'logs': logs})

@app.route('/config')
@login_required
def config_edit():
    """Zeigt den Config-Editor"""
    config_content = read_server_config()
    return render_template('config_edit.html', config_content=config_content)

@app.route('/api/config', methods=['GET', 'POST'])
@login_required
def api_config():
    """API für Config-Verwaltung"""
    if request.method == 'GET':
        config_content = read_server_config()
        return jsonify({'config': config_content})
    
    elif request.method == 'POST':
        config_content = request.json.get('config', '')
        result = write_server_config(config_content)
        return jsonify(result)

if __name__ == '__main__':
    print("Starting Garry's Mod TTT Server Panel...")
    print("Default login: admin / admin123")
    print("Make sure to change the default password!")
    app.run(host='0.0.0.0', port=5000, debug=False)
