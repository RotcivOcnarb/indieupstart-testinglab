import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = process.env.USERS_TABLE || 'IndieFeedback-Users';
const REVIEWS_TABLE = process.env.REVIEWS_TABLE || 'IndieFeedback-Reviews';

export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const {
      threadId,
      userId,
      username,
      rating,
      pros,
      cons,
      improvements,
    } = body;

    if (!threadId || !userId || !pros || !cons || !improvements) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
      };
    }

    // Minimum character validations to prevent superficial reviews
    if (pros.length < 20 || cons.length < 20 || improvements.length < 20) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'A avaliação deve conter no mínimo 20 caracteres nos campos de prós, contras e melhorias.' }),
      };
    }

    const reviewItem = {
      threadId,
      userId,
      username: username || 'Playtester',
      rating: Number(rating) || 5,
      pros,
      cons,
      improvements,
      createdAt: Date.now(),
    };

    // Conditional put to prevent duplicate review by (threadId, userId)
    try {
      await docClient.send(new PutCommand({
        TableName: REVIEWS_TABLE,
        Item: reviewItem,
        ConditionExpression: 'attribute_not_exists(threadId) AND attribute_not_exists(userId)',
      }));
    } catch (dbErr) {
      if (dbErr.name === 'ConditionalCheckFailedException') {
        return {
          statusCode: 409,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Você já submeteu uma avaliação para este jogo.' }),
        };
      }
      throw dbErr;
    }

    // Award +1 coin to playtester
    await docClient.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'ADD balance :inc',
      ExpressionAttributeValues: { ':inc': 1 },
    }));

    // Optional: Send feedback to Discord thread via REST API
    // POST /channels/{threadId}/messages

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Avaliação enviada com sucesso! Você ganhou +1 Moeda de Teste.',
        review: reviewItem,
      }),
    };
  } catch (error) {
    console.error('Error in CreateReviewHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
