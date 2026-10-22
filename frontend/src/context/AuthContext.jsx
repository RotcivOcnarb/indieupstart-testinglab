import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('indie_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('indie_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('indie_user');
    }
  }, [user]);

  const updateBalance = (delta) => {
    setUser(prev => {
      if (!prev) return prev;
      const newBal = Math.max(0, prev.balance + delta);
      return { ...prev, balance: newBal };
    });
  };

  const loginWithDiscord = async (code, redirectUri, referalId) => {
    const data = await api.loginDiscord(code, redirectUri, referalId);
    if (data && data.user) {
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('indie_user');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, updateBalance, loginWithDiscord, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
