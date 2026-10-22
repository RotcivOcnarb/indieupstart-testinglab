import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithDiscord } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    // Evita execução duplicada em ambiente de desenvolvimento (React StrictMode)
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    
    if (!code) {
      setError('Código de autorização OAuth2 não encontrado na URL');
      setLoading(false);
      return;
    }

    const currentRedirectUri = `${window.location.origin}${window.location.pathname}`;

    const handleAuth = async () => {
      try {
        const referalId = sessionStorage.getItem('referalId');
        const response = await loginWithDiscord(code, currentRedirectUri, referalId);
        
        if (response && response.referralStatus) {
           sessionStorage.setItem('referralResult', JSON.stringify({
             status: response.referralStatus,
             referredBy: response.referredBy
           }));
        }

        setTimeout(() => {
          navigate('/', { replace: true });
        }, 800);
      } catch (err) {
        console.error('Erro na autenticação:', err);
        setError(err.message || 'Falha ao autenticar com o Discord');
        setLoading(false);
      }
    };

    handleAuth();
  }, [searchParams, loginWithDiscord, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '70vh' 
    }}>
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '450px', width: '100%' }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>👾</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Autenticando via Discord...</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
          Conectando suas credenciais da comunidade Indie UpStart.
        </p>

        {loading && (
          <div style={{ color: 'var(--primary)', fontWeight: '600', animation: 'pulse 1.5s infinite' }}>
            Processando Token OAuth2...
          </div>
        )}

        {error && (
          <div>
            <div style={{ color: 'var(--danger)', marginTop: '16px', marginBottom: '20px', fontWeight: '600' }}>
              {error}
            </div>
            <button 
              onClick={() => navigate('/login', { replace: true })} 
              className="btn-primary"
            >
              Voltar para o Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
