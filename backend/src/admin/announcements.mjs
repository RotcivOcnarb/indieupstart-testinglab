import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = getTableName(process.env.USERS_TABLE, 'IndieFeedback-Users');

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

    if (method === 'POST' && path === '/admin/announcements') {
      const body = event.body ? JSON.parse(event.body) : {};
      const { content, title = 'Anúncio', mentionEveryone = false } = body;

      if (!content) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing content' }),
        };
      }

      const botToken = process.env.DISCORD_BOT_TOKEN;
      const announcementsChannelId = process.env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID;

      if (!botToken || !announcementsChannelId) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Discord configuration missing (BOT_TOKEN or ANNOUNCEMENTS_CHANNEL_ID)' }),
        };
      }

      const embed = {
        title: `📢 ${title}`,
        description: content,
        color: 0x5865F2, // Discord Blurple
        timestamp: new Date().toISOString(),
        footer: { text: 'Indie Feedback Admin' },
      };

      const discordRes = await fetch(`https://discord.com/api/v10/channels/${announcementsChannelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(mentionEveryone ? { content: '@everyone', allowed_mentions: { parse: ['everyone'] } } : {}),
          embeds: [embed],
        }),
      });

      if (!discordRes.ok) {
        const errData = await discordRes.json();
        console.error('Discord API Error:', errData);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Failed to post announcement', details: errData }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Announcement posted successfully' }),
      };
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Not Found' }),
    };

  } catch (error) {
    console.error('Error in AdminAnnouncementsHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
