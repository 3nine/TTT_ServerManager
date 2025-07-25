#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Konfigurationsdatei für das GMod TTT Server Panel
Passe diese Werte an deine Server-Installation an
"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.absolute()

# Flask Configuration
class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'
    SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 28800  # 8 hours

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True  # Enable in production with HTTPS

# Server Configuration
SERVER_CONFIG = {
    # Systemd Service Name
    'service_name': 'gmod-ttt',
    
    # Server Paths - WICHTIG: Passe diese an deine Installation an!
    'server_path': '/home/gmod/server',
    'server_executable': '/home/gmod/server/srcds_run',
    'config_file': '/home/gmod/server/garrysmod/cfg/server.cfg',
    'log_file': '/home/gmod/server/console.log',
    'pid_file': '/home/gmod/server/gmod.pid',
    
    # Server Settings
    'server_port': 27015,
    'rcon_password': 'your_rcon_password_here',  # ÄNDERE DIES!
    'server_ip': '0.0.0.0',
    
    # Backup Settings
    'backup_dir': '/home/gmod/backups',
    'max_backups': 10,
    
    # Log Settings
    'max_log_lines': 1000,
    'log_refresh_interval': 5,  # seconds
    
    # Security Settings
    'allowed_config_extensions': ['.cfg', '.txt', '.lua'],
    'max_config_size': 1024 * 1024,  # 1MB
    
    # Performance Settings
    'command_timeout': 30,  # seconds
    'max_concurrent_commands': 3,
}

# User Configuration
USERS_CONFIG = {
    'users_file': BASE_DIR / 'instance' / 'users.json',
    'session_timeout': 28800,  # 8 hours
    'max_login_attempts': 5,
    'lockout_duration': 900,  # 15 minutes
}

# Systemd Service Template (optional)
SYSTEMD_SERVICE_TEMPLATE = """[Unit]
Description=Garry's Mod TTT Server
After=network.target

[Service]
Type=simple
User=gmod
Group=gmod
WorkingDirectory={server_path}
ExecStart={server_executable} -game garrysmod +gamemode terrortown +map ttt_minecraft_b5 +maxplayers 32
Restart=on-failure
RestartSec=5
KillMode=mixed
KillSignal=SIGINT

[Install]
WantedBy=multi-user.target
"""

# Startup Script Template
STARTUP_SCRIPT_TEMPLATE = """#!/bin/bash
# GMod TTT Server Startup Script

cd {server_path}

# Set Steam credentials (if needed)
export STEAM_USERNAME="anonymous"
export STEAM_PASSWORD=""

# Server parameters
GAME="garrysmod"
GAMEMODE="terrortown"
MAP="ttt_minecraft_b5"
MAXPLAYERS="32"
PORT="{server_port}"

# Additional parameters
ADDITIONAL_PARAMS="+sv_lan 0 +sv_region 3"

# Start the server
./srcds_run -game $GAME \\
    +gamemode $GAMEMODE \\
    +map $MAP \\
    +maxplayers $MAXPLAYERS \\
    +hostport $PORT \\
    $ADDITIONAL_PARAMS \\
    -console \\
    -nohltv \\
    +exec server.cfg
"""

