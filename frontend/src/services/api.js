// Indie UpStart API Service Layer
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.indie-feedback.local';

export const api = {
  async loginDiscord(code, redirectUri, referalId) {
    const res = await fetch(`${API_BASE_URL}/auth/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirectUri: redirectUri || `${window.location.origin}/auth/callback`,
        referalId
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Falha na autenticação via Discord');
    }
    return data;
  },

  async getUserProfile(userId) {
    const res = await fetch(`${API_BASE_URL}/user/profile?userId=${userId}`);
    if (!res.ok) {
      throw new Error('Falha ao carregar perfil do usuário');
    }
    return await res.json();
  },

  async getGames(userId) {
    const res = await fetch(`${API_BASE_URL}/games?userId=${userId}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao carregar jogos');
    }
    return await res.json();
  },

  async getUploadUrl(mimeType, fileName) {
    const res = await fetch(`${API_BASE_URL}/games/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mimeType, fileName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao solicitar URL de upload do S3');
    return data;
  },

  async createGame(gameData) {
    const res = await fetch(`${API_BASE_URL}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao criar jogo');
    return data;
  },

  async createReview(reviewData) {
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar avaliação');
    return data;
  },

  async getReviewHistory(userId) {
    const res = await fetch(`${API_BASE_URL}/reviews/history?userId=${userId}`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao carregar histórico de avaliações');
    }
    return await res.json();
  },

  async reportGame(reportData) {
    const res = await fetch(`${API_BASE_URL}/reports/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao denunciar jogo');
    return data;
  },

  async reportReview(reportData) {
    const res = await fetch(`${API_BASE_URL}/reports/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao denunciar avaliação');
    return data;
  },

  // --- Admin API Methods ---
  async adminGetUsers(adminId, query = '') {
    const url = query
      ? `${API_BASE_URL}/admin/users?adminId=${adminId}&query=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/admin/users?adminId=${adminId}`;
    const res = await fetch(url, {
      headers: { 'x-user-id': adminId },
    });
    if (!res.ok) throw new Error('Falha ao buscar usuários');
    return await res.json();
  },

  async adminUpdateCoins(adminId, targetUserId, amount) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${targetUserId}/coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao atualizar moedas');
    return data;
  },

  async adminCreateGame(adminId, gameData) {
    const res = await fetch(`${API_BASE_URL}/admin/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify(gameData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao publicar jogo como admin');
    return data;
  },

  async adminDeleteGame(adminId, threadId) {
    const res = await fetch(`${API_BASE_URL}/admin/games/${threadId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': adminId },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao deletar jogo');
    return data;
  },

  async adminPostAnnouncement(adminId, content, title, mentionEveryone = false) {
    const res = await fetch(`${API_BASE_URL}/admin/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': adminId },
      body: JSON.stringify({ content, title, mentionEveryone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao enviar anúncio');
    return data;
  },

  async getWeeklyGame() {
    const res = await fetch(`${API_BASE_URL}/weekly-game`);
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Falha ao carregar Jogo da Semana');
    }
    return await res.json();
  }
};
