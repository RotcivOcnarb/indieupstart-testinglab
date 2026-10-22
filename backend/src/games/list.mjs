import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = getTableName(process.env.GAMES_TABLE, 'IndieFeedback-Games');
const REVIEWS_TABLE = getTableName(process.env.REVIEWS_TABLE, 'IndieFeedback-Reviews');

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId || event.headers?.['x-user-id'];

    // Busca todos os jogos ativos
    const gamesOutput = await docClient.send(new ScanCommand({
      TableName: GAMES_TABLE,
    }));

    let games = gamesOutput.Items || [];

    // Busca todas as reviews
    const allReviewsOutput = await docClient.send(new ScanCommand({
      TableName: REVIEWS_TABLE,
    }));

    const allReviews = allReviewsOutput.Items || [];

    // Agrupa reviews por threadId
    const reviewsByThread = {};
    for (const review of allReviews) {
      if (!reviewsByThread[review.threadId]) {
        reviewsByThread[review.threadId] = [];
      }
      reviewsByThread[review.threadId].push(review);
    }

    // Marca se o usuário já avaliou e inclui as reviews de cada jogo
    const reviewedThreadIds = userId
      ? new Set(allReviews.filter(r => r.userId === userId).map(r => r.threadId))
      : new Set();

    games = games.map(g => ({
      ...g,
      hasReviewed: reviewedThreadIds.has(g.threadId),
      reviews: reviewsByThread[g.threadId] || [],
      reviewCount: (reviewsByThread[g.threadId] || []).length,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        totalGames: games.length,
        games,
      }),
    };
  } catch (error) {
    console.error('Error in GetGamesHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
