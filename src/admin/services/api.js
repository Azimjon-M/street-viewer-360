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

// Response interceptor — 401 bo'lsa logout, URL'larni to'g'irlash
api.interceptors.response.use(
    (response) => {
        if (response.data && typeof response.data === 'object') {
            try {
                const str = JSON.stringify(response.data);
                if (str.includes(':5000')) {
                    response.data = JSON.parse(
                        str.replace(/http:\/\/[a-zA-Z0-9.-]+:5000/g, API_BASE)
                    );
                }
            } catch { /* empty */ }
        }
        return response;
    },
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
};

export default api;
