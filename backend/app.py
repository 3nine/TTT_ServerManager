from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import sqlite3
import json
import subprocess
import socket
import struct
import time
import threading
from datetime import datetime
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this-in-production'
CORS(app, supports_credentials=True)

# Database initialization
def init_db():
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    
    # Create servers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ip TEXT NOT NULL,
            port INTEGER NOT NULL,
            rcon_port INTEGER NOT NULL,
            rcon_password TEXT NOT NULL,
            status TEXT DEFAULT 'offline',
            players INTEGER DEFAULT 0,
            max_players INTEGER DEFAULT 0,
            map_name TEXT DEFAULT 'unknown',
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    
    # Create default admin user if not exists
    cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', ('admin',))
    if cursor.fetchone()[0] == 0:
        admin_hash = generate_password_hash('admin123')
        cursor.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', 
                      ('admin', admin_hash))
    
    conn.commit()
    conn.close()

# RCON Client
class RCONClient:
    def __init__(self, host, port, password):
        self.host = host
        self.port = port
        self.password = password
        self.socket = None
        self.request_id = 1
    
    def connect(self):
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(10)
            self.socket.connect((self.host, self.port))
            
            # Send auth packet
            auth_packet = self._build_packet(2, self.password)
            self.socket.send(auth_packet)
            
            # Read auth response
            response = self._read_packet()
            if response[0] == -1:
                return False
            
            return True
        except Exception as e:
            print(f"RCON connection error: {e}")
            return False
    
    def send_command(self, command):
        if not self.socket:
            if not self.connect():
                return None
        
        try:
            # Send command packet
            cmd_packet = self._build_packet(2, command)
            self.socket.send(cmd_packet)
            
            # Read response
            response = self._read_packet()
            return response[2] if response else None
        except Exception as e:
            print(f"RCON command error: {e}")
            return None
    
    def disconnect(self):
        if self.socket:
            self.socket.close()
            self.socket = None
    
    def _build_packet(self, packet_type, body):
        body = body.encode('utf-8')
        packet_id = self.request_id
        self.request_id += 1
        
        packet = struct.pack('<ii', packet_id, packet_type) + body + b'\x00\x00'
        length = len(packet)
        
        return struct.pack('<i', length) + packet
    
    def _read_packet(self):
        try:
            # Read packet length
            length_data = self.socket.recv(4)
            if len(length_data) < 4:
                return None
            
            length = struct.unpack('<i', length_data)[0]
            
            # Read packet data
            packet_data = b''
            while len(packet_data) < length:
                chunk = self.socket.recv(length - len(packet_data))
                if not chunk:
                    return None
                packet_data += chunk
            
            # Unpack packet
            packet_id, packet_type = struct.unpack('<ii', packet_data[:8])
            body = packet_data[8:-2].decode('utf-8', errors='ignore')
            
            return (packet_id, packet_type, body)
        except Exception as e:
            print(f"RCON read error: {e}")
            return None

