import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.GAMES_TABLE || 'IndieFeedback-Games';
const REVIEWS_TABLE = process.env.REVIEWS_TABLE || 'IndieFeedback-Reviews';

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId || event.headers?.['x-user-id'];

    // Fetch all active games
    const gamesOutput = await docClient.send(new ScanCommand({
      TableName: GAMES_TABLE,
    }));

    let games = gamesOutput.Items || [];

    // If userId provided, filter out games already reviewed by user if requested or add status
    if (userId) {
      const userReviewsOutput = await docClient.send(new ScanCommand({
        TableName: REVIEWS_TABLE,
        FilterExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
      }));

      const reviewedThreadIds = new Set((userReviewsOutput.Items || []).map(r => r.threadId));
      games = games.map(g => ({
        ...g,
        hasReviewed: reviewedThreadIds.has(g.threadId),
      }));
    }

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
