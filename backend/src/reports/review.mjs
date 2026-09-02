export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { threadId, reviewUserId, reporterId, reason, category } = body;

    if (!threadId || !reviewUserId || !reporterId || !reason) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Campos obrigatórios ausentes' }),
      };
    }

    const modWebhookUrl = process.env.DISCORD_MOD_WEBHOOK_URL;
    if (modWebhookUrl) {
      const payload = {
        embeds: [{
          title: '🚨 Denúncia de Review Superficial / Irregular',
          color: 15158332, // Red
          fields: [
            { name: 'Tópico / Jogo ID', value: threadId, inline: true },
            { name: 'Autor da Review', value: reviewUserId, inline: true },
            { name: 'Denunciante', value: reporterId, inline: true },
            { name: 'Categoria', value: category || 'Review Superficial', inline: false },
            { name: 'Motivo', value: reason, inline: false },
          ],
          timestamp: new Date().toISOString(),
        }],
      };

      await fetch(modWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.error('Erro ao enviar webhook Discord:', err));
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Denúncia registrada e encaminhada para a moderação.' }),
    };
  } catch (error) {
    console.error('Error in ReportReviewHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
