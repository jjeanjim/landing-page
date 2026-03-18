import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const body = req.body;

    // 🔥 só processa compra aprovada
    if (body.event !== 'sale.approved') {
      return res.status(200).end();
    }

    const email = body.data?.customer?.email;
    const value = body.data?.order?.amount || 0;
    const event_id = body.data?.order?.id;

    // 🔥 hash (OBRIGATÓRIO pro match avançado)
    const hash = (data) =>
      crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');

    const user_data = {};

    if (email) {
      user_data.em = hash(email);
    }

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: event_id,
          action_source: 'website',

          custom_data: {
            value: value,
            currency: 'BRL'
          },

          user_data
        }
      ],
      access_token: process.env.FB_ACCESS_TOKEN
    };

    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const data = await fbRes.json();

    console.log('🔥 PURCHASE ENVIADO:', data);

    return res.status(200).json(data);

  } catch (err) {
    console.error('❌ ERRO WEBHOOK:', err);
    return res.status(500).json({ error: err.message });
  }
}