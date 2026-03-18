
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { event_name, event_id } = req.body;

    if (!event_name || !event_id) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // 🔥 Captura automática do usuário
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.socket?.remoteAddress ||
      null;

    const userAgent = req.headers['user-agent'];

            const payload = {
        data: [
            {
            event_name,
            event_time: Math.floor(Date.now() / 1000),
            event_id,
            action_source: 'website',

            // 🔥 IMPORTANTE
            custom_data: {
                value: value,
                currency: currency || 'BRL'
            },

            user_data
            }
        ],
        access_token: process.env.FB_ACCESS_TOKEN
        };

    console.log('ENVIANDO:', payload);

    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const data = await fbRes.json();

    console.log('RESPOSTA META:', data);

    return res.status(200).json(data);

  } catch (err) {
    console.error('ERRO:', err);
    return res.status(500).json({ error: err.message });
  }
}