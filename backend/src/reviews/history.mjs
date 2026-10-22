import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

import { getTableName } from '../utils/env.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const REVIEWS_TABLE = getTableName(process.env.REVIEWS_TABLE, 'IndieFeedback-Reviews');

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.userId || event.headers?.['x-user-id'];

    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing userId parameter' }),
      };
    }

    const allReviewsOutput = await docClient.send(new ScanCommand({
      TableName: REVIEWS_TABLE,
    }));

    const allReviews = allReviewsOutput.Items || [];
    const userReviews = allReviews.filter(r => r.userId === userId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        reviews: userReviews,
      }),
    };
  } catch (error) {
    console.error('Error in GetReviewHistoryHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
