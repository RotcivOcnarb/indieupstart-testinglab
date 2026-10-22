import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = getTableName(process.env.USERS_TABLE, 'IndieFeedback-Users');
const GAMES_TABLE = getTableName(process.env.GAMES_TABLE, 'IndieFeedback-Games');
const REVIEWS_TABLE = getTableName(process.env.REVIEWS_TABLE, 'IndieFeedback-Reviews');

const checkAdmin = async (adminId) => {
  if (!adminId) return false;
  const res = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId: adminId },
  }));
  const user = res.Item;
  return user && user.role === 'admin';
};

export const handler = async (event) => {
  try {
    const adminId = event.headers?.['x-user-id'] || event.queryStringParameters?.adminId;
    const isAdmin = await checkAdmin(adminId);

    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Unauthorized access' }),
      };
    }

    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.requestContext?.http?.path || event.path;

    if (method === 'POST' && path === '/admin/games') {
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
          body: JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
        };
      }

      const userRes = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: authorId },
      }));

      const user = userRes.Item;
      if (!user) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Usuário autor não encontrado' }),
        };
      }

      // 3. Cria Tópico no Fórum do Discord
      const botToken = process.env.DISCORD_BOT_TOKEN;
      const forumChannelId = process.env.DISCORD_FORUM_CHANNEL_ID;
      let threadId = null;

      if (botToken && forumChannelId) {
        try {
          const threadTitle = `[${stage}] ${title}`.slice(0, 100);
          const isUserMentionable = /^\\d+$/.test(authorId);
          const authorDisplay = isUserMentionable ? `<@${authorId}>` : user.username;
          const siteBaseUrl = process.env.SITE_BASE_URL || 'https://d147q7u6ukctn2.cloudfront.net';

          const embedFields = [
            { name: 'Estágio', value: stage, inline: true },
            { name: 'Autor', value: authorDisplay, inline: true },
            { name: 'Link para Jogar', value: `[🎮 Acessar Projeto](${gameUrl})`, inline: false },
          ];

          if (tags.length > 0) {
            embedFields.push({ name: 'Tags', value: tags.join(', '), inline: false });
          }

          const embed = {
            title: `🎮 ${title}`,
            description: description,
            color: 9133302,
            fields: embedFields,
            footer: { text: 'Indie Feedback Ecosystem • Teste & Avalie para acumular moedas!' },
            timestamp: new Date().toISOString(),
          };

          if (bannerUrl) {
            try {
              embed.image = { url: new URL(bannerUrl.trim().replace(/ /g, '%20')).toString() };
            } catch (e) {
              console.warn('URL de banner inválida ignorada:', bannerUrl);
            }
          }

          const discordRes = await fetch(`https://discord.com/api/v10/channels/${forumChannelId}/threads`, {
            method: 'POST',
            headers: {
              Authorization: `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: threadTitle,
              auto_archive_duration: 1440,
              message: {
                content: `🚀 **Novo jogo postado pela comunidade para Playtest!**`,
                embeds: [embed],
              },
            }),
          });

          if (discordRes.ok) {
            const threadData = await discordRes.json();
            threadId = threadData.id;

            const reviewUrl = `${siteBaseUrl}/review/${threadId}`;
            await fetch(`https://discord.com/api/v10/channels/${threadId}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bot ${botToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                embeds: [
                  {
                    title: '🪙 Quer ganhar Moedas de Teste?',
                    description: 'Avalie este jogo pela nossa plataforma para ajudar o desenvolvedor e receba **1 Moeda de Teste** para acumular e publicar seus próprios projetos!',
                    color: 0xFEE75C,
                    fields: [
                      { name: ' Recompensa', value: '+1 Moeda no seu saldo', inline: true },
                      { name: ' Onde avaliar?', value: 'Diretamente pelo site', inline: true },
                    ],
                    footer: { text: 'Indie Feedback • Apenas 1 review por jogo' },
                  },
                ],
                components: [
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 5,
                        label: 'Avaliar este Jogo',
                        url: reviewUrl,
                        emoji: { name: '⭐' },
                      },
                    ],
                  },
                ],
              }),
            });
          } else {
            const errData = await discordRes.json();
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ error: 'Erro ao criar tópico no Fórum do Discord', message: errData }),
            };
          }
        } catch (dErr) {
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Erro na requisição para a API do Discord', message: dErr }),
          };
        }
      }

      if (!threadId) {
        threadId = `local_${Date.now()}`;
      }

      // Salva o registro do Jogo no DynamoDB (Custo zero!)
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
        costPaid: 0, // Zero cost
        createdAt: Date.now(),
      };

      await docClient.send(new PutCommand({
        TableName: GAMES_TABLE,
        Item: newGame,
      }));

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          message: 'Jogo publicado com sucesso pelo admin!',
          game: newGame,
        }),
      };
    }

    if (method === 'DELETE' && path.match(/\/admin\/games\/[^\/]+/)) {
      const threadId = event.pathParameters?.id;

      if (!threadId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing threadId' }),
        };
      }

      // Query and delete all reviews
      const reviewsData = await docClient.send(new QueryCommand({
        TableName: REVIEWS_TABLE,
        KeyConditionExpression: 'threadId = :tid',
        ExpressionAttributeValues: { ':tid': threadId },
      }));

      const deletePromises = (reviewsData.Items || []).map(r => 
        docClient.send(new DeleteCommand({
          TableName: REVIEWS_TABLE,
          Key: { threadId: r.threadId, userId: r.userId },
        }))
      );
      
      await Promise.all(deletePromises);

      // Delete the game
      await docClient.send(new DeleteCommand({
        TableName: GAMES_TABLE,
        Key: { threadId },
      }));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Game and related reviews deleted successfully' }),
      };
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Not Found' }),
    };

  } catch (error) {
    console.error('Error in AdminGamesHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
