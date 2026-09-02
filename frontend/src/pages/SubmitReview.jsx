import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ExternalLink, Gamepad2, Coins, AlertOctagon, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const SubmitReview = () => {
  const { threadId: paramThreadId } = useParams();
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [rating, setRating] = useState(5);
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [improvements, setImprovements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Report Game Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Malware/Vírus');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const loadGames = async () => {
      if (!user) return;
      setLoading(true);
      const res = await api.getGames(user.userId);
      if (res && res.games) {
        setGames(res.games);
        if (paramThreadId) {
          const match = res.games.find(g => g.threadId === paramThreadId);
          if (match) setSelectedGame(match);
        } else if (res.games.length > 0) {
          setSelectedGame(res.games[0]);
        }
      }
      setLoading(false);
    };

    loadGames();
  }, [paramThreadId, user]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedGame) return;

    if (pros.length < 20 || cons.length < 20 || improvements.length < 20) {
      setError('Para garantir um feedback útil ao criador, preencha no mínimo 20 caracteres em cada um dos campos (Prós, Contras e Melhorias).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.createReview({
        threadId: selectedGame.threadId,
        userId: user.userId,
        username: user.username,
        rating,
        pros,
        cons,
        improvements,
      });

      updateBalance(1);
      setSuccess('Review submetida com sucesso! Você ganhou +1 Moeda de Teste 🎉');
      setPros('');
      setCons('');
      setImprovements('');
      
      // Update local state to mark as reviewed
      setGames(prev => prev.map(g => g.threadId === selectedGame.threadId ? { ...g, hasReviewed: true } : g));
      setSelectedGame(prev => ({ ...prev, hasReviewed: true }));
    } catch (err) {
      setError(err.message || 'Erro ao enviar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendGameReport = async (e) => {
    e.preventDefault();
    if (!selectedGame || !reportDetails) return;
    setReporting(true);

    try {
      const res = await api.reportGame({
        threadId: selectedGame.threadId,
        gameTitle: selectedGame.title,
        reporterId: user.userId,
        category: reportCategory,
        details: reportDetails,
      });
      alert(res.message);
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      alert('Erro ao enviar denúncia.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="badge badge-cyan" style={{ marginBottom: '6px' }}>Área de Playtesters</span>
          <h1 style={{ fontSize: '2rem' }}>Submeter Avaliação de Jogo</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Avalie os projetos da comunidade para ganhar <strong>+1 Moeda de Teste</strong> por review.
          </p>
        </div>

        <div className="coin-counter" style={{ padding: '8px 16px', fontSize: '1rem' }}>
          <Coins size={18} />
          <span>Seu Saldo: {user?.balance || 0} Moedas</span>
        </div>
      </div>

      {/* Main Grid: Game Selection List + Review Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Game List Sidebar */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '780px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Jogos Disponíveis ({games.length})
          </h3>

          {loading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Carregando jogos...</div>
          ) : games.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhum jogo no momento.</div>
          ) : (
            games.map(game => (
              <div 
                key={game.threadId}
                onClick={() => { setSelectedGame(game); setError(''); setSuccess(''); }}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedGame?.threadId === game.threadId ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selectedGame?.threadId === game.threadId ? 'var(--primary)' : 'var(--border-glass)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}
              >
                <img 
                  src={game.bannerUrl} 
                  alt={game.title} 
                  style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {game.title}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>{game.stage}</span>
                    {game.hasReviewed && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: '700' }}>✓ Avaliado</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Selected Game & Form Area */}
        {selectedGame ? (
          <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Game Info Card */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)', paddingBottom: '24px' }}>
              <img 
                src={selectedGame.bannerUrl} 
                alt={selectedGame.title} 
                style={{ width: '220px', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }} 
              />
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{selectedGame.title}</h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Por <strong>@{selectedGame.authorName || 'Autor'}</strong> • Estágio: <strong style={{ color: 'var(--primary)' }}>{selectedGame.stage}</strong>
                    </span>
                  </div>
                  <button 
                    className="btn-danger" 
                    onClick={() => setShowReportModal(true)}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <AlertOctagon size={14} />
                    <span>Denunciar Jogo</span>
                  </button>
                </div>

                <p style={{ marginTop: '12px', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {selectedGame.description}
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a 
                    href={selectedGame.gameUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    <ExternalLink size={16} />
                    <span>Jogar / Baixar Demo</span>
                  </a>

                  {selectedGame.tags?.map((t, idx) => (
                    <span key={idx} className="badge badge-cyan">{t}</span>
                  ))}
                  {selectedGame.isNsfw && <span className="badge badge-danger">NSFW +18</span>}
                  {selectedGame.hasAiContent && <span className="badge badge-warning">Uso de IA</span>}
                </div>
              </div>
            </div>

            {/* Review Form or Already Reviewed Notification */}
            {selectedGame.hasReviewed ? (
              <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: '#6ee7b7', textAlign: 'center' }}>
                <CheckCircle size={32} style={{ marginBottom: '8px' }} />
                <h3>Você já avaliou este jogo!</h3>
                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Sua moeda de teste já foi creditada na sua conta. Selecione outro jogo na lista ao lado para realizar novos testes.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', borderLeft: '4px solid var(--primary)', paddingLeft: '10px' }}>
                  Formulário Estruturado de Feedback
                </h3>

                {error && (
                  <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} />
                    <span>{success}</span>
                  </div>
                )}

                {/* Rating selection */}
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '0.9rem' }}>
                    Nota Geral (1 a 5 Estrelas)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: star <= rating ? 'var(--coin-gold)' : 'rgba(255,255,255,0.2)',
                          transition: 'transform 0.1s ease'
                        }}
                      >
                        <Star size={28} fill={star <= rating ? 'var(--coin-gold)' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pros */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Pontos Positivos / Destaques *</label>
                    <span style={{ fontSize: '0.75rem', color: pros.length >= 20 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {pros.length}/20 min caracteres
                    </span>
                  </div>
                  <textarea
                    className="textarea-field"
                    placeholder="Ex: A mecânica de pulo duplo é muito responsiva e a direção de arte das fases é incrível..."
                    value={pros}
                    onChange={(e) => setPros(e.target.value)}
                    required
                  />
                </div>

                {/* Cons */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Pontos Negativos / Bugs Encontrados *</label>
                    <span style={{ fontSize: '0.75rem', color: cons.length >= 20 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {cons.length}/20 min caracteres
                    </span>
                  </div>
                  <textarea
                    className="textarea-field"
                    placeholder="Ex: Notei uma queda de taxa de quadros na segunda boss fight e a câmera travou na parede..."
                    value={cons}
                    onChange={(e) => setCons(e.target.value)}
                    required
                  />
                </div>

                {/* Improvements */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Sugestões de Melhorias *</label>
                    <span style={{ fontSize: '0.75rem', color: improvements.length >= 20 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {improvements.length}/20 min caracteres
                    </span>
                  </div>
                  <textarea
                    className="textarea-field"
                    placeholder="Ex: Recomendo ajustar o menu de opções para permitir remapeamento de teclas no teclado..."
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-coin"
                  disabled={submitting}
                  style={{ justifyContent: 'center', padding: '14px', fontSize: '1.05rem', marginTop: '10px' }}
                >
                  <Coins size={20} />
                  <span>{submitting ? 'Enviando avaliação...' : 'Enviar Review (+1 Moeda de Teste)'}</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Selecione um jogo da lista para começar o playtest.
          </div>
        )}
      </div>

      {/* Report Game Modal */}
      {showReportModal && selectedGame && (
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
              <h3 style={{ fontSize: '1.3rem' }}>Denunciar Jogo: {selectedGame.title}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Esta denúncia será encaminhada diretamente para o canal privado <strong>#mod-logs</strong> da equipe de moderação.
            </p>

            <form onSubmit={handleSendGameReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Categoria da Violarção
                </label>
                <select 
                  className="select-field"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                >
                  <option value="Malware/Vírus">Malware, Vírus ou Executável Suspeito</option>
                  <option value="Phishing/Golpe">Phishing, Golpe ou Cobrança Indevida</option>
                  <option value="Link Corrompido">Link Corrompido / Quebrado</option>
                  <option value="Quebra de Regras">Quebra de Regras da Comunidade / Spam</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                  Detalhes / Motivo da Denúncia *
                </label>
                <textarea 
                  className="textarea-field"
                  placeholder="Explique detalhadamente o problema encontrado..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowReportModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-danger" disabled={reporting}>
                  {reporting ? 'Enviando...' : 'Enviar Denúncia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
