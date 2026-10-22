import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShieldAlert, Coins, Trash2, Send } from 'lucide-react';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');

  // Users State
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [coinAmount, setCoinAmount] = useState('');

  // Games State
  const [games, setGames] = useState([]);

  // Announcements State
  const [announcementTitle, setAnnouncementTitle] = useState('Anúncio Oficial');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [mentionEveryone, setMentionEveryone] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'games') {
      loadGames();
    }
  }, [activeTab]);

  const loadGames = async () => {
    try {
      const data = await api.getGames(user.userId);
      setGames(data.games || []);
    } catch (err) {
      alert('Erro ao carregar jogos: ' + err.message);
    }
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    try {
      const data = await api.adminGetUsers(user.userId, userQuery);
      setUsers(data);
      setHasSearched(true);
    } catch (err) {
      alert('Erro ao buscar usuários: ' + err.message);
    }
  };

  const handleUpdateCoins = async (e) => {
    e.preventDefault();
    if (!selectedUser || !coinAmount) return;
    try {
      const amount = parseInt(coinAmount, 10);
      const res = await api.adminUpdateCoins(user.userId, selectedUser.userId, amount);
      alert(`Moedas atualizadas! Novo saldo: ${res.balance}`);
      setUsers(users.map(u => u.userId === selectedUser.userId ? { ...u, balance: res.balance } : u));
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };


  const handleDeleteGame = async (threadId) => {
    if (!window.confirm('Tem certeza que deseja apagar este jogo e todas as suas reviews?')) return;
    try {
      await api.adminDeleteGame(user.userId, threadId);
      alert('Jogo apagado!');
      loadGames();
    } catch (err) {
      alert('Erro ao apagar jogo: ' + err.message);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementContent) return;
    try {
      await api.adminPostAnnouncement(user.userId, announcementContent, announcementTitle, mentionEveryone);
      alert('Anúncio enviado com sucesso para o Discord!');
      setAnnouncementContent('');
    } catch (err) {
      alert('Erro ao enviar anúncio: ' + err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldAlert size={32} color="var(--danger)" />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800' }}>Painel Administrativo</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie usuários, modere jogos e envie anúncios no Discord.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* TABS */}
        <div style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(0,0,0,0.2)' 
        }}>
          {['users', 'games', 'announcements'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '16px',
                background: activeTab === tab ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontSize: '0.85rem',
                transition: 'all 0.2s ease'
              }}
            >
              {tab === 'users' && 'Usuários & Moedas'}
              {tab === 'games' && 'Jogos & Moderação'}
              {tab === 'announcements' && 'Discord @everyone'}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <form onSubmit={handleSearchUsers} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Pesquisar usuário por nome exato ou ID..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="input-field"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary">Buscar</button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {hasSearched && users.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum usuário encontrado.
                  </div>
                )}
                {users.map(u => (
                  <div key={u.userId} className="glass-panel" style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    border: selectedUser?.userId === u.userId ? '1px solid var(--primary)' : '1px solid var(--border-glass)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src={u.avatarUrl} alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{u.username}</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>ID: {u.userId}</p>
                        <div style={{ marginTop: '4px', display: 'flex', gap: '8px' }}>
                           <span className="badge badge-warning">{u.balance} Moedas</span>
                           {u.role === 'admin' && <span className="badge badge-danger">ADMIN</span>}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedUser(u)} 
                      className="btn-secondary"
                      style={{ background: selectedUser?.userId === u.userId ? 'rgba(139, 92, 246, 0.2)' : '' }}
                    >
                      {selectedUser?.userId === u.userId ? 'Selecionado' : 'Selecionar'}
                    </button>
                  </div>
                ))}
              </div>

              {selectedUser && (
                <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--coin-gold)' }}>
                  <h3 style={{ margin: '0 0 16px 0' }}>Gerenciar Saldo: {selectedUser.username}</h3>
                  <form onSubmit={handleUpdateCoins} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Adicionar ou Remover (Ex: 5 ou -3)
                      </label>
                      <input
                        type="number"
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <button type="submit" className="btn-coin" style={{ height: '45px' }}>
                      <Coins size={18} />
                      Aplicar Moedas
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

          {/* TAB: GAMES */}
          {activeTab === 'games' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              <div>
                <h3 style={{ margin: '0 0 16px 0', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Trash2 size={20} />
                  Moderação: Apagar Jogos
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {games.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum jogo postado no momento.</p>}
                  {games.map(g => (
                    <div key={g.threadId} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{g.title} <span className="badge badge-purple" style={{ marginLeft: '8px' }}>{g.stage}</span></h4>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Autor: {g.authorName} | ID: {g.threadId}</p>
                      </div>
                      <button onClick={() => handleDeleteGame(g.threadId)} className="btn-danger">
                        <Trash2 size={16} /> Apagar
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ padding: '16px', background: '#5865F2', borderRadius: '50%' }}>
                    <Send size={24} color="white" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>Anúncio Global no Discord</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Posta um Embed estilizado no canal de Anúncios do Discord.</p>
                  </div>
                </div>

                <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Título do Anúncio</label>
                    <input
                      type="text"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mensagem (Suporta formatação do Discord)</label>
                    <textarea
                      value={announcementContent}
                      onChange={(e) => setAnnouncementContent(e.target.value)}
                      className="textarea-field"
                      style={{ minHeight: '200px' }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: mentionEveryone ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
                      border: mentionEveryone ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border-glass)',
                      transition: 'all 0.2s ease',
                    }}>
                      <div
                        onClick={() => setMentionEveryone(!mentionEveryone)}
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '12px',
                          background: mentionEveryone ? 'var(--danger)' : 'rgba(255,255,255,0.15)',
                          position: 'relative',
                          transition: 'background 0.2s ease',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'white',
                          position: 'absolute',
                          top: '3px',
                          left: mentionEveryone ? '23px' : '3px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: mentionEveryone ? 'var(--danger)' : 'var(--text-main)' }}>
                          {mentionEveryone ? '🔔 @everyone ativado' : '🔕 Sem @everyone'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {mentionEveryone ? 'Todos os membros serão notificados' : 'Apenas quem vir o canal será notificado'}
                        </div>
                      </div>
                    </label>

                    <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
                      <Send size={18} />
                      Enviar Notificação
                    </button>
                  </div>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Admin;
