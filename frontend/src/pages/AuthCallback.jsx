import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithDiscord } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code') || 'demo_code_12345';
    
    const handleAuth = async () => {
      try {
        await loginWithDiscord(code);
        setTimeout(() => {
          navigate('/');
        }, 1200);
      } catch (err) {
        setError(err.message || 'Falha ao autenticar com o Discord');
        setLoading(false);
      }
    };

    handleAuth();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '70vh' 
    }}>
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '450px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>👾</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Autenticando via Discord...</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Conectando suas credenciais da comunidade Indie Feedback.
        </p>

        {loading && (
          <div style={{ color: 'var(--primary)', fontWeight: '600', animation: 'pulse 1.5s infinite' }}>
            Processando Token OAuth2...
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--danger)', marginTop: '16px' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
