import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'IndieFeedback-Users';

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { code } = body;

    if (!code) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'OAuth2 code is required' }),
      };
    }

    // In a production environment, exchange `code` with Discord API OAuth token:
    // POST https://discord.com/api/v10/oauth2/token
    // GET https://discord.com/api/v10/users/@me

    // Simulation / integration logic for user record:
    const mockDiscordUser = {
      id: code.length > 10 ? code.slice(0, 18) : `discord_${Date.now()}`,
      username: `DevIndie_${Math.floor(Math.random() * 1000)}`,
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
    };

    const userId = mockDiscordUser.id;
    const existing = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    }));

    let userData = existing.Item;
    if (!userData) {
      userData = {
        userId,
        username: mockDiscordUser.username,
        avatarUrl: mockDiscordUser.avatar,
        balance: 2, // Initial welcoming balance for playtesting
        createdAt: Date.now(),
      };
      await docClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: userData,
      }));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        token: `mock_jwt_token_${userId}`,
        user: userData,
      }),
    };
  } catch (error) {
    console.error('Error in AuthDiscordHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
