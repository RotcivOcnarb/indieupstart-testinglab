export const handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { threadId, gameTitle, reporterId, category, details } = body;

    if (!threadId || !reporterId || !category || !details) {
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
          title: '⚠️ Denúncia de Jogo / Publicação',
          color: 16744192, // Orange/Red
          fields: [
            { name: 'Jogo', value: gameTitle || threadId, inline: true },
            { name: 'Denunciante ID', value: reporterId, inline: true },
            { name: 'Categoria', value: category, inline: false },
            { name: 'Detalhes da Denúncia', value: details, inline: false },
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
      body: JSON.stringify({ message: 'Denúncia de jogo recebida com sucesso. A equipe de moderação irá analisar.' }),
    };
  } catch (error) {
    console.error('Error in ReportGameHandler:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', message: error.message }),
    };
  }
};
