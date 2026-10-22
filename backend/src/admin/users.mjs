import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    if (method === 'GET' && path.startsWith('/admin/users')) {
      const query = event.queryStringParameters?.query;
      
      let commandInput = {
        TableName: USERS_TABLE,
      };

      const response = await docClient.send(new ScanCommand(commandInput));
      let allUsers = response.Items || [];

      if (query) {
        const qLower = query.toLowerCase();
        allUsers = allUsers.filter(u => 
          (u.username && u.username.toLowerCase().includes(qLower)) || 
          u.userId === query
        );
      }

      // Limit results to 50
      const usersToReturn = allUsers.slice(0, 50);
      
      const users = usersToReturn.map(u => ({
        userId: u.userId,
        username: u.username,
        avatarUrl: u.avatarUrl,
        balance: u.balance,
        role: u.role || 'user',
        createdAt: u.createdAt,
      }));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(users),
      };
    }

    if (method === 'POST' && path.match(/\/admin\/users\/[^\/]+\/coins/)) {
      const targetUserId = event.pathParameters?.id;
      const body = event.body ? JSON.parse(event.body) : {};
      const { amount } = body;

      if (!targetUserId || amount === undefined || typeof amount !== 'number') {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing targetUserId or amount' }),
        };
      }

      // Evita saldo negativo se for remover
      const targetRes = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { userId: targetUserId },
      }));

      const targetUser = targetRes.Item;
      if (!targetUser) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      const newBalance = Math.max(0, targetUser.balance + amount);

      await docClient.send(new UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: targetUserId },
        UpdateExpression: 'SET balance = :bal',
        ExpressionAttributeValues: { ':bal': newBalance },
      }));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ message: 'Coins updated', balance: newBalance }),
      };
    }

    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Not Found' }),
    };

  } catch (error) {
    console.error('Error in AdminUsersHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
