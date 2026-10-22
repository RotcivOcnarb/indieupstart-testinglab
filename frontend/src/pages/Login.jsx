import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gamepad2, Coins, MessageSquareCode, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Login = () => {
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [inviter, setInviter] = useState(null);

  useEffect(() => {
    const referalId = searchParams.get('referal');
    if (referalId) {
      api.getUserProfile(referalId).then(data => {
        if (data && data.username) {
          setInviter(data);
          sessionStorage.setItem('referalId', referalId);
        }
      }).catch(err => {
        console.error('Invalid referal:', err);
        sessionStorage.removeItem('referalId');
      });
    } else {
      sessionStorage.removeItem('referalId');
    }
  }, [searchParams]);

  const handleDiscordLogin = () => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;

    if (!clientId || clientId === 'seu_discord_client_id_aqui' || clientId.startsWith('seu_')) {
      alert('Erro: CLIENT ID do Discord não configurado no ambiente. Não é possível realizar login.');
      return;
    }
    
    const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=identify`;
    window.location.href = discordAuthUrl;
  };

  return (
    <div style={{
      minHeight: '90vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} className="animate-fade-in">
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '48px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.2)'
      }}>
        {/* Glow Decorator */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
          borderRadius: '50%'
        }} />

        {inviter && (
          <div style={{ 
            marginBottom: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '12px', 
            background: 'rgba(139, 92, 246, 0.1)', 
            padding: '12px 20px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--primary)',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)'
          }} className="animate-fade-in">
            <img src={inviter.avatarUrl} alt="Inviter Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Você foi convidado por:</div>
              <div style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>{inviter.username}</div>
            </div>
          </div>
        )}

        {/* Logo Badge */}
        <img 
          src="/Logo 1-1 Fundo.png" 
          alt="Logo" 
          style={{ 
            width: '72px', 
            height: '72px', 
            borderRadius: '20px', 
            objectFit: 'contain', 
            margin: '0 auto 24px', 
            display: 'block',
            boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)'
          }} 
        />

        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: '800',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #ffffff 0%, #9ca3af 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          INDIE UPSTART
        </h1>

        <p style={{
          color: 'var(--text-muted)',
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          Conecte-se com sua conta do Discord para entrar no ecossistema de playtests, acumular Moedas de Teste e receber avaliações detalhadas para seus jogos.
        </p>

        {/* Feature Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '36px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 8px',
            textAlign: 'center'
          }}>
            <Coins size={22} style={{ color: '#f59e0b', marginBottom: '6px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '700' }}>Moedas de Teste</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 8px',
            textAlign: 'center'
          }}>
            <MessageSquareCode size={22} style={{ color: '#8b5cf6', marginBottom: '6px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '700' }}>Fórum Discord</div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 8px',
            textAlign: 'center'
          }}>
            <ShieldCheck size={22} style={{ color: '#06b6d4', marginBottom: '6px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: '700' }}>Moderação Ativa</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            onClick={handleDiscordLogin}
            style={{
              background: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 28px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: '700',
              fontSize: '1.05rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              boxShadow: '0 6px 25px rgba(88, 101, 242, 0.4)',
              transition: 'var(--transition-fast)'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Entrar com Discord
          </button>
        </div>
      </div>
    </div>
  );
};
