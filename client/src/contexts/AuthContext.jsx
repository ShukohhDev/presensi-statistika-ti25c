import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                api.getMe().then(data => {
                    setUser(data.user);
                    setSettings(data.settings);
                    localStorage.setItem('user', JSON.stringify(data.user));
                }).catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                });
            } catch {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (name, password) => {
        const data = await api.login(name, password);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);

        // Load settings
        try {
            const meData = await api.getMe();
            setSettings(meData.settings);
        } catch {
            // Settings will load on next refresh
        }

        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch {
            // Continue logout even if API fails
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setSettings(null);
    }, []);

    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }, []);

    const updateSettings = useCallback((newSettings) => {
        setSettings(newSettings);
    }, []);

    const value = {
        user,
        settings,
        loading,
        login,
        logout,
        updateUser,
        updateSettings,
        isAdmin: user?.role === 'admin',
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
