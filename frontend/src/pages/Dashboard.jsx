import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, PlusCircle, Gamepad2, Star, MessageSquare, Flame, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Dashboard = () => {
  const { user } = useAuth();
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const gamesRes = await api.getGames(user.userId);
      if (gamesRes) {
        setTotalGames(gamesRes.totalGames || 0);
      }
      
      const localReviews = JSON.parse(localStorage.getItem('indie_reviews') || '[]');
      setRecentReviews(localReviews.slice(-4).reverse());
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Formula C = min(N, 10)
  const currentPublishCost = Math.min(totalGames, 10);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ 
        padding: '32px 40px', 
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)',
        border: '1px solid var(--border-glow)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span className="badge badge-purple" style={{ marginBottom: '10px' }}>
            Painel do Desenvolvedor
          </span>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '8px' }}>
            Bem-vindo de volta, {user?.username || 'Criador'}!
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '600px' }}>
            Participe da economia colaborativa: avalie projetos indies para acumular <strong>Moedas de Teste</strong> e liberar espaço para divulgar o seu jogo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/publish" className="btn-primary">
            <PlusCircle size={18} />
            <span>Publicar Jogo</span>
          </Link>
          <Link to="/reviews" className="btn-coin">
            <Gamepad2 size={18} />
            <span>Avaliar Jogos (+1 Moeda)</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--coin-gold)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Meu Saldo</span>
            <Coins size={24} />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: 'white' }}>
            {user?.balance || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Moedas de Teste disponíveis
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Custo Atual de Publicação</span>
            <Flame size={24} />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: 'white' }}>
            {currentPublishCost} <span style={{ fontSize: '1.2rem', color: 'var(--coin-gold)' }}>Moedas</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Fórmula Dinâmica: C = min({totalGames} jogos, 10)
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary)', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total de Jogos Ativos</span>
            <TrendingUp size={24} />
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: '800', color: 'white' }}>
            {totalGames}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Projetos aguardando playtest no servidor
          </span>
        </div>
      </div>

      {/* Recent Reviews Feed */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.3rem' }}>Feed de Avaliações Recentes da Comunidade</h3>
          </div>
          <Link to="/my-games" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600', textDecoration: 'none' }}>
            Ver todos os meus jogos →
          </Link>
        </div>

        {recentReviews.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
            <p>Nenhuma avaliação recente registrada no momento.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Submeta um review para desbloquear moedas e ver seu feedback aqui!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentReviews.map((rev, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', color: 'var(--primary)' }}>@{rev.username || 'Playtester'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--coin-gold)' }}>
                    <Star size={16} fill="var(--coin-gold)" />
                    <span style={{ fontWeight: '700' }}>{rev.rating}/5</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '6px' }}>
                  <strong>Prós:</strong> {rev.pros}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  <strong>Melhorias Sugeridas:</strong> {rev.improvements}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
