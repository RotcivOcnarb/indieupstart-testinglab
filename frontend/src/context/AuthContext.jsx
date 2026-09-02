import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('indie_user');
    return saved ? JSON.parse(saved) : {
      userId: 'discord_indie_dev_1001',
      username: 'DevMember#1001',
      avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
      balance: 3, // Initial balance
      createdAt: Date.now(),
    };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('indie_user', JSON.stringify(user));
    }
  }, [user]);

  const updateBalance = (delta) => {
    setUser(prev => {
      if (!prev) return prev;
      const newBal = Math.max(0, prev.balance + delta);
      return { ...prev, balance: newBal };
    });
  };

  const loginWithDiscord = async (code) => {
    const data = await api.loginDiscord(code);
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
