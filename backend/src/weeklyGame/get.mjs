import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const WEEKLY_GAME_TABLE = getTableName(process.env.WEEKLY_GAME_TABLE, 'IndieFeedback-WeeklyGame');
const REVIEWS_TABLE = getTableName(process.env.REVIEWS_TABLE, 'IndieFeedback-Reviews');

/**
 * GET /weekly-game
 * Retorna o jogo da semana atual (o mais recente da tabela WeeklyGame),
 * junto com a contagem de reviews que ele já recebeu.
 */
export const handler = async (event) => {
  try {
    // Busca todos os registros e retorna o mais recente (o da semana atual)
    const output = await docClient.send(new ScanCommand({ TableName: WEEKLY_GAME_TABLE }));
    const items = output.Items || [];

    if (items.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ weeklyGame: null }),
      };
    }

    // Ordena por selectedAt descendente para pegar o mais recente
    const current = items.sort((a, b) => b.selectedAt - a.selectedAt)[0];

    // Conta quantas reviews o jogo da semana já tem
    const reviewsOutput = await docClient.send(new ScanCommand({
      TableName: REVIEWS_TABLE,
      FilterExpression: 'threadId = :tid',
      ExpressionAttributeValues: { ':tid': current.threadId },
    }));
    const reviewCount = reviewsOutput.Count || 0;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        weeklyGame: {
          ...current,
          reviewCount,
        },
      }),
    };
  } catch (error) {
    console.error('Error in GetWeeklyGameHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
