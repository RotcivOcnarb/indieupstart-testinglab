import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = getTableName(process.env.GAMES_TABLE, 'IndieFeedback-Games');
const WEEKLY_GAME_TABLE = getTableName(process.env.WEEKLY_GAME_TABLE, 'IndieFeedback-WeeklyGame');
const REVIEWS_TABLE = getTableName(process.env.REVIEWS_TABLE, 'IndieFeedback-Reviews');

/**
 * Seleciona um jogo aleatório seguindo as regras:
 * 1. Pega todos os jogos cadastrados
 * 2. Remove o jogo mais recente da tabela WeeklyGame (para nunca repetir 2 vezes seguidas)
 * 3. Monta um dicionário de threadId -> quantidade de vezes selecionado
 * 4. Mantém só os jogos com o menor número de seleções
 * 5. Escolhe um aleatório desse grupo
 */
export const handler = async (event) => {
  console.log('Iniciando seleção do Jogo da Semana...', JSON.stringify(event));

  try {
    // 1. Busca todos os jogos cadastrados
    const gamesOutput = await docClient.send(new ScanCommand({ TableName: GAMES_TABLE }));
    const allGames = gamesOutput.Items || [];

    if (allGames.length === 0) {
      console.log('Nenhum jogo cadastrado. Abortando seleção.');
      return { statusCode: 200, body: JSON.stringify({ message: 'Nenhum jogo disponível.' }) };
    }

    // 2. Busca o jogo mais recentemente selecionado da tabela WeeklyGame
    const weeklyOutput = await docClient.send(new ScanCommand({ TableName: WEEKLY_GAME_TABLE }));
    const weeklyHistory = (weeklyOutput.Items || []).sort((a, b) => b.selectedAt - a.selectedAt);
    const lastWeekGame = weeklyHistory.length > 0 ? weeklyHistory[0] : null;

    // Cria lista de candidatos (exclui o último jogo selecionado para não repetir 2x seguidas)
    let candidates = allGames.filter(g => g.threadId !== lastWeekGame?.threadId);

    // Se todos os jogos foram filtrados (só existe 1 jogo), não há como evitar repetição
    if (candidates.length === 0) {
      candidates = allGames;
    }

    // 3. Monta dicionário threadId -> contagem de vezes que foi jogo da semana
    const selectionCount = {};
    for (const game of candidates) {
      selectionCount[game.threadId] = 0;
    }

    // 4. Conta as ocorrências históricas para cada candidato
    let minCount = Infinity;
    for (const entry of weeklyHistory) {
      if (selectionCount.hasOwnProperty(entry.threadId)) {
        selectionCount[entry.threadId]++;
      }
    }

    // Descobre o menor número de seleções dentre os candidatos
    for (const threadId of Object.keys(selectionCount)) {
      if (selectionCount[threadId] < minCount) {
        minCount = selectionCount[threadId];
      }
    }
    if (minCount === Infinity) minCount = 0;

    // 5. Remove do dicionário os jogos com mais seleções do que o mínimo
    const eligibleIds = Object.keys(selectionCount).filter(id => selectionCount[id] <= minCount);

    let chosenGame = null;
    if (eligibleIds.length > 0) {
      const randomId = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
      chosenGame = allGames.find(g => g.threadId === randomId);
    }

    // Fallback: escolhe qualquer jogo aleatório dos cadastrados
    if (!chosenGame) {
      chosenGame = allGames[Math.floor(Math.random() * allGames.length)];
    }

    // Calcula timestamps para a semana atual
    const now = Date.now();
    // Próxima segunda-feira às 17h UTC (14h BRT)
    const nextMonday = getNextMondayUTC14h(now);

    const weeklyEntry = {
      weekId: getWeekId(now),         // ex: "2026-W40"
      threadId: chosenGame.threadId,
      gameTitle: chosenGame.title,
      gameDescription: chosenGame.description,
      gameBannerUrl: chosenGame.bannerUrl || '',
      authorName: chosenGame.authorName || 'Desenvolvedor',
      authorId: chosenGame.authorId,
      selectedAt: now,
      expiresAt: nextMonday,          // Unix ms da próxima segunda
    };

    // Salva na tabela WeeklyGame
    await docClient.send(new PutCommand({
      TableName: WEEKLY_GAME_TABLE,
      Item: weeklyEntry,
    }));

    console.log(`Jogo da Semana selecionado: "${chosenGame.title}" (threadId: ${chosenGame.threadId})`);

    // Posta no canal de anúncios do Discord
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const announcementsChannelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;
    const siteBaseUrl = process.env.SITE_BASE_URL || '';

    if (botToken && announcementsChannelId) {
      try {
        // Conta quantos reviews o jogo já tem
        const reviewsOutput = await docClient.send(new ScanCommand({
          TableName: REVIEWS_TABLE,
          FilterExpression: 'threadId = :tid',
          ExpressionAttributeValues: { ':tid': chosenGame.threadId },
        }));
        const reviewCount = reviewsOutput.Count || 0;

        const reviewUrl = siteBaseUrl ? `${siteBaseUrl}/review/${chosenGame.threadId}` : null;

        const embedFields = [
          { name: '🎮 Jogo', value: chosenGame.title, inline: true },
          { name: '👤 Criador', value: chosenGame.authorName || 'Desenvolvedor', inline: true },
          { name: '📋 Sinopse', value: chosenGame.description?.slice(0, 300) || 'Sem descrição.', inline: false },
          { name: '🪙 Bônus desta Semana', value: '**Dobro de Moedas de Teste** por review neste jogo!', inline: false },
          { name: '📊 Reviews até agora', value: String(reviewCount), inline: true },
        ];

        const components = [];
        if (reviewUrl) {
          components.push({
            type: 1,
            components: [{
              type: 2,
              style: 5,
              label: '⭐ Avaliar e Ganhar 2x Moedas',
              url: reviewUrl,
            }],
          });
        }

        const payload = {
          content: '@everyone 🎉 **O Jogo da Semana foi selecionado!** Reviews neste jogo valem o **dobro de moedas** até a próxima segunda-feira!',
          embeds: [{
            title: `🏆 Jogo da Semana: ${chosenGame.title}`,
            color: 0xF59E0B, // Dourado
            fields: embedFields,
            footer: { text: 'Indie Feedback • Jogo da Semana' },
            timestamp: new Date().toISOString(),
          }],
          ...(components.length > 0 ? { components } : {}),
        };

        // Adiciona imagem do banner se existir
        if (chosenGame.bannerUrl) {
          payload.embeds[0].image = { url: chosenGame.bannerUrl };
        }

        const discordRes = await fetch(`https://discord.com/api/v10/channels/${announcementsChannelId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!discordRes.ok) {
          const err = await discordRes.json();
          console.error('Erro ao postar no Discord:', err);
        } else {
          console.log('Anúncio postado no Discord com sucesso!');
        }
      } catch (dErr) {
        console.error('Erro ao postar no Discord:', dErr);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Jogo da Semana selecionado com sucesso!', game: weeklyEntry }),
    };
  } catch (error) {
    console.error('Erro na seleção do Jogo da Semana:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno', message: error.message }),
    };
  }
};

/**
 * Retorna o identificador da semana no formato "YYYY-WNN"
 */
function getWeekId(timestampMs) {
  const date = new Date(timestampMs);
  const year = date.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((date - startOfYear) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + startOfYear.getUTCDay()) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Calcula o timestamp da próxima segunda-feira às 17h UTC (14h BRT / UTC-3)
 */
function getNextMondayUTC14h(timestampMs) {
  const date = new Date(timestampMs);
  // Avança para a próxima segunda-feira
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysUntilNextMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + daysUntilNextMonday,
    17, 0, 0, 0 // 17h UTC = 14h BRT
  ));
  return nextMonday.getTime();
}
