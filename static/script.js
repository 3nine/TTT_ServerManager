/**
 * GMod TTT Server Panel - Main JavaScript
 * Handles global functionality and utilities
 */

// Global variables
let globalConfig = {
    autoRefresh: true,
    refreshInterval: 30000,
    notifications: true
};

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Main initialization function
 */
function initializeApp() {
    console.log('Initializing GMod TTT Server Panel...');
    
    // Set up global event listeners
    setupGlobalEventListeners();
    
    // Initialize theme
    initializeTheme();
    
    // Initialize notifications
    initializeNotifications();
    
    // Update server time display
    updateServerTime();
    setInterval(updateServerTime, 1000);
    
    // Check for saved preferences
    loadUserPreferences();
    
    console.log('Application initialized successfully');
}

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
    // Handle keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Handle window resize
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle online/offline status
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', closeDropdowns);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K: Focus search (if available)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('#search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Ctrl/Cmd + R: Refresh status (on dashboard)
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && window.location.pathname === '/dashboard') {
        e.preventDefault();
        if (typeof refreshStatus === 'function') {
            refreshStatus();
        }
    }
    
    // Ctrl/Cmd + S: Save config (on config page)
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && window.location.pathname === '/config') {
        e.preventDefault();
        if (typeof saveConfig === 'function') {
            saveConfig();
        }
    }
    
    // Escape: Close modals
    if (e.key === 'Escape') {
        closeAllModals();
    }
}

/**
 * Handle window resize events
 */
function handleWindowResize() {
    // Adjust layout for mobile/desktop
    const isMobile = window.innerWidth < 768;
    document.body.classList.toggle('mobile-layout', isMobile);
    
    // Emit custom resize event for components
    const resizeEvent = new CustomEvent('panelResize', {
        detail: {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: isMobile
        }
    });
    document.dispatchEvent(resizeEvent);
}

/**
 * Handle tab visibility changes
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        // Tab became visible - refresh data if needed
        const lastRefresh = localStorage.getItem('lastRefresh');
        const now = Date.now();
        
        if (!lastRefresh || (now - parseInt(lastRefresh)) > 60000) {
            // Refresh if more than 1 minute has passed
            if (typeof refreshStatus === 'function') {
                refreshStatus();
            }
        }
    }
}

/**
 * Handle online/offline status
 */
function handleOnlineStatus() {
    const isOnline = navigator.onLine;
    const statusIndicator = document.querySelector('#connection-status');
    
    if (statusIndicator) {
        statusIndicator.textContent = isOnline ? 'Online' : 'Offline';
        statusIndicator.className = isOnline ? 'status-online' : 'status-offline';
    }
    
    if (!isOnline) {
        showGlobalNotification('Keine Internetverbindung', 'warning', 0);
    } else {
        hideGlobalNotification('connection');
    }
}

/**
 * Close all open dropdowns
 */