# Server status monitoring
def update_server_status():
    while True:
        conn = sqlite3.connect('servers.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM servers')
        servers = cursor.fetchall()
        
        for server in servers:
            server_id, name, ip, port, rcon_port, rcon_password, _, _, _, _, _ = server
            
            # Check if server is online
            status = 'offline'
            players = 0
            max_players = 0
            map_name = 'unknown'
            
            try:
                # Try to connect to game port
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((ip, port))
                sock.close()
                
                if result == 0:
                    status = 'online'
                    
                    # Try to get server info via RCON
                    rcon = RCONClient(ip, rcon_port, rcon_password)
                    if rcon.connect():
                        # Get player count
                        player_info = rcon.send_command('status')
                        if player_info:
                            lines = player_info.split('\n')
                            for line in lines:
                                if 'players' in line.lower():
                                    parts = line.split()
                                    for i, part in enumerate(parts):
                                        if part.isdigit() and i < len(parts) - 1:
                                            players = int(part)
                                            if '/' in parts[i + 1]:
                                                max_players = int(parts[i + 1].split('/')[1])
                                            break
                        
                        # Get current map
                        map_info = rcon.send_command('changelevel')
                        if map_info and 'Current map' in map_info:
                            map_name = map_info.split('Current map: ')[1].split('\n')[0].strip()
                        
                        rcon.disconnect()
                        
            except Exception as e:
                print(f"Error checking server {name}: {e}")
            
            # Update database
            cursor.execute('''
                UPDATE servers 
                SET status = ?, players = ?, max_players = ?, map_name = ?, last_updated = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (status, players, max_players, map_name, server_id))
        
        conn.commit()
        conn.close()
        
        time.sleep(30)  # Update every 30 seconds

# Authentication decorator
def login_required(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user[1], password):
        session['user_id'] = user[0]
        return jsonify({'success': True, 'message': 'Login successful'})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Logout successful'})

@app.route('/api/servers', methods=['GET'])
@login_required
def get_servers():
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM servers ORDER BY name')
    servers = cursor.fetchall()
    conn.close()
    
    server_list = []
    for server in servers:
        server_list.append({
            'id': server[0],
            'name': server[1],
            'ip': server[2],
            'port': server[3],
            'rcon_port': server[4],
            'status': server[6],
            'players': server[7],
            'max_players': server[8],
            'map_name': server[9],
            'last_updated': server[10]
        })
    
    return jsonify(server_list)

@app.route('/api/servers', methods=['POST'])
@login_required
def add_server():
    data = request.get_json()
    
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO servers (name, ip, port, rcon_port, rcon_password)
        VALUES (?, ?, ?, ?, ?)
    ''', (data['name'], data['ip'], data['port'], data['rcon_port'], data['rcon_password']))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Server added successfully'})

@app.route('/api/servers/<int:server_id>', methods=['DELETE'])
@login_required
def delete_server(server_id):
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM servers WHERE id = ?', (server_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Server deleted successfully'})

@app.route('/api/servers/<int:server_id>/command', methods=['POST'])
@login_required
def send_command(server_id):
    data = request.get_json()
    command = data.get('command')
    
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT ip, rcon_port, rcon_password FROM servers WHERE id = ?', (server_id,))
    server = cursor.fetchone()
    conn.close()
    
    if not server:
        return jsonify({'error': 'Server not found'}), 404
    
    ip, rcon_port, rcon_password = server
    
    rcon = RCONClient(ip, rcon_port, rcon_password)
    if rcon.connect():
        response = rcon.send_command(command)
        rcon.disconnect()
        
        if response is not None:
            return jsonify({'success': True, 'response': response})
        else:
            return jsonify({'error': 'Command failed'}), 500
    else:
        return jsonify({'error': 'Could not connect to server'}), 500

@app.route('/api/servers/<int:server_id>/restart', methods=['POST'])
@login_required
def restart_server(server_id):
    return send_command_to_server(server_id, 'exit')

@app.route('/api/servers/<int:server_id>/start', methods=['POST'])
@login_required
def start_server(server_id):
    # This would typically start the server process
    # Implementation depends on how your servers are managed
    return jsonify({'success': True, 'message': 'Start command sent'})

@app.route('/api/servers/<int:server_id>/stop', methods=['POST'])
@login_required
def stop_server(server_id):
    return send_command_to_server(server_id, 'exit')

def send_command_to_server(server_id, command):
    conn = sqlite3.connect('servers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT ip, rcon_port, rcon_password FROM servers WHERE id = ?', (server_id,))
    server = cursor.fetchone()
    conn.close()
    
    if not server:
        return jsonify({'error': 'Server not found'}), 404
    
    ip, rcon_port, rcon_password = server
    
    rcon = RCONClient(ip, rcon_port, rcon_password)
    if rcon.connect():
        response = rcon.send_command(command)
        rcon.disconnect()
        return jsonify({'success': True, 'message': f'Command "{command}" sent successfully'})
    else:
        return jsonify({'error': 'Could not connect to server'}), 500

if __name__ == '__main__':
    init_db()
    
    # Start status monitoring thread
    status_thread = threading.Thread(target=update_server_status, daemon=True)
    status_thread.start()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
