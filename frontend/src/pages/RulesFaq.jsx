import React from 'react';
import { ShieldCheck, Flame, Coins, FileText, ExternalLink, AlertTriangle } from 'lucide-react';

export const RulesFaq = () => {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '32px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)' }}>
        <div className="badge badge-purple" style={{ marginBottom: '8px' }}>Diretrizes Oficiais</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Regras & Perguntas Frequentes (FAQ)</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Entenda como funciona a economia colaborativa de Moedas de Teste, o cálculo de custos e as políticas de moderação.
        </p>
      </div>

      {/* Dynamic Cost Formula Explanation */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--coin-gold)' }}>
          <Flame size={24} />
          <h2 style={{ fontSize: '1.4rem' }}>Fórmula Dinâmica do Custo de Publicação</h2>
        </div>
        <p style={{ color: 'var(--text-main)', marginBottom: '16px', lineHeight: '1.6' }}>
          O custo C em Moedas de Teste para publicar um novo jogo no servidor é ajustado dinamicamente com base na quantidade N de jogos ativos cadastrados no sistema:
        </p>
        <div style={{
          background: 'rgba(15, 20, 35, 0.9)',
          padding: '20px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-glow)',
          textAlign: 'center',
          fontSize: '1.4rem',
          fontWeight: '700',
          color: 'var(--primary)',
          marginBottom: '16px',
          fontFamily: 'monospace'
        }}>
          C = min(5, &lfloor;N / 2&rfloor;)
        </div>
        <ul style={{ color: 'var(--text-muted)', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li><strong>Se N = 0 ou 1:</strong> Custo é 0 moedas (Incentivo inicial, &lfloor;N/2&rfloor; = 0).</li>
          <li><strong>Se N = 4 ou 5:</strong> Custo é 2 moedas (Exige que o dev avalie 2 jogos de outros membros).</li>
          <li><strong>Se N &ge; 10:</strong> Custo é fixado no teto máximo de 5 moedas.</li>
        </ul>
      </div>

      {/* Review Quality Guide */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--success)' }}>
          <ShieldCheck size={24} />
          <h2 style={{ fontSize: '1.4rem' }}>Guia de Qualidade para Reviews</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
          Para manter o ecossistema justo, todas as avaliações devem ser construtivas. O sistema exige no mínimo <strong>20 caracteres</strong> por campo obrigatório:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ color: 'var(--success)', marginBottom: '6px' }}>1. Prós</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Elogie o que funcionou bem: game design, arte, música, ritmo ou inovação.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ color: 'var(--danger)', marginBottom: '6px' }}>2. Contras</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reporte bugs, picos de dificuldade, problemas de UI ou glitches visuais.</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ color: 'var(--secondary)', marginBottom: '6px' }}>3. Melhorias</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dê sugestões acionáveis para o criador implementar no próximo patch.</p>
          </div>
        </div>
      </div>

      {/* External Link Disclaimer */}
      <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--warning)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: 'var(--warning)' }}>
          <AlertTriangle size={24} />
          <h2 style={{ fontSize: '1.3rem' }}>Aviso Legal (Disclaimer sobre Links Externos)</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          A plataforma Indie UpStart redireciona para links externos mantidos por terceiros (Itch.io, Steam, Google Drive, Mega). Recomendamos sempre verificar a reputação dos arquivos antes de executar binários (.exe) em sua máquina. Qualquer suspeita de malware deve ser notificada imediatamente através da opção <strong>Denunciar Jogo</strong>.
        </p>
      </div>
    </div>
  );
};
