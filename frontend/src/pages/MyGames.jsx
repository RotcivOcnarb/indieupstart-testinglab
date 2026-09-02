import React, { useState, useEffect } from 'react';
import { FolderKanban, Star, AlertTriangle, ShieldAlert, MessageSquare, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const MyGames = () => {
  const { user } = useAuth();
  const [myGames, setMyGames] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Report Superficial Review modal states
  const [showReportReviewModal, setShowReportReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const loadMyGames = async () => {
      if (!user) return;
      const res = await api.getGames(user.userId);
      if (res && res.games) {
        // Filter games created by user or show all for demo
        const userGames = res.games.filter(g => g.authorId === user.userId || g.authorName === user.username);
        setMyGames(userGames.length > 0 ? userGames : res.games);
      }

      const localReviews = JSON.parse(localStorage.getItem('indie_reviews') || '[]');
      setReviews(localReviews);
      setLoading(false);
    };

    loadMyGames();
  }, [user]);

  const handleOpenReportReview = (rev) => {
    setSelectedReview(rev);
    setShowReportReviewModal(true);
  };

  const handleSendReviewReport = async (e) => {
    e.preventDefault();
    if (!selectedReview || !reportReason) return;
    setReporting(true);

    try {
      const res = await api.reportReview({
        threadId: selectedReview.threadId,
        reviewUserId: selectedReview.userId,
        reporterId: user.userId,
        reason: reportReason,
        category: 'Review Superficial / Copiada / Spam',
      });
      alert(res.message);
      setShowReportReviewModal(false);
      setReportReason('');
    } catch (err) {
      alert('Erro ao enviar denúncia.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="badge badge-purple" style={{ marginBottom: '6px' }}>Painel do Criador</span>
          <h1 style={{ fontSize: '2rem' }}>Meus Jogos & Feedbacks Acumulados</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Acompanhe o retorno dos playtesters sobre seus projetos e gerencie suas publicações.
          </p>
        </div>

        <Link to="/publish" className="btn-primary">
          <PlusCircle size={18} />
          <span>Publicar Outro Jogo</span>
        </Link>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando seus jogos...
        </div>
      ) : myGames.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FolderKanban size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <h3>Você ainda não publicou nenhum jogo.</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '6px', marginBottom: '20px' }}>
            Acumule moedas testando outros jogos e publique seu projeto para a comunidade!
          </p>
          <Link to="/publish" className="btn-primary">
            Publicar Primeiro Jogo
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {myGames.map((game) => {
            const gameReviews = reviews.filter(r => r.threadId === game.threadId);
            const avgRating = gameReviews.length > 0
              ? (gameReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / gameReviews.length).toFixed(1)
              : 'N/A';

            return (
              <div key={game.threadId} className="glass-panel" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
                  <img 
                    src={game.bannerUrl} 
                    alt={game.title} 
                    style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <h2 style={{ fontSize: '1.4rem' }}>{game.title}</h2>
                      <span className="badge badge-cyan">{game.stage}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                      ID da Thread Discord: <code>{game.threadId}</code> • Publicado em: {new Date(game.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--coin-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Star fill="var(--coin-gold)" size={24} />
                      <span>{avgRating}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {gameReviews.length} avaliações recebidas
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} />
                  <span>Feedbacks dos Playtesters</span>
                </h4>

                {gameReviews.length === 0 ? (
                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Nenhum feedback recebido ainda para este jogo. O tópico está aberto no Fórum Discord!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {gameReviews.map((rev, idx) => (
                      <div key={idx} style={{ padding: '16px 20px', background: 'rgba(15, 20, 35, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--primary)' }}>@{rev.username || 'Playtester'}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--coin-gold)' }}>
                              <Star size={14} fill="var(--coin-gold)" />
                              <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{rev.rating}/5</span>
                            </div>
                          </div>

                          <button 
                            className="btn-danger"
                            onClick={() => handleOpenReportReview(rev)}
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          >
                            <AlertTriangle size={12} />
                            <span>Denunciar Review Superficial</span>
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--success)' }}>
                            <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '4px' }}>✓ Prós:</strong>
                            {rev.pros}
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--danger)' }}>
                            <strong style={{ color: 'var(--danger)', display: 'block', marginBottom: '4px' }}>✗ Contras:</strong>
                            {rev.cons}
                          </div>
                          <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '10px', borderRadius: '6px', borderLeft: '3px solid var(--secondary)' }}>
                            <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>💡 Melhorias:</strong>
                            {rev.improvements}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Report Review Modal */}
      {showReportReviewModal && selectedReview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '28px', border: '1px solid var(--danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', marginBottom: '12px' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: '1.2rem' }}>Denunciar Review Superficial</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Se esta avaliação for genérica (ex: "muito bom", textos copiados ou sem análise real), notifique a moderação via Webhook no canal <strong>#mod-logs</strong> para estorno.
            </p>

            <form onSubmit={handleSendReviewReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Motivo da Denúncia *
                </label>
                <textarea 
                  className="textarea-field"
                  placeholder="Explique por que esta avaliação não atende aos requisitos mínimos de qualidade..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReportReviewModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-danger" disabled={reporting}>
                  {reporting ? 'Enviando...' : 'Notificar Moderação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
