import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = getTableName(process.env.USERS_TABLE, 'IndieFeedback-Users');
const REVIEWS_TABLE = getTableName(process.env.REVIEWS_TABLE, 'IndieFeedback-Reviews');
const WEEKLY_GAME_TABLE = getTableName(process.env.WEEKLY_GAME_TABLE, 'IndieFeedback-WeeklyGame');

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const {
      threadId,
      userId,
      username,
      rating,
      pros,
      cons,
      improvements,
    } = body;

    if (!threadId || !userId || !pros || !cons || !improvements) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
      };
    }

    // Validação mínima de caracteres
    if (pros.length < 20 || cons.length < 20 || improvements.length < 20) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'A avaliação deve conter no mínimo 20 caracteres nos campos de prós, contras e melhorias.' }),
      };
    }

    const reviewItem = {
      threadId,
      userId,
      username: username || 'Playtester',
      rating: Number(rating) || 5,
      pros,
      cons,
      improvements,
      createdAt: Date.now(),
    };

    // Put condicional para evitar avaliações duplicadas pelo mesmo usuário (threadId, userId)
    try {
      await docClient.send(new PutCommand({
        TableName: REVIEWS_TABLE,
        Item: reviewItem,
        ConditionExpression: 'attribute_not_exists(threadId) AND attribute_not_exists(userId)',
      }));
    } catch (dbErr) {
      if (dbErr.name === 'ConditionalCheckFailedException') {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Você já submeteu uma avaliação para este jogo.' }),
        };
      }
      throw dbErr;
    }

    // Verifica se o jogo avaliado é o Jogo da Semana (para dar dobro de moedas)
    let coinsEarned = 1;
    let isWeeklyGame = false;
    try {
      const weeklyOutput = await docClient.send(new ScanCommand({ TableName: WEEKLY_GAME_TABLE }));
      const weeklyItems = weeklyOutput.Items || [];
      if (weeklyItems.length > 0) {
        const currentWeekly = weeklyItems.sort((a, b) => b.selectedAt - a.selectedAt)[0];
        const now = Date.now();
        // Verifica se é o jogo da semana e ainda está dentro do período de validade
        if (
          currentWeekly.threadId === threadId &&
          now >= currentWeekly.selectedAt &&
          now < currentWeekly.expiresAt
        ) {
          coinsEarned = 2;
          isWeeklyGame = true;
        }
      }
    } catch (weeklyErr) {
      console.warn('Aviso: Não foi possível verificar o Jogo da Semana. Creditando 1 moeda.', weeklyErr);
    }

    // Credita moedas ao avaliador (1 normal, 2 se for Jogo da Semana)
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'ADD balance :inc',
      ExpressionAttributeValues: { ':inc': coinsEarned },
    }));

    // Envia mensagem formatada com o feedback diretamente para o tópico no Fórum Discord se for uma thread real
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (botToken && /^\d+$/.test(threadId)) {
      try {
        const stars = '⭐'.repeat(reviewItem.rating);
        const isUserMentionable = /^\d+$/.test(userId);
        const reviewerDisplay = isUserMentionable ? `<@${userId}>` : reviewItem.username;

        await fetch(`https://discord.com/api/v10/channels/${threadId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            embeds: [{
              title: `📝 Nova Avaliação de Playtest! (${stars})`,
              color: 3066993, // Verde (#2ecc71)
              fields: [
                { name: 'Avaliador', value: reviewerDisplay, inline: true },
                { name: 'Nota', value: `${reviewItem.rating}/5 estrelas`, inline: true },
                { name: '✅ Pontos Positivos', value: reviewItem.pros, inline: false },
                { name: '❌ Pontos Negativos', value: reviewItem.cons, inline: false },
                { name: '💡 Sugestões de Melhoria', value: reviewItem.improvements, inline: false },
              ],
              footer: { text: 'Indie Feedback • Feedback enviado via site' },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      } catch (dErr) {
        console.error('Erro ao postar mensagem de avaliação no Discord:', dErr);
      }
    }

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: isWeeklyGame
          ? `Avaliação enviada com sucesso! É o Jogo da Semana — você ganhou +${coinsEarned} Moedas de Teste! 🎉`
          : `Avaliação enviada com sucesso! Você ganhou +${coinsEarned} Moeda de Teste.`,
        review: reviewItem,
        coinsEarned,
        isWeeklyGame,
      }),
    };
  } catch (error) {
    console.error('Error in CreateReviewHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
