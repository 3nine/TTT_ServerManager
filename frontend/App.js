import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [servers, setServers] = useState([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_BASE}/servers`, {
        credentials: 'include'
      });
      if (response.ok) {
        setIsAuthenticated(true);
        loadServers();
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
    setLoading(false);
  };

  const loadServers = async () => {
    try {
      const response = await fetch(`${API_BASE}/servers`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setServers(data);
      }
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => {
      setIsAuthenticated(true);
      loadServers();
    }} />;
  }

  return (
    <div className="App">
      <Header onLogout={() => setIsAuthenticated(false)} />
      <main className="main-content">
        <div className="dashboard">
          <div className="dashboard-header">
            <h2>Server Dashboard</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddServer(true)}
            >
              Add Server
            </button>
          </div>
          <ServerGrid 
            servers={servers} 
            onRefresh={loadServers}
            onServerAction={loadServers}
          />
        </div>
      </main>
      
      {showAddServer && (
        <AddServerModal 
          onClose={() => setShowAddServer(false)}
          onServerAdded={() => {
            setShowAddServer(false);
            loadServers();
          }}
        />
      )}
    </div>
  );
}

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        onLogin();
      } else {
        const data = await response.json();
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Connection error');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>TTT Server Control Panel</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="login-info">
          <small>Default: admin / admin123</small>
        </div>
      </div>
    </div>
  );
}

function Header({ onLogout }) {
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1>TTT Server Control Panel</h1>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>
    </header>
  );
}

function ServerGrid({ servers, onRefresh, onServerAction }) {
  useEffect(() => {
    const interval = setInterval(onRefresh, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [onRefresh]);

  return (
    <div className="server-grid">
      {servers.map(server => (
        <ServerCard 
          key={server.id} 
          server={server} 
          onAction={onServerAction}
        />
      ))}
      {servers.length === 0 && (
        <div className="no-servers">
          <p>No servers configured. Add your first server to get started.</p>
        </div>
      )}
    </div>
  );
}

function ServerCard({ server, onAction }) {
  const [showConsole, setShowConsole] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCommand = async (cmd) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/servers/${server.id}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ command: cmd }),
      });

      const data = await response.json();
      if (response.ok) {
        if (data.response) {
          setConsoleOutput(prev => prev + `> ${cmd}\n${data.response}\n\n`);
        }
      } else {
        setConsoleOutput(prev => prev + `> ${cmd}\nError: ${data.error}\n\n`);
      }
    } catch (error) {
      setConsoleOutput(prev => prev + `> ${cmd}\nError: ${error.message}\n\n`);
    }
    setLoading(false);
    onAction();
  };

  const handleServerAction = async (action) => {
    try {
      const response = await fetch(`${API_BASE}/servers/${server.id}/${action}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (response.ok) {
        setConsoleOutput(prev => prev + `${action.toUpperCase()} command sent\n\n`);
      } else {
        setConsoleOutput(prev => prev + `${action.toUpperCase()} failed: ${data.error}\n\n`);
      }
    } catch (error) {
      setConsoleOutput(prev => prev + `${action.toUpperCase()} error: ${error.message}\n\n`);
    }
    onAction();
  };

  const deleteServer = async () => {
    if (window.confirm(`Are you sure you want to delete server "${server.name}"?`)) {
      try {
        const response = await fetch(`${API_BASE}/servers/${server.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          onAction();
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#28a745';
      case 'offline': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <div className="server-card">
      <div className="server-header">
        <h3>{server.name}</h3>
        <div 
          className="status-indicator"
          style={{ backgroundColor: getStatusColor(server.status) }}
        >
          {server.status}
        </div>
      </div>
      
      <div className="server-info">
        <div className="info-row">
          <span>Address:</span>
          <span>{server.ip}:{server.port}</span>
        </div>
        <div className="info-row">
          <span>Players:</span>
          <span>{server.players}/{server.max_players}</span>
        </div>
        <div className="info-row">
          <span>Map:</span>
          <span>{server.map_name}</span>
        </div>
        <div className="info-row">
          <span>Last Update:</span>
          <span>{new Date(server.last_updated).toLocaleString()}</span>
        </div>
      </div>

      <div className="server-actions">
        <button 
          className="btn btn-success"
          onClick={() => handleServerAction('start')}
          disabled={loading}
        >
          Start
        </button>
        <button 
          className="btn btn-warning"
          onClick={() => handleServerAction('restart')}
          disabled={loading}
        >
          Restart
        </button>
        <button 
          className="btn btn-danger"
          onClick={() => handleServerAction('stop')}
          disabled={loading}
        >
          Stop
        </button>
        <button 
          className="btn btn-info"
          onClick={() => setShowConsole(!showConsole)}
        >
          Console
        </button>
        <button 
          className="btn btn-danger"
          onClick={deleteServer}
        >
          Delete
        </button>
      </div>

      {showConsole && (
        <div className="console-section">
          <div className="console-output">
            <pre>{consoleOutput}</pre>
          </div>
          <div className="console-input">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter RCON command..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && command.trim()) {
                  sendCommand(command);
                  setCommand('');
                }
              }}
            />
            <button 
              onClick={() => {
                if (command.trim()) {
                  sendCommand(command);
                  setCommand('');
                }
              }}
              disabled={loading || !command.trim()}
              className="btn btn-primary"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddServerModal({ onClose, onServerAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: '27015',
    rcon_port: '27015',
    rcon_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          port: parseInt(formData.port),
          rcon_port: parseInt(formData.rcon_port)
        }),
      });

      if (response.ok) {
        onServerAdded();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add server');
      }
    } catch (error) {
      setError('Connection error');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New Server</h3>
          <button onClick={onClose} className="btn btn-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Server Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>IP Address:</label>
            <input
              type="text"
              name="ip"
              value={formData.ip}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Game Port:</label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>RCON Port:</label>
              <input
                type="number"
                name="rcon_port"
                value={formData.rcon_port}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>RCON Password:</label>
            <input
              type="password"
              name="rcon_password"
              value={formData.rcon_password}
              onChange={handleChange}
              required
            />
          </div>
          
          {error && <div className="error">{error}</div>}
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
