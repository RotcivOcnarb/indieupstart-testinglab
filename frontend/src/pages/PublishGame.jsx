import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Upload, Flame, Coins, ShieldAlert, CheckCircle, AlertTriangle, Search, X, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TagSelector } from '../components/TagSelector';

export const PublishGame = () => {
  const { user, updateBalance } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState('Alpha');
  const [gameUrl, setGameUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [bannerUrl, setBannerUrl] = useState('');
  const [isNsfw, setIsNsfw] = useState(false);
  const [hasAiContent, setHasAiContent] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [totalGames, setTotalGames] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin: publicar em nome de outro usuário
  const isAdmin = user?.role === 'admin';
  const [adminTargetQuery, setAdminTargetQuery] = useState('');
  const [adminTargetResults, setAdminTargetResults] = useState([]);
  const [adminTargetUser, setAdminTargetUser] = useState(null);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminSearched, setAdminSearched] = useState(false);

  useEffect(() => {
    const fetchGamesCount = async () => {
      if (user) {
        const res = await api.getGames(user.userId);
        if (res) setTotalGames(res.totalGames || 0);
      }
    };
    fetchGamesCount();
  }, [user]);

  // C = min(5, floor(N/2))
  const cost = Math.min(5, Math.floor(totalGames / 2));
  const hasEnoughCoins = (user?.balance || 0) >= cost;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem do banner excede o tamanho máximo permitido de 5 MB.');
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Formato inválido. Envie um arquivo PNG, JPEG ou WebP.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      // 1. Solicita a Pre-signed URL de upload para o backend
      const uploadRes = await api.getUploadUrl(file.type, file.name);

      if (!uploadRes || !uploadRes.uploadUrl) {
        throw new Error('Não foi possível obter a URL de upload do S3.');
      }

      // 2. Faz o upload DIRETO do arquivo para o S3 via PUT na Pre-signed URL
      const s3Res = await fetch(uploadRes.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!s3Res.ok) {
        throw new Error(`Falha no upload direto para o S3. Status: ${s3Res.status}`);
      }

      setBannerUrl(uploadRes.publicUrl);
      setSuccess('Banner enviado e salvo com sucesso no S3!');
    } catch (err) {
      console.error('Erro no upload do banner:', err);
      setError(err.message || 'Erro ao enviar imagem do banner para o S3.');
    } finally {
      setUploading(false);
    }
  };

  const handleAdminSearchUsers = async () => {
    if (!adminTargetQuery.trim()) return;
    setAdminSearching(true);
    try {
      const data = await api.adminGetUsers(user.userId, adminTargetQuery);
      setAdminTargetResults(data);
      setAdminSearched(true);
    } catch (err) {
      setError('Erro ao buscar usuários: ' + err.message);
    } finally {
      setAdminSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Se admin publicando por outro usuário, ignora custo de moedas
    if (!isAdmin || !adminTargetUser) {
      if (!hasEnoughCoins) {
        setError(`Saldo insuficiente. É necessário acumular pelo menos ${cost} Moedas de Teste avaliando outros jogos.`);
        return;
      }
    }

    if (!title || !description || !gameUrl) {
      setError('Preencha todos os campos obrigatórios (Título, Descrição e Link do Jogo).');
      return;
    }

    setPublishing(true);
    setError('');

    try {
      if (isAdmin && adminTargetUser) {
        // Publicar como admin em nome de outro usuário
        await api.adminCreateGame(user.userId, {
          authorId: adminTargetUser.userId,
          authorName: adminTargetUser.username,
          title,
          description,
          stage,
          tags: selectedTags,
          gameUrl,
          bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
          isNsfw,
          hasAiContent,
        });
        setSuccess(`Jogo publicado com sucesso em nome de ${adminTargetUser.username}!`);
      } else {
        // Publicação normal
        await api.createGame({
          authorId: user.userId,
          authorName: user.username,
          title,
          description,
          stage,
          tags: selectedTags,
          gameUrl,
          bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
          isNsfw,
          hasAiContent,
        });
        updateBalance(-cost);
        setSuccess('Jogo publicado com sucesso e postado no Fórum Discord!');
      }
      setTimeout(() => {
        navigate('/my-games');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Erro ao publicar jogo.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div className="badge badge-purple">Nova Publicação</div>
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Publicar Novo Jogo no Fórum</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Cadastre seu projeto para receber feedbacks de playtesters qualificados da comunidade.
        </p>

        {/* Cost Warning Box */}
        <div style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-sm)',
          background: hasEnoughCoins ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${hasEnoughCoins ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Coins color={hasEnoughCoins ? 'var(--success)' : 'var(--danger)'} size={24} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                Custo de Publicação: {cost} Moedas de Teste
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Fórmula: C = min({totalGames}/2 jogos ativos, 5). Seu saldo atual: <strong>{user?.balance || 0} moedas</strong>.
              </div>
            </div>
          </div>
          {!hasEnoughCoins && (
            <button className="btn-secondary" onClick={() => navigate('/reviews')} style={{ fontSize: '0.85rem' }}>
              Ganhar Moedas →
            </button>
          )}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', color: '#6ee7b7', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
              Título do Jogo *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Cyber Runner 2099"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                Estágio de Desenvolvimento *
              </label>
              <select className="select-field" value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="Protótipo">Protótipo</option>
                <option value="Alpha">Alpha</option>
                <option value="Beta">Beta</option>
                <option value="Lançado">Lançado / Demo</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
                Tags do Jogo (máximo 5)
              </label>
              <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
              Link de Acesso ao Jogo (Itch.io, Steam, Web, etc.) *
            </label>
            <input
              type="url"
              className="input-field"
              placeholder="https://sua-empresa.itch.io/meu-jogo"
              value={gameUrl}
              onChange={(e) => setGameUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
              Sinopse / Descrição Completa *
            </label>
            <textarea
              className="textarea-field"
              placeholder="Descreva o enredo, mecânicas principais e o que você gostaria que os playtesters prestassem atenção..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Banner Upload */}
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>
              Banner de Capa (S3 Upload Direct via Pre-signed URL)
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileUpload}
                id="banner-file"
                style={{ display: 'none' }}
              />
              <label htmlFor="banner-file" className="btn-secondary" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                <span>{uploading ? 'Enviando ao S3...' : 'Selecionar Imagem (Max 5MB)'}</span>
              </label>
              {bannerUrl && (
                <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
                  ✓ Banner pronto
                </span>
              )}
            </div>
            {bannerUrl && (
              <img
                src={bannerUrl}
                alt="Banner Preview"
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: '12px', border: '1px solid var(--border-glass)' }}
              />
            )}
          </div>

          {/* Toggles NSFW & AI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isNsfw}
                onChange={(e) => setIsNsfw(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Conteúdo NSFW (+18)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contém violência explícita ou temas adultos</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hasAiContent}
                onChange={(e) => setHasAiContent(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Uso de Inteligência Artificial</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Utiliza artes, vozes ou scripts gerados por IA</div>
              </div>
            </label>
          </div>

          {/* Admin Section: Publicar em nome de outro usuário */}
          {isAdmin && (
            <div style={{
              padding: '20px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldAlert size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>Publicar em Nome de Outro Usuário</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {adminTargetUser
                      ? `✓ Publicando como: ${adminTargetUser.username} — gratuito, sem custo de moedas`
                      : 'Deixe em branco para publicar como você mesmo normalmente.'}
                  </div>
                </div>
                {adminTargetUser && (
                  <button
                    type="button"
                    onClick={() => { setAdminTargetUser(null); setAdminTargetResults([]); setAdminSearched(false); setAdminTargetQuery(''); }}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                  >
                    <X size={14} /> Remover seleção
                  </button>
                )}
              </div>

              {!adminTargetUser && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Buscar usuário por nome ou ID..."
                    value={adminTargetQuery}
                    onChange={(e) => setAdminTargetQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdminSearchUsers(); } }}
                    className="input-field"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn-secondary" disabled={adminSearching} onClick={handleAdminSearchUsers}>
                    <Search size={16} />
                    {adminSearching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              )}

              {!adminTargetUser && adminSearched && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {adminTargetResults.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Nenhum usuário encontrado.</p>
                  )}
                  {adminTargetResults.map(u => (
                    <div key={u.userId} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <img src={u.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{u.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {u.userId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAdminTargetUser(u)}
                        className="btn-secondary"
                        style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                      >
                        <UserCheck size={14} /> Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {adminTargetUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 'var(--radius-sm)' }}>
                  <img src={adminTargetUser.avatarUrl} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{adminTargetUser.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Usuário selecionado — publicação gratuita</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={publishing || (!isAdmin && !hasEnoughCoins) || (isAdmin && !adminTargetUser && !hasEnoughCoins)}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', marginTop: '10px' }}
          >
            <PlusCircle size={20} />
            <span>
              {publishing
                ? 'Publicando no Fórum Discord...'
                : isAdmin && adminTargetUser
                  ? `Publicar como ${adminTargetUser.username}`
                  : `Publicar Jogo (${cost} Moedas)`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
