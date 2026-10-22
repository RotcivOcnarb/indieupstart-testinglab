import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Coins, PlusCircle, Gamepad2, Star, MessageSquare, Flame, TrendingUp, Activity, Rocket, Sparkles, Copy, Check, Trophy, Timer, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Dashboard = () => {
  const { user } = useAuth();
  const [myGamesReviews, setMyGamesReviews] = useState([]);
  const [communityUpdates, setCommunityUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalGames, setTotalGames] = useState(0);
  const [referralPopup, setReferralPopup] = useState(null);
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [weeklyGame, setWeeklyGame] = useState(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const refResult = sessionStorage.getItem('referralResult');
    if (refResult) {
      try {
        setReferralPopup(JSON.parse(refResult));
      } catch (e) {}
      sessionStorage.removeItem('referralResult');
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const gamesRes = await api.getGames(user.userId);
      if (gamesRes) {
        setTotalGames(gamesRes.totalGames || 0);

        const allGames = gamesRes.games || [];
        const userGames = allGames.filter(g => g.authorId === user.userId);
        
        // 1. Reviews nos jogos do usuário
        let myReviews = userGames.flatMap(g => (g.reviews || []).map(r => ({ ...r, gameTitle: g.title })));
        myReviews.sort((a, b) => b.createdAt - a.createdAt);
        setMyGamesReviews(myReviews.slice(0, 4));

        // 2. Atualizações da comunidade (Jogos + Reviews de outras pessoas)
        let updates = [];
        
        // Jogos publicados por outros
        allGames.filter(g => g.authorId !== user.userId).forEach(g => {
          updates.push({
            type: 'GAME_PUBLISHED',
            id: `game-${g.threadId}`,
            authorName: g.authorName || 'Desenvolvedor',
            gameTitle: g.title,
            createdAt: g.createdAt || 0,
            stage: g.stage
          });
        });

        // Reviews publicados por outros em jogos de outros
        allGames.forEach(g => {
          if (g.authorId !== user.userId) {
            (g.reviews || []).forEach(r => {
              if (r.userId !== user.userId) {
                updates.push({
                  type: 'REVIEW_POSTED',
                  id: `rev-${r.threadId}-${r.userId}`,
                  authorName: r.username || 'Playtester',
                  gameTitle: g.title,
                  rating: r.rating,
                  pros: r.pros,
                  improvements: r.improvements,
                  createdAt: r.createdAt || 0
                });
              }
            });
          }
        });

        updates.sort((a, b) => b.createdAt - a.createdAt);
        setCommunityUpdates(updates.slice(0, 6));
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Carrega o Jogo da Semana
  useEffect(() => {
    const loadWeeklyGame = async () => {
      try {
        const res = await api.getWeeklyGame();
        if (res?.weeklyGame) {
          setWeeklyGame(res.weeklyGame);
        }
      } catch (e) {
        console.warn('Não foi possível carregar o Jogo da Semana.', e);
      }
    };
    loadWeeklyGame();
  }, []);

  // Countdown até a próxima seleção (expiresAt do jogo da semana)
  useEffect(() => {
    if (!weeklyGame?.expiresAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = weeklyGame.expiresAt - now;
      if (diff <= 0) {
        setCountdown('Aguardando próxima seleção...');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [weeklyGame]);

  const currentPublishCost = Math.min(5, Math.floor(totalGames / 2));

  const handleCopyLink = () => {
    const link = `${window.location.origin}/login?referal=${user?.userId}`;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link);
    } else {
      // Fallback para HTTP / ambientes sem SecureContext
      const textArea = document.createElement("textarea");
      textArea.value = link;
      // move para fora da tela
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Falha ao copiar', err);
      }
      document.body.removeChild(textArea);
    }
    
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

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

      {/* Referral Banner */}
      <div className="glass-panel" style={{
        padding: '24px 32px',
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '50%' }}>
            <Sparkles size={28} color="#10b981" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: '#10b981' }}>Programa de Indicações</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px' }}>
              Convide outros devs! Quando alguém criar uma conta usando seu link, <strong>você e a pessoa ganham 1 Moeda de Teste extra</strong>.
            </p>
          </div>
        </div>
        
        <button onClick={() => setShowLinkPopup(true)} className="btn-primary" style={{ background: '#10b981', color: '#111827', fontWeight: 'bold', border: 'none' }}>
          Gerar Meu Link
        </button>
      </div>

      {/* Referral Link Modal */}
      {showLinkPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel animate-fade-in" style={{
            maxWidth: '450px', width: '100%', padding: '32px', textAlign: 'center',
            background: 'var(--bg-panel)'
          }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: '#10b981' }}>Seu Link de Convite</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
              Mande esse link para seus amigos. Quando eles criarem a conta usando o link, vocês dois ganham moedas!
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px',
              marginBottom: '24px'
            }}>
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/login?referal=${user?.userId}`} 
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                onClick={handleCopyLink}
                style={{
                  background: copyFeedback ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: copyFeedback ? '1px solid #10b981' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: copyFeedback ? '#10b981' : 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: '0.2s ease'
                }}
              >
                {copyFeedback ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <button onClick={() => setShowLinkPopup(false)} className="btn-secondary" style={{ width: '100%' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {referralPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel animate-fade-in" style={{
            maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center',
            border: referralPopup.status === 'SUCCESS' ? '1px solid var(--coin-gold)' : '1px solid var(--danger)',
            background: 'var(--bg-panel)'
          }}>
            {referralPopup.status === 'SUCCESS' ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--coin-gold)' }}>Bônus de Indicação!</h2>
                <p style={{ color: 'var(--text-main)', marginBottom: '24px' }}>
                  <strong>{referralPopup.referredBy}</strong> te indicou!<br/>
                  Vocês dois ganharam <strong>+1 Moeda de Teste</strong> para começar com o pé direito!
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--danger)' }}>Aviso de Indicação</h2>
                <p style={{ color: 'var(--text-main)', marginBottom: '24px' }}>
                  Contas já existentes não podem receber bônus de indicação. Mesmo assim, que bom te ver de volta!
                </p>
              </>
            )}
            <button onClick={() => setReferralPopup(null)} className="btn-primary" style={{ width: '100%' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

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
            Fórmula Dinâmica: C = min({totalGames} jogos/2, 5)
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

      {/* Weekly Game of the Week Banner */}
      {weeklyGame && (
        <div className="glass-panel" style={{
          padding: '0',
          overflow: 'hidden',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.06) 50%, rgba(139, 92, 246, 0.08) 100%)',
          position: 'relative',
        }}>
          {/* Glow top bar */}
          <div style={{
            height: '3px',
            background: 'linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6)',
          }} />

          <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap' }}>
            {/* Banner Image */}
            {weeklyGame.gameBannerUrl && (
              <div style={{
                width: '220px',
                minHeight: '180px',
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <img
                  src={weeklyGame.gameBannerUrl}
                  alt={weeklyGame.gameTitle}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    minHeight: '180px',
                  }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to right, transparent 60%, rgba(11,13,23,0.8) 100%)'
                }} />
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, padding: '28px 32px', minWidth: '280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <Trophy size={20} color="#f59e0b" />
                <span style={{
                  fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#f59e0b'
                }}>Jogo da Semana</span>
                <span className="badge" style={{
                  background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
                  border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.7rem'
                }}>
                  <Zap size={10} /> 2x Moedas
                </span>
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '8px', color: 'white' }}>
                {weeklyGame.gameTitle}
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px', maxWidth: '500px', lineHeight: '1.5' }}>
                {weeklyGame.gameDescription?.slice(0, 150)}
                {weeklyGame.gameDescription?.length > 150 ? '...' : ''}
              </p>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {/* Review Count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="var(--secondary)" />
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'white' }}>{weeklyGame.reviewCount ?? 0}</strong> reviews essa semana
                  </span>
                </div>

                {/* Countdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Timer size={16} color="var(--primary)" />
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                    Próxima seleção em <strong style={{ color: '#c084fc', fontVariantNumeric: 'tabular-nums' }}>{countdown}</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Link
                  to={`/review/${weeklyGame.threadId}`}
                  className="btn-coin"
                  style={{ fontSize: '0.95rem' }}
                >
                  <Star size={16} />
                  Avaliar e Ganhar 2x Moedas
                </Link>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  por <strong style={{ color: 'white' }}>{weeklyGame.authorName}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* My Games Reviews Feed */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '1.3rem' }}>Feedback Recebido</h3>
            </div>
            <Link to="/my-games" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '600', textDecoration: 'none' }}>
              Ver todos →
            </Link>
          </div>

          {myGamesReviews.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
              <p>Nenhum feedback recebido nos seus jogos ainda.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Publique seus projetos para receber avaliações da comunidade!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myGamesReviews.map((rev, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>@{rev.username || 'Playtester'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--coin-gold)' }}>
                      <Star size={16} fill="var(--coin-gold)" />
                      <span style={{ fontWeight: '700' }}>{rev.rating}/5</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Em <strong>{rev.gameTitle}</strong>
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

        {/* Community Updates Feed */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={22} color="var(--secondary)" />
              <h3 style={{ fontSize: '1.3rem' }}>Atividade da Comunidade</h3>
            </div>
          </div>

          {communityUpdates.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
              <p>Nenhuma atividade recente na comunidade.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {communityUpdates.map((update, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderLeft: update.type === 'GAME_PUBLISHED' ? '3px solid var(--secondary)' : '3px solid var(--primary)' }}>
                  {update.type === 'GAME_PUBLISHED' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <Rocket size={16} color="var(--secondary)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Novo jogo publicado</span>
                      </div>
                      <div style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                        <strong style={{ color: 'var(--secondary)' }}>@{update.authorName}</strong> publicou <strong>{update.gameTitle}</strong> 
                        <span className="badge badge-purple" style={{ marginLeft: '8px', fontSize: '0.7rem' }}>{update.stage}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <MessageSquare size={16} color="var(--primary)" />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nova avaliação</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--coin-gold)', marginLeft: 'auto' }}>
                          <Star size={14} fill="var(--coin-gold)" />
                          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{update.rating}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                        <strong style={{ color: 'var(--primary)' }}>@{update.authorName}</strong> avaliou <strong>{update.gameTitle}</strong>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        "{update.pros.length > 80 ? update.pros.substring(0, 80) + '...' : update.pros}"
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