# Default server.cfg template
DEFAULT_SERVER_CONFIG = """// === GMod TTT Server Configuration ===
// Generiert vom Server Panel

// === Grundlegende Einstellungen ===
hostname "GMod TTT Server - [DE] 24/7"
sv_password ""
maxplayers 32
sv_region 3
sv_lan 0

// === Netzwerk Einstellungen ===
sv_allowupload 1
sv_allowdownload 1
net_maxfilesize 64
sv_downloadurl ""
sv_allowcslua 0

// === RCON Einstellungen ===
rcon_password "{rcon_password}"

// === TTT Gamemode Einstellungen ===
ttt_round_limit 6
ttt_time_limit_minutes 10
ttt_haste_starting_minutes 5
ttt_haste_minutes_per_death 0.5
ttt_postround_dm 0
ttt_ragdoll_pinning 1
ttt_ragdoll_pinning_innocents 0

// === TTT Rollen ===
ttt_traitor_pct 0.25
ttt_detective_pct 0.13
ttt_detective_max 32
ttt_detective_min_players 8
ttt_detective_karma_min 600

// === TTT Ausrüstung ===
ttt_credits_starting 2
ttt_credits_award_pct 0.35
ttt_credits_award_size 1
ttt_credits_award_repeat 1

// === Karma System ===
ttt_karma 1
ttt_karma_starting 1000
ttt_karma_max 1500
ttt_karma_ratio 0.001
ttt_karma_kill_penalty 15
ttt_karma_round_increment 5
ttt_karma_clean_bonus 30
ttt_karma_traitordmg_ratio 0.0003
ttt_karma_traitorkill_bonus 40
ttt_karma_low_autokick 1
ttt_karma_low_amount 450
ttt_karma_low_ban 1
ttt_karma_low_ban_minutes 60

// === Server Performance ===
sv_maxcmdrate 66
sv_mincmdrate 10
sv_maxupdaterate 66
sv_minupdaterate 10
fps_max 0

// === Logging ===
log on
sv_logbans 1
sv_logecho 1
sv_logfile 1
sv_log_onefile 0

// === Map Rotation (optional) ===
// exec mapcycle.cfg

// === Admin Mods (ULX/DarkRP etc.) ===
// exec ulx_config.cfg

// === Custom Settings ===
// Füge hier deine eigenen Einstellungen hinzu

echo "Server.cfg loaded successfully!"
"""

# Security Settings
SECURITY_CONFIG = {
    'allowed_commands': [
        'systemctl',
        'ps',
        'netstat',
        'tail',
        'head',
        'cat',
        'grep',
        'wc',
        'uptime',
        'free',
        'df',
        'ls'
    ],
    
    'blocked_commands': [
        'rm',
        'mv',
        'cp',
        'chmod',
        'chown',
        'sudo',
        'su',
        'passwd',
        'useradd',
        'userdel',
        'wget',
        'curl',
        'ssh',
        'scp',
        'rsync'
    ],
    
    'max_command_length': 200,
    'sanitize_input': True,
}

# Monitoring Configuration
MONITORING_CONFIG = {
    'check_interval': 30,  # seconds
    'health_checks': [
        'service_status',
        'port_status',
        'log_file',
        'disk_space',
        'memory_usage'
    ],
    'alerts': {
        'disk_space_threshold': 90,  # percent
        'memory_threshold': 90,  # percent
        'log_size_threshold': 100 * 1024 * 1024,  # 100MB
    }
}

# Get configuration based on environment
def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    if env == 'production':
        return ProductionConfig
    else:
        return DevelopmentConfig

# Validate configuration
def validate_config():
    """Validate configuration settings"""
    errors = []
    
    # Check if required paths exist
    server_path = Path(SERVER_CONFIG['server_path'])
    if not server_path.exists():
        errors.append(f"Server path does not exist: {server_path}")
    
    config_file = Path(SERVER_CONFIG['config_file'])
    if not config_file.parent.exists():
        errors.append(f"Config directory does not exist: {config_file.parent}")
    
    # Check RCON password
    if SERVER_CONFIG['rcon_password'] == 'your_rcon_password_here':
        errors.append("Please change the default RCON password in config.py")
    
    # Check if instance directory exists
    instance_dir = BASE_DIR / 'instance'
    if not instance_dir.exists():
        instance_dir.mkdir(parents=True, exist_ok=True)
    
    return errors

if __name__ == '__main__':
    # Validate configuration when run directly
    errors = validate_config()
    if errors:
        print("Configuration errors found:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("Configuration validation passed!")
        
    print(f"\nCurrent configuration:")
    print(f"  Server path: {SERVER_CONFIG['server_path']}")
    print(f"  Config file: {SERVER_CONFIG['config_file']}")
    print(f"  Log file: {SERVER_CONFIG['log_file']}")
    print(f"  Service name: {SERVER_CONFIG['service_name']}")
    print(f"  Server port: {SERVER_CONFIG['server_port']}")
