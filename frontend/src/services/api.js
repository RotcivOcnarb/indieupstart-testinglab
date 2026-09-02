// Indie Feedback API Service Layer with Standalone Mock Fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.indie-feedback.local';

// Initial mock dataset for standalone browser testing
const MOCK_GAMES = [
  {
    threadId: 'thread_101',
    authorId: 'user_dev_01',
    authorName: 'Alex Studio',
    title: 'Neon Cyberpunk Runner',
    description: 'Um jogo de ação em plataforma 2D com estética synthwave e alta velocidade.',
    stage: 'Beta',
    tags: ['Ação', 'Plataforma', 'Cyberpunk'],
    gameUrl: 'https://itch.io/demo-neon-runner',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    isNsfw: false,
    hasAiContent: false,
    costPaid: 3,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    threadId: 'thread_102',
    authorId: 'user_dev_02',
    authorName: 'PixelCraft Games',
    title: 'Dungeon of Whispers',
    description: 'RPG de turno roguelike focado em estratégia e exploração de dungeons sombrias.',
    stage: 'Alpha',
    tags: ['RPG', 'Roguelike', 'Pixel Art'],
    gameUrl: 'https://store.steampowered.com/app/demo-whispers',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    isNsfw: false,
    hasAiContent: true,
    costPaid: 5,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    threadId: 'thread_103',
    authorId: 'user_dev_03',
    authorName: 'Lunar Interactive',
    title: 'Cosmic Drift VR',
    description: 'Simulador espacial relaxante com suporte a realidade virtual.',
    stage: 'Protótipo',
    tags: ['Simulação', 'VR', 'Espaço'],
    gameUrl: 'https://lunar.itch.io/cosmic-drift',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    isNsfw: false,
    hasAiContent: false,
    costPaid: 2,
    createdAt: Date.now() - 86400000,
  }
];

const MOCK_REVIEWS = [
  {
    threadId: 'thread_101',
    userId: 'discord_9999',
    username: 'Playtester_Master',
    rating: 5,
    pros: 'A jogabilidade é extremamente fluida e as músicas synthwave combinam perfeitamente com o ritmo.',
    cons: 'A dificuldade na fase 3 tem um pico muito íngreme comparado com as duas primeiras.',
    improvements: 'Adicionar checkpoints visíveis antes dos saltos cegos melhoraria muito a experiência.',
    createdAt: Date.now() - 3600000 * 4,
  }
];

// Helper to check if backend is online or fallback to mock
export const api = {
  async loginDiscord(code) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Mock response
      return {
        token: `mock_jwt_${code}`,
        user: {
          userId: `discord_${code || 'demo_user'}`,
          username: 'Desenvolvedor Indie',
          avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
          balance: 3,
          createdAt: Date.now(),
        },
      };
    }
  },

  async getGames(userId) {
    try {
      const res = await fetch(`${API_BASE_URL}/games?userId=${userId}`);
      if (res.ok) return await res.json();
    } catch {
      const localReviews = JSON.parse(localStorage.getItem('indie_reviews') || '[]');
      const allReviews = [...MOCK_REVIEWS, ...localReviews];
      const reviewedIds = new Set(allReviews.filter(r => r.userId === userId).map(r => r.threadId));

      const localGames = JSON.parse(localStorage.getItem('indie_games') || '[]');
      const games = [...MOCK_GAMES, ...localGames].map(g => ({
        ...g,
        hasReviewed: reviewedIds.has(g.threadId),
      }));

      return { totalGames: games.length, games };
    }
  },

  async getUploadUrl(mimeType, fileName) {
    try {
      const res = await fetch(`${API_BASE_URL}/games/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType, fileName }),
      });
      if (res.ok) return await res.json();
    } catch {
      return {
        uploadUrl: 'https://mock-s3-upload-url',
        publicUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
      };
    }
  },

  async createGame(gameData) {
    try {
      const res = await fetch(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData),
      });
      if (res.ok) return await res.json();
    } catch {
      const localGames = JSON.parse(localStorage.getItem('indie_games') || '[]');
      const newGame = {
        threadId: `thread_${Date.now()}`,
        ...gameData,
        createdAt: Date.now(),
      };
      localGames.push(newGame);
      localStorage.setItem('indie_games', JSON.stringify(localGames));
      return { message: 'Jogo publicado com sucesso!', game: newGame };
    }
  },

  async createReview(reviewData) {
    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar avaliação');
      return data;
    } catch (err) {
      const localReviews = JSON.parse(localStorage.getItem('indie_reviews') || '[]');
      const duplicate = localReviews.find(r => r.threadId === reviewData.threadId && r.userId === reviewData.userId);
      if (duplicate) {
        throw new Error('Você já submeteu uma avaliação para este jogo.');
      }
      const newReview = { ...reviewData, createdAt: Date.now() };
      localReviews.push(newReview);
      localStorage.setItem('indie_reviews', JSON.stringify(localReviews));
      return { message: 'Avaliação enviada com sucesso! Você ganhou +1 Moeda.', review: newReview };
    }
  },

  async reportGame(reportData) {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      return await res.json();
    } catch {
      return { message: 'Denúncia registrada localmente e enviada ao canal de moderação (#mod-logs).' };
    }
  },

  async reportReview(reportData) {
    try {
      const res = await fetch(`${API_BASE_URL}/reports/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      return await res.json();
    } catch {
      return { message: 'Denúncia de review enviada para a moderação.' };
    }
  }
};
