import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = getTableName(process.env.USERS_TABLE, 'IndieFeedback-Users');
const GAMES_TABLE = getTableName(process.env.GAMES_TABLE, 'IndieFeedback-Games');

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

    // 1. Busca saldo atual do usuário
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

    // 2. Calcula custo dinâmico C = min(5, floor(N/2))
    const gamesScan = await docClient.send(new ScanCommand({ TableName: GAMES_TABLE }));
    const N = gamesScan.Count || 0;
    const cost = Math.min(5, Math.floor(N / 2));

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

    // 3. Cria Tópico no Fórum do Discord via REST API v10 se o Bot Token e Channel ID estiverem configurados
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const forumChannelId = process.env.DISCORD_FORUM_CHANNEL_ID;
    let threadId = null;

    if (botToken && forumChannelId) {
      try {
        const threadTitle = `[${stage}] ${title}`.slice(0, 100);
        const isUserMentionable = /^\d+$/.test(authorId);
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
          color: 9133302, // Roxo (#8b5cf6)
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

        // 1. Cria o tópico no Fórum do Discord
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
          console.log(`Tópico criado com sucesso no Fórum Discord! ID: ${threadId}`);

          // 2. Envia uma segunda mensagem na thread com o link de avaliação
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
                  color: 0xFEE75C, // Cor dourada/moeda
                  fields: [
                    {
                      name: ' Recompensa',
                      value: '+1 Moeda no seu saldo',
                      inline: true,
                    },
                    {
                      name: ' Onde avaliar?',
                      value: 'Diretamente pelo site',
                      inline: true,
                    },
                  ],
                  footer: {
                    text: 'Indie Feedback • Apenas 1 review por jogo',
                  },
                },
              ],
              components: [
                {
                  type: 1, // Action Row
                  components: [
                    {
                      type: 2, // Button
                      style: 5, // Link Button
                      label: 'Avaliar este Jogo',
                      url: reviewUrl,
                      emoji: {
                        name: '⭐',
                      },
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

    // Fallback para ID sintético caso o bot não esteja configurado
    if (!threadId) {

    }

    // 4. Deduz o saldo do usuário
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: authorId },
      UpdateExpression: 'SET balance = balance - :cost',
      ExpressionAttributeValues: { ':cost': cost },
    }));

    // 5. Salva o registro do Jogo no DynamoDB
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
