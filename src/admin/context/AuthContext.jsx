import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(() => {
        try {
            const saved = localStorage.getItem('sv_admin');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    // App loading bo'lganda token tekshirish
    useEffect(() => {
        const token = localStorage.getItem('sv_token');
        if (token) {
            authAPI.me()
                .then((res) => {
                    setAdmin(res.data.admin);
                })
                .catch(() => {
                    localStorage.removeItem('sv_token');
                    localStorage.removeItem('sv_admin');
                    setAdmin(null);
                })
                .finally(() => setLoading(false));
        } else {
            setTimeout(() => setLoading(false), 0);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login(email, password);
        const { token, admin: adminData } = res.data;
        localStorage.setItem('sv_token', token);
        localStorage.setItem('sv_admin', JSON.stringify(adminData));
        setAdmin(adminData);
        return adminData;
    };

    const logout = () => {
        localStorage.removeItem('sv_token');
        localStorage.removeItem('sv_admin');
        setAdmin(null);
    };

    return (
        <AuthContext.Provider value={{ admin, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
