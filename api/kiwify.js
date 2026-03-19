import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body;

    console.log('--- WEBHOOK HAJIME RECEBIDO ---');
    console.log('Status:', body.order_status);

    
    if (body.order_status !== 'paid') {
      return res.status(200).send('Evento ignorado (status != paid)');
    }


    const email = body.email || '';
    const order_id = body.order_id || `kw-${Date.now()}`;
    const value = (body.total_price_cents || 0) / 100;

    
    const hash = (str) =>
      crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');

    
    const user_data = {
      client_ip_address:
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket?.remoteAddress ||
        null,
      client_user_agent: req.headers['user-agent'] || ''
    };

    if (email) {
      user_data.em = [hash(email)];
    }

    const currency = (body.currency || 'BRL').toUpperCase();

    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: order_id,
          action_source: 'website',

          custom_data: {
            value: value,
            currency: currency,
          },

          user_data: user_data
        }
      ],
      access_token: process.env.FB_ACCESS_TOKEN
    };

    
    console.log('TOKEN:', process.env.FB_ACCESS_TOKEN ? 'OK' : 'MISSING');
    console.log('PIXEL:', process.env.FB_PIXEL_ID);

    
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const fbData = await fbRes.json();

    console.log('--- RESPOSTA FACEBOOK ---', fbData);

    return res.status(200).json({
      success: true,
      fb_response: fbData
    });

  } catch (err) {
    console.error('❌ ERRO CRÍTICO:', err.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: err.message
    });
  }
}