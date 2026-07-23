// Logger - writes to global array for debugging
const Logger = {
  logs: [],
  maxLogs: 500,
  _inLog: false,

  init() {
    try {
      const saved = localStorage.getItem('game_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {}
  },

  save() {
    try {
      localStorage.setItem('game_logs', JSON.stringify(this.logs.slice(-200)));
    } catch (e) {}
  },

  log(...args) {
    if (this._inLog) return;
    this._inLog = true;
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    const entry = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();
    this.save();
    this._updatePanel();
    this._inLog = false;
  },

  error(...args) {
    if (this._inLog) return;
    this._inLog = true;
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    const entry = `[${new Date().toLocaleTimeString()}] ERROR: ${msg}`;
    this.logs.push(entry);
    this.save();
    this._updatePanel();
    this._inLog = false;
  },

  warn(...args) {
    if (this._inLog) return;
    this._inLog = true;
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    const entry = `[${new Date().toLocaleTimeString()}] WARN: ${msg}`;
    this.logs.push(entry);
    this.save();
    this._updatePanel();
    this._inLog = false;
  },

  getAll() {
    return this.logs.join('\n');
  },

  clear() {
    this.logs = [];
    localStorage.removeItem('game_logs');
  },

  exportToFile() {
    const blob = new Blob([this.getAll()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game_log_' + Date.now() + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  },

  // Debug panel
  _panel: null,
  _panelVisible: false,

  initPanel() {
    this._panel = document.getElementById('debug-panel');
    if (!this._panel) return;

    document.getElementById('debug-close').addEventListener('click', () => {
      this.togglePanel();
    });

    document.getElementById('debug-export').addEventListener('click', () => {
      this.exportToFile();
    });
  },

  togglePanel() {
    if (!this._panel) this.initPanel();
    if (!this._panel) return;

    this._panelVisible = !this._panelVisible;
    this._panel.classList.toggle('hidden', !this._panelVisible);
    if (this._panelVisible) this._updatePanel();
  },

  _updatePanel() {
    if (!this._panel || !this._panelVisible) return;

    const logsDiv = document.getElementById('debug-logs');
    if (!logsDiv) return;

    const recentLogs = this.logs.slice(-50);
    logsDiv.innerHTML = recentLogs.map(log => {
      let cls = '';
      if (log.includes('ERROR')) cls = 'error';
      else if (log.includes('WARN')) cls = 'warn';
      return `<div class="${cls}">${log}</div>`;
    }).join('');

    logsDiv.scrollTop = logsDiv.scrollHeight;
  }
};

// Hotkeys
window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // Ctrl+Shift+L = toggle debug panel
  if (e.ctrlKey && e.shiftKey && key === 'l') {
    e.preventDefault();
    e.stopPropagation();
    Logger.togglePanel();
  }
  // Ctrl+L = export logs (only if shift is NOT pressed)
  else if (e.ctrlKey && !e.shiftKey && key === 'l') {
    e.preventDefault();
    e.stopPropagation();
    Logger.exportToFile();
  }
});

// Catch uncaught errors (filter noise)
window.addEventListener('error', (e) => {
  // Skip cross-origin errors (Script error.) and SDK errors
  if (e.message === 'Script error.' || !e.filename || 
      e.filename.includes('sdk.js') || e.filename.includes('cdnjs.cloudflare')) {
    return;
  }
  Logger.error('Error:', e.message, 'at', e.filename + ':' + e.lineno);
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  // Skip SDK-related and cross-origin rejections
  if (!reason || (typeof reason === 'string' && 
      (reason.includes('sdk') || reason.includes('Script error')))) {
    return;
  }
  Logger.error('Rejection:', reason);
});

// Debug button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-debug-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      Logger.togglePanel();
    });
  }
  Logger.log('Logger ready. Click LOG button or press Ctrl+Shift+L');
});
