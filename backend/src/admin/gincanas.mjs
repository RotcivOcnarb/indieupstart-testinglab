import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
} from '@aws-sdk/client-scheduler';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const scheduler = new SchedulerClient({});
const sm = new SecretsManagerClient({});

const USERS_TABLE = process.env.USERS_TABLE;
const GINCANAS_TABLE = process.env.GINCANAS_TABLE;
const ANNOUNCEMENTS_FUNCTION_ARN = process.env.ANNOUNCEMENTS_FUNCTION_ARN;
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN;
const STAGE = process.env.STAGE || 'dev';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const respond = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

// ─── Auth helpers ────────────────────────────────────────────────────────────

const checkAdmin = async (adminId) => {
  if (!adminId) return false;
  const res = await dynamo.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId: adminId },
  }));
  return res.Item?.role === 'admin';
};

// ─── Secrets Manager ─────────────────────────────────────────────────────────

const getInternalSecret = async () => {
  const res = await sm.send(new GetSecretValueCommand({
    SecretId: `IndieFeedbackDiscord-${STAGE}`,
  }));
  return JSON.parse(res.SecretString).INTERNAL_SECRET;
};

// ─── EventBridge Scheduler helpers ───────────────────────────────────────────

/**
 * Converts an ISO 8601 date string to the EventBridge Scheduler at() format.
 * Example: "2026-11-01T18:00:00.000Z" → "at(2026-11-01T18:00:00)"
 */
const toAtExpression = (isoDate) => {
  const dt = new Date(isoDate).toISOString().replace(/\.\d{3}Z$/, '');
  return `at(${dt})`;
};

const scheduleName = (gincanasId) => `IndieFeedback-Gincana-${gincanasId}`;

const createEventBridgeSchedule = async ({ gincanasId, scheduledDate, embedJson, internalSecret }) => {
  const input = JSON.stringify({
    _source: 'eventbridge-scheduler',
    internalSecret,
    embedJson,
    gincanasId,
  });

  const cmd = new CreateScheduleCommand({
    Name: scheduleName(gincanasId),
    ScheduleExpression: toAtExpression(scheduledDate),
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
      Arn: ANNOUNCEMENTS_FUNCTION_ARN,
      RoleArn: SCHEDULER_ROLE_ARN,
      Input: input,
    },
    // Auto-delete the schedule after it fires (one-time)
    ActionAfterCompletion: 'DELETE',
  });

  return await scheduler.send(cmd);
};

const updateEventBridgeSchedule = async ({ gincanasId, scheduledDate, embedJson, internalSecret }) => {
  const input = JSON.stringify({
    _source: 'eventbridge-scheduler',
    internalSecret,
    embedJson,
    gincanasId,
  });

  const cmd = new UpdateScheduleCommand({
    Name: scheduleName(gincanasId),
    ScheduleExpression: toAtExpression(scheduledDate),
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
      Arn: ANNOUNCEMENTS_FUNCTION_ARN,
      RoleArn: SCHEDULER_ROLE_ARN,
      Input: input,
    },
    ActionAfterCompletion: 'DELETE',
  });

  return await scheduler.send(cmd);
};

const deleteEventBridgeSchedule = async (gincanasId) => {
  try {
    await scheduler.send(new DeleteScheduleCommand({ Name: scheduleName(gincanasId) }));
  } catch (err) {
    // If the schedule was already deleted (e.g., it already fired), ignore
    if (err.name !== 'ResourceNotFoundException') throw err;
  }
};

// ─── Route Handlers ───────────────────────────────────────────────────────────

/** GET /admin/gincanas — list all gincanas */
const listGincanas = async () => {
  const res = await dynamo.send(new ScanCommand({ TableName: GINCANAS_TABLE }));
  const items = (res.Items || []).sort(
    (a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)
  );
  return respond(200, { gincanas: items });
};

