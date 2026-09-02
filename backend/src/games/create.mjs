import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'IndieFeedback-Users';
const GAMES_TABLE = process.env.GAMES_TABLE || 'IndieFeedback-Games';

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const {
      authorId,
      title,
      description,
      stage,
      tags = [],
      gameUrl,
      bannerUrl,
      isNsfw = false,
      hasAiContent = false,
    } = body;

    if (!authorId || !title || !description || !gameUrl || !stage) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Campos obrigatórios ausentes: authorId, title, description, stage, gameUrl' }),
      };
    }

    // 1. Fetch current user balance
    const userRes = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: authorId },
    }));

    const user = userRes.Item;
    if (!user) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Usuário não encontrado' }),
      };
    }

    // 2. Compute dynamic cost C = min(N, 10)
    const gamesScan = await docClient.send(new ScanCommand({ TableName: GAMES_TABLE }));
    const N = gamesScan.Count || 0;
    const cost = Math.min(N, 10);

    if (user.balance < cost) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Saldo insuficiente',
          required: cost,
          currentBalance: user.balance,
        }),
      };
    }

    // 3. Deduct balance from user
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: authorId },
      UpdateExpression: 'SET balance = balance - :cost',
      ExpressionAttributeValues: { ':cost': cost },
    }));

    // 4. Generate Discord Thread ID (or call Discord REST API to create forum thread)
    const threadId = `thread_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // 5. Save Game record to DynamoDB
    const newGame = {
      threadId,
      authorId,
      authorName: user.username,
      title,
      description,
      stage,
      tags,
      gameUrl,
      bannerUrl: bannerUrl || '',
      isNsfw: Boolean(isNsfw),
      hasAiContent: Boolean(hasAiContent),
      costPaid: cost,
      createdAt: Date.now(),
    };

    await docClient.send(new PutCommand({
      TableName: GAMES_TABLE,
      Item: newGame,
    }));

    // 6. Optional Discord Forum POST via Discord REST API v10
    // POST /channels/{channel.id}/threads

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Jogo publicado com sucesso!',
        game: newGame,
        remainingBalance: user.balance - cost,
      }),
    };
  } catch (error) {
    console.error('Error in CreateGameHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
