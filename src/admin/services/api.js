import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
const api = axios.create({
    baseURL: API_BASE,
});

// Request interceptor — har so'rovga token qo'shish
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('sv_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — 401 bo'lsa logout
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('sv_token');
            localStorage.removeItem('sv_admin');
            if (!window.location.pathname.includes('/admin/login')) {
                window.location.href = '/admin/login';
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Helper: relative URL ni to'liq URL ga aylantirish.
 * Agar URL allaqachon http(s) bilan boshlansa, o'zgartirmaydi.
 * Agar `/uploads/...` shaklida bo'lsa, API_BASE ni qo'shadi.
 */
export const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

// ── Auth ──────────────────────────────────────────────────────────────
export const authAPI = {
    login: (email, password) =>
        api.post('/api/auth/login', { email, password }),
    me: () => api.get('/api/auth/me'),
};

// ── Modules (YANGI — v2.0.0) ─────────────────────────────────────────
export const modulesAPI = {
    getAll: (all = false) => api.get(`/api/modules${all ? '?all=true' : ''}`),
    getOne: (slug) => api.get(`/api/modules/${slug}`),
    create: (data) => api.post('/api/modules', data),
    update: (slug, data) => api.patch(`/api/modules/${slug}`, data),
    delete: (slug) => api.delete(`/api/modules/${slug}`),
};

// ── Scenes (module-scoped) ───────────────────────────────────────────
export const scenesAPI = {
    getAll: (slug = 'default') => api.get(`/api/modules/${slug}/scenes`),
    getOne: (slug, id) => api.get(`/api/modules/${slug}/scenes/${id}`),
    create: (slug, data) => api.post(`/api/modules/${slug}/scenes`, data),
    update: (slug, id, data) => api.patch(`/api/modules/${slug}/scenes/${id}`, data),
    delete: (slug, id) => api.delete(`/api/modules/${slug}/scenes/${id}`),
};

// ── MiniMap (module-scoped) ──────────────────────────────────────────
export const miniMapAPI = {
    get: (slug = 'default') => api.get(`/api/modules/${slug}/minimap`),
    setImage: (slug, data) => api.post(`/api/modules/${slug}/minimap`, data),
    updateScenes: (slug, scenes) => api.patch(`/api/modules/${slug}/minimap`, { scenes }),
    updateFloors: (slug, floors, defaultFloor) => api.patch(`/api/modules/${slug}/minimap`, { floors, defaultFloor }),
    update: (slug, data) => api.patch(`/api/modules/${slug}/minimap`, data),
};

// ── Upload (module-scoped) ───────────────────────────────────────────
export const uploadAPI = {
    sceneImages: (slug, formData) =>
        api.post(`/api/modules/${slug}/upload/scene-images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    miniMapImage: (slug, formData) =>
        api.post(`/api/modules/${slug}/upload/minimap-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    moduleThumbnail: (slug, formData) =>
        api.post(`/api/modules/${slug}/upload/module-thumbnail`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    pinAudio: (slug, formData) =>
        api.post(`/api/modules/${slug}/upload/pin-audio`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export default api;