function closeDropdowns(e) {
    const dropdowns = document.querySelectorAll('.dropdown.open');
    dropdowns.forEach(dropdown => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
}

/**
 * Initialize theme system
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemTheme;
    
    setTheme(theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

/**
 * Set application theme
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.querySelector('#theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggle.title = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    }
}

/**
 * Toggle theme between light and dark
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

/**
 * Initialize notification system
 */
function initializeNotifications() {
    // Create notification container
    if (!document.querySelector('#notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Check notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
        // Don't auto-request, let user decide
    }
}

/**
 * Show global notification
 */
function showGlobalNotification(message, type = 'info', duration = 5000) {
    const container = document.querySelector('#notification-container');
    if (!container) return;
    
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
        <button class="notification-close" onclick="hideGlobalNotification('${id}')">×</button>
    `;
    
    container.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('notification-show');
    });
    
    // Auto-hide if duration is set
    if (duration > 0) {
        setTimeout(() => {
            hideGlobalNotification(id);
        }, duration);
    }
    
    return id;
}

/**
 * Hide global notification
 */
function hideGlobalNotification(id) {
    const notification = document.getElementById(id);
    if (notification) {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        loading: '⏳'
    };
    return icons[type] || icons.info;
}

/**
 * Show browser notification (if permitted)
 */
function showBrowserNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            icon: '/static/favicon.ico',
            badge: '/static/badge.png',
            ...options
        });
        
        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        return notification;
    }
}

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    return Notification.permission === 'granted';
}

/**
 * Update server time display
 */
function updateServerTime() {
    const timeElements = document.querySelectorAll('#server-time, .server-time');
    const now = new Date();
    const timeString = now.toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    timeElements.forEach(element => {
        element.textContent = timeString;
    });
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences() {
    const prefs = localStorage.getItem('userPreferences');
    if (prefs) {
        try {
            globalConfig = { ...globalConfig, ...JSON.parse(prefs) };
        } catch (e) {
            console.error('Error loading user preferences:', e);
        }
    }
}

/**
 * Save user preferences to localStorage
 */
function saveUserPreferences() {
    try {
        localStorage.setItem('userPreferences', JSON.stringify(globalConfig));
    } catch (e) {
        console.error('Error saving user preferences:', e);
    }
}

/**
 * Close all open modals
 */
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
        }
    });
}

/**
 * Utility function: Debounce
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Utility function: Throttle
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Utility function: Format bytes
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Utility function: Format duration
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

/**
 * Utility function: Escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Utility function: Copy to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showGlobalNotification('Text in Zwischenablage kopiert', 'success', 2000);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                showGlobalNotification('Text in Zwischenablage kopiert', 'success', 2000);
                return true;
            }
        } catch (err) {
            document.body.removeChild(textArea);
        }
        
        showGlobalNotification('Fehler beim Kopieren', 'error', 3000);
        return false;
    }
}

/**
 * API helper function: Make HTTP request
 */
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
    };
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

/**
 * Form validation helper
 */
function validateForm(formElement) {
    const errors = [];
    const requiredFields = formElement.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            errors.push(`${field.name || field.id || 'Field'} ist erforderlich`);
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });
    
    // Email validation
    const emailFields = formElement.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !isValidEmail(field.value)) {
            errors.push('Ungültige E-Mail-Adresse');
            field.classList.add('error');
        }
    });
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Email validation
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Loading state management
 */
const LoadingManager = {
    activeLoaders: new Set(),
    
    show(id = 'default') {
        this.activeLoaders.add(id);
        this.updateUI();
    },
    
    hide(id = 'default') {
        this.activeLoaders.delete(id);
        this.updateUI();
    },
    
    updateUI() {
        const isLoading = this.activeLoaders.size > 0;
        const overlay = document.querySelector('#loading-overlay');
        const loadingButtons = document.querySelectorAll('.btn-loading');
        
        if (overlay) {
            overlay.style.display = isLoading ? 'flex' : 'none';
        }
        
        loadingButtons.forEach(btn => {
            btn.disabled = isLoading;
        });
        
        // Update cursor
        document.body.style.cursor = isLoading ? 'wait' : '';
    }
};

/**
 * Error handler for unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showGlobalNotification('Ein unerwarteter Fehler ist aufgetreten', 'error', 5000);
});

/**
 * Error handler for JavaScript errors
 */
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
    // Don't show notification for every JS error to avoid spam
});

/**
 * Export functions for use in other scripts
 */
window.PanelUtils = {
    showGlobalNotification,
    hideGlobalNotification,
    showBrowserNotification,
    requestNotificationPermission,
    copyToClipboard,
    apiRequest,
    formatBytes,
    formatDuration,
    escapeHtml,
    validateForm,
    isValidEmail,
    LoadingManager,
    toggleTheme,
    debounce,
    throttle
};

/**
 * Page-specific initialization
 */
function initializePage() {
    const path = window.location.pathname;
    
    switch (path) {
        case '/dashboard':
            if (typeof initDashboard === 'function') {
                initDashboard();
            }
            break;
        case '/config':
            if (typeof initConfigEditor === 'function') {
                initConfigEditor();
            }
            break;
        case '/login':
            if (typeof initLogin === 'function') {
                initLogin();
            }
            break;
    }
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', initializePage);

// Add CSS for notifications
const notificationStyles = `
<style>
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    pointer-events: none;
}

.notification {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-bottom: 10px;
    padding: 16px;
    max-width: 400px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    pointer-events: auto;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.notification::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
}

.notification-success {
    border-left-color: #28a745;
}

.notification-success::before {
    background: #28a745;
}

.notification-error {
    border-left-color: #dc3545;
}

.notification-error::before {
    background: #dc3545;
}

.notification-warning {
    border-left-color: #ffc107;
}

.notification-warning::before {
    background: #ffc107;
}

.notification-info {
    border-left-color: #17a2b8;
}

.notification-info::before {
    background: #17a2b8;
}

.notification-show {
    transform: translateX(0);
    opacity: 1;
}

.notification-hide {
    transform: translateX(100%);
    opacity: 0;
}

.notification-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
}

.notification-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.notification-message {
    font-size: 14px;
    line-height: 1.4;
    color: #333;
}

.notification-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;
    flex-shrink: 0;
}

.notification-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #666;
}

@media (max-width: 768px) {
    .notification-container {
        top: 10px;
        right: 10px;
        left: 10px;
    }
    
    .notification {
        max-width: none;
    }
}

@media (prefers-color-scheme: dark) {
    .notification {
        background: #2d2d2d;
        border-color: #4d4d4d;
        color: #ffffff;
    }
    
    .notification-message {
        color: #ffffff;
    }
}
</style>
`;

// Inject notification styles
document.head.insertAdjacentHTML('beforeend', notificationStyles);
