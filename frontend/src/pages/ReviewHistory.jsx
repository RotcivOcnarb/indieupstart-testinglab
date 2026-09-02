import React, { useState, useEffect } from 'react';
import { History, Star, Gamepad2, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReviewHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!user) return;
    const localReviews = JSON.parse(localStorage.getItem('indie_reviews') || '[]');
    const myReviews = localReviews.filter(r => r.userId === user.userId);
    setHistory(myReviews.reverse());
  }, [user]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>Histórico Pessoal</span>
        <h1 style={{ fontSize: '2rem' }}>Minhas Avaliações Enviadas</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Registro completo de todos os testes de jogos e feedbacks que você enviou para a comunidade.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <History size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <h3>Nenhuma avaliação realizada ainda.</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
            Acesse a aba <strong>Submeter Review</strong> para testar novos projetos e ganhar Moedas de Teste!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.map((rev, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Gamepad2 color="var(--primary)" size={22} />
                  <div>
                    <h3 style={{ fontSize: '1.2rem' }}>Tópico ID: {rev.threadId}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Enviado em: {new Date(rev.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="coin-counter" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                    <Coins size={14} />
                    <span>+1 Moeda Ganha</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--coin-gold)', fontWeight: '700' }}>
                    <Star fill="var(--coin-gold)" size={18} />
                    <span>{rev.rating}/5</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '0.9rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
                  <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '4px' }}>Prós:</strong>
                  {rev.pros}
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--danger)' }}>
                  <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '4px' }}>Contras:</strong>
                  {rev.cons}
                </div>
                <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--secondary)' }}>
                  <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>Melhorias:</strong>
                  {rev.improvements}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
