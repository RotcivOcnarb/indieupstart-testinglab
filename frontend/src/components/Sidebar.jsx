import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Gamepad2,
  FolderKanban,
  History,
  HelpCircle,
  Coins,
  ShieldAlert,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/Round 1-1.png"
            alt="Logo"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              objectFit: 'contain'
            }}
          />
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', background: 'linear-gradient(90deg, #fff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              INDIE UPSTART
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Laboratório de Testes
            </span>
          </div>
        </div>
      </div>

      {/* User Card */}
      {user && (
        <div style={{
          margin: '20px 0',
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img
            src={user.avatarUrl}
            alt={user.username}
            style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid var(--primary)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.username}
            </div>
            <div className="coin-counter" style={{ padding: '2px 8px', fontSize: '0.75rem', marginTop: '4px' }}>
              <Coins size={14} />
              <span>{user.balance} Moedas</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <NavLink
          to="/"
          end
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), transparent)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: isActive ? '700' : '500',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          })}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/publish"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), transparent)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: isActive ? '700' : '500',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          })}
        >
          <PlusCircle size={18} />
          <span>Publicar Jogo</span>
        </NavLink>

        <NavLink
          to="/reviews"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), transparent)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: isActive ? '700' : '500',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          })}
        >
          <Gamepad2 size={18} />
          <span>Submeter Review</span>
        </NavLink>

        <NavLink
          to="/my-games"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), transparent)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: isActive ? '700' : '500',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          })}
        >
          <FolderKanban size={18} />
          <span>Meus Jogos</span>
        </NavLink>

        <NavLink
          to="/history"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), transparent)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: isActive ? '700' : '500',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          })}
        >
          <History size={18} />
          <span>Meu Histórico</span>
        </NavLink>

        <NavLink
          to="/rules"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'linear-gradient(90deg, rgba(139, 92, 246, 0.25), transparent)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
            fontWeight: isActive ? '700' : '500',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          })}
        >
          <HelpCircle size={18} />
          <span>Regras & FAQ</span>
        </NavLink>

        {user && user.role === 'admin' && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              color: isActive ? '#fff' : 'var(--text-muted)',
              background: isActive ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.25), transparent)' : 'transparent',
              borderLeft: isActive ? '3px solid #ef4444' : '3px solid transparent',
              fontWeight: isActive ? '700' : '500',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              marginTop: 'auto'
            })}
          >
            <ShieldAlert size={18} color="#ef4444" />
            <span style={{ color: '#ef4444' }}>Admin Panel</span>
          </NavLink>
        )}
      </nav>

      {/* Footer / Logout */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
        <button
          onClick={logout}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', color: 'var(--danger)' }}
        >
          <LogOut size={16} />
          <span>Sair da Sessão</span>
        </button>
      </div>
    </aside>
  );
};
