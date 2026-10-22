import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = getTableName(process.env.USERS_TABLE, 'IndieFeedback-Users');

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { code, redirectUri, referalId } = body;

    if (!code) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Código de autorização OAuth2 do Discord ausente' }),
      };
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirect_uri = redirectUri || 'http://localhost:3000/auth/callback';

    let discordUser = null;

    // Se as credenciais do Discord estiverem no ambiente e não for um código de demo local
    if (clientId && clientSecret && !code.startsWith('demo_')) {
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      });

      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams,
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        console.error('Erro na resposta do Discord Token OAuth2:', tokenData);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Falha ao trocar código de autorização com o Discord',
            details: tokenData,
          }),
        };
      }

      // Busca dados reais do usuário autenticado no Discord (@me)
      const userRes = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        },
      });

      if (!userRes.ok) {
        const userErr = await userRes.json();
        console.error('Erro ao buscar dados do usuário Discord:', userErr);
        throw new Error('Não foi possível obter os dados de perfil do Discord');
      }

      const dUser = await userRes.json();
      const avatarUrl = dUser.avatar
        ? `https://cdn.discordapp.com/avatars/${dUser.id}/${dUser.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(dUser.id) >> 22n) % 5n}.png`;

      discordUser = {
        id: dUser.id,
        username: dUser.global_name || dUser.username,
        avatarUrl: avatarUrl,
      };
    } else {
      // Fallback para ambiente demo/dev local sem segredos
      discordUser = {
        id: code.length > 10 ? code.slice(0, 18) : `demo_${Date.now()}`,
        username: `DevTester_${Math.floor(Math.random() * 1000)}`,
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
      };
    }

    const userId = discordUser.id;

    // Busca se o usuário já existe na tabela de usuários do DynamoDB
    const existing = await docClient.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId },
    }));

    let userData = existing.Item;
    let referralStatus = null;
    let referredBy = null;

    if (!userData) {
      let initialBalance = 1;

      if (referalId) {
        // Verifica se o referalId é válido
        const refererReq = await docClient.send(new GetCommand({
          TableName: USERS_TABLE,
          Key: { userId: referalId },
        }));
        
        if (refererReq.Item) {
          initialBalance = 2; // +1 de bônus
          referredBy = refererReq.Item.username;
          referralStatus = 'SUCCESS';
          
          // Adiciona 1 moeda ao saldo do referer
          await docClient.send(new UpdateCommand({
            TableName: USERS_TABLE,
            Key: { userId: referalId },
            UpdateExpression: 'SET balance = balance + :inc',
            ExpressionAttributeValues: {
              ':inc': 1,
            },
          }));
        }
      }

      // Se for um novo usuário no sistema, cadastra
      userData = {
        userId,
        username: discordUser.username,
        avatarUrl: discordUser.avatarUrl,
        balance: initialBalance,
        createdAt: Date.now(),
        role: 'user',
      };

      await docClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: userData,
      }));
    } else {
      if (referalId) {
        referralStatus = 'ALREADY_EXISTS';
      }

      // Se o usuário já existir, atualiza nome ou avatar no DynamoDB se tiverem mudado
      if (userData.username !== discordUser.username || userData.avatarUrl !== discordUser.avatarUrl) {
        userData.username = discordUser.username;
        userData.avatarUrl = discordUser.avatarUrl;
        await docClient.send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId },
          UpdateExpression: 'SET username = :u, avatarUrl = :a',
          ExpressionAttributeValues: {
            ':u': discordUser.username,
            ':a': discordUser.avatarUrl,
          },
        }));
      }
    }

    userData.role = userData.role || 'user';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        token: `jwt_${userId}_${Date.now()}`,
        user: userData,
        referralStatus,
        referredBy,
      }),
    };
  } catch (error) {
    console.error('Error in AuthDiscordHandler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
