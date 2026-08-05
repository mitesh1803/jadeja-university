import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('jadeja_token'));
  const [user, setUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('jadeja_user')); } catch { return null; }
  });

  const login = useCallback((token, user) => {
    localStorage.setItem('jadeja_token', token);
    localStorage.setItem('jadeja_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jadeja_token');
    localStorage.removeItem('jadeja_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
