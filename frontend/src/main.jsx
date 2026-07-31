import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global interceptors to route /api and /ws to VITE_API_URL when deployed
const originalFetch = window.fetch;
window.fetch = function() {
  let [resource, config] = arguments;
  if (typeof resource === 'string' && resource.startsWith('/api') && import.meta.env.VITE_API_URL) {
    resource = import.meta.env.VITE_API_URL + resource.replace('/api', '');
    config = config || {};
    config.headers = {
      ...config.headers,
      'Bypass-Tunnel-Reminder': 'true'
    };
  }
  return originalFetch(resource, config);
};

const originalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  if (typeof url === 'string' && url.includes('/ws') && import.meta.env.VITE_API_URL) {
    let wsBase = import.meta.env.VITE_API_URL;
    if (wsBase.startsWith('http')) {
      wsBase = wsBase.replace(/^http/, 'ws');
    }
    const wsUrl = wsBase + '/ws';
    return new originalWebSocket(wsUrl, protocols);
  }
  return new originalWebSocket(url, protocols);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