/** Builds a Discord embed object from raw message text */
const buildEmbed = (message, scheduledDate) => ({
  title: '🎮 Gincana!',
  description: message,
  color: 0x5865F2, // Discord Blurple
  timestamp: new Date(scheduledDate).toISOString(),
  footer: { text: 'Indie Feedback' },
});
const createGincana = async (body) => {
  const { message, scheduledDate } = body;

  if (!message || !scheduledDate) {
    return respond(400, { error: 'Campos obrigatórios: message, scheduledDate' });
  }

  const scheduledAt = new Date(scheduledDate);
  if (isNaN(scheduledAt) || scheduledAt <= new Date()) {
    return respond(400, { error: 'scheduledDate deve ser uma data futura válida' });
  }

  const embed = buildEmbed(message, scheduledDate);
  const embedJson = JSON.stringify(embed);

  const gincanasId = randomUUID();
  const internalSecret = await getInternalSecret();

  // Create EventBridge schedule first (so we can roll back if DynamoDB fails)
  const scheduleRes = await createEventBridgeSchedule({
    gincanasId,
    scheduledDate,
    embedJson,
    internalSecret,
  });

  const item = {
    gincanasId,
    message,
    embedJson,
    scheduledDate,
    status: 'scheduled',
    eventBridgeScheduleArn: scheduleRes.ScheduleArn,
    createdAt: new Date().toISOString(),
  };

  await dynamo.send(new PutCommand({ TableName: GINCANAS_TABLE, Item: item }));

  return respond(201, { message: 'Gincana criada com sucesso!', gincana: item });
};

/** PUT /admin/gincanas/:id — edit message/date (only if still scheduled) */
const updateGincana = async (gincanasId, body) => {
  const { message, scheduledDate } = body;

  if (!message || !scheduledDate) {
    return respond(400, { error: 'Campos obrigatórios: message, scheduledDate' });
  }

  const scheduledAt = new Date(scheduledDate);
  if (isNaN(scheduledAt) || scheduledAt <= new Date()) {
    return respond(400, { error: 'scheduledDate deve ser uma data futura válida' });
  }

  // Fetch existing item
  const existing = await dynamo.send(new GetCommand({
    TableName: GINCANAS_TABLE,
    Key: { gincanasId },
  }));

  if (!existing.Item) return respond(404, { error: 'Gincana não encontrada' });
  if (existing.Item.status !== 'scheduled') {
    return respond(409, { error: 'Não é possível editar gincanas já realizadas' });
  }

  const internalSecret = await getInternalSecret();

  // Rebuild embed with new message/date
  const embed = buildEmbed(message, scheduledDate);
  const embedJson = JSON.stringify(embed);

  await updateEventBridgeSchedule({ gincanasId, scheduledDate, embedJson, internalSecret });

  await dynamo.send(new UpdateCommand({
    TableName: GINCANAS_TABLE,
    Key: { gincanasId },
    UpdateExpression: 'SET #msg = :m, embedJson = :e, scheduledDate = :d, updatedAt = :u',
    ExpressionAttributeNames: { '#msg': 'message' },
    ExpressionAttributeValues: {
      ':m': message,
      ':e': embedJson,
      ':d': scheduledDate,
      ':u': new Date().toISOString(),
    },
  }));

  return respond(200, { message: 'Gincana atualizada com sucesso!' });
};

/** DELETE /admin/gincanas/:id — delete gincana + cancel schedule */
const deleteGincana = async (gincanasId) => {
  const existing = await dynamo.send(new GetCommand({
    TableName: GINCANAS_TABLE,
    Key: { gincanasId },
  }));

  if (!existing.Item) return respond(404, { error: 'Gincana não encontrada' });
  if (existing.Item.status !== 'scheduled') {
    return respond(409, { error: 'Não é possível excluir gincanas já realizadas' });
  }

  await deleteEventBridgeSchedule(gincanasId);
  await dynamo.send(new DeleteCommand({ TableName: GINCANAS_TABLE, Key: { gincanasId } }));

  return respond(200, { message: 'Gincana excluída com sucesso!' });
};

// ─── Main handler ─────────────────────────────────────────────────────────────

export const handler = async (event) => {
  try {
    const adminId = event.headers?.['x-user-id'];
    const isAdmin = await checkAdmin(adminId);
    if (!isAdmin) return respond(403, { error: 'Unauthorized access' });

    const method = event.requestContext?.http?.method || event.httpMethod;
    const pathParams = event.pathParameters || {};
    const gincanasId = pathParams.id;

    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'GET') return await listGincanas();
    if (method === 'POST') return await createGincana(body);
    if (method === 'PUT' && gincanasId) return await updateGincana(gincanasId, body);
    if (method === 'DELETE' && gincanasId) return await deleteGincana(gincanasId);

    return respond(404, { error: 'Rota não encontrada' });

  } catch (err) {
    console.error('Error in AdminGincanasHandler:', err);
    return respond(500, { error: 'Internal Server Error', message: err.message });
  }
};
