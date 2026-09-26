// Centralized API & WebSocket Configuration with automatic Production / Localhost resolution

const isProduction = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('onrender.com') ||
    window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol === 'https:'
);

const RENDER_BACKEND_ORIGIN = 'https://collaborative-code-editor-q142.onrender.com';

export const BACKEND_URL = (() => {
    const envUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_API_BASE;
    if (envUrl && !envUrl.includes('localhost')) return envUrl.replace(/\/+$/, '');
    if (isProduction) return RENDER_BACKEND_ORIGIN;
    return (envUrl || 'http://localhost:8000').replace(/\/+$/, '');
})();

export const BACKEND_API = (() => {
    const envApi = import.meta.env.VITE_BACKEND_API;
    if (envApi && !envApi.includes('localhost')) return envApi.replace(/\/+$/, '');
    if (isProduction) return `${RENDER_BACKEND_ORIGIN}/api`;
    return (envApi || 'http://localhost:8000/api').replace(/\/+$/, '');
})();

export const WS_API = (() => {
    const envWs = import.meta.env.VITE_WS_API;
    if (envWs && !envWs.includes('localhost')) return envWs.replace(/\/+$/, '');
    if (isProduction) return 'wss://collaborative-code-editor-q142.onrender.com/yjs';
    return envWs || 'ws://localhost:8000/yjs';
})();
