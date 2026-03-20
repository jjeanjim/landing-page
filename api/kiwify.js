import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body;

    console.log('--- WEBHOOK HAJIME RECEBIDO ---');
    console.log('Status Original Kiwify:', body.order_status);

  
    let eventName = '';
    
    if (body.order_status === 'paid') {
      eventName = 'Purchase';
    } else if (body.order_status === 'waiting_payment') {
      eventName = 'InitiateCheckout'; 
    } else {
      
      console.log(`Evento ${body.order_status} ignorado.`);
      return res.status(200).send(`Status ${body.order_status} ignorado`);
    }

    const email = body.email || '';
    const order_id = body.order_id || `kw-${Date.now()}`;
    const value = (body.total_price_cents || 0) / 100;
    const currency = (body.currency || 'BRL').toUpperCase();

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

    
    const payload = {
      data: [
        {
          event_name: eventName, 
          event_time: Math.floor(Date.now() / 1000),
          event_id: order_id, 
          action_source: 'website',
          test_event_code: 'TEST14695', 
          custom_data: {
            value: value,
            currency: currency,
          },
          user_data: user_data
        }
      ]
    };

    const PIXEL_ID = process.env.FB_PIXEL_ID;
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

    console.log(`ENVIANDO PARA FACEBOOK: ${eventName}`);
    console.log('TOKEN STATUS:', ACCESS_TOKEN ? 'OK' : 'MISSING');

    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
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
      event_sent: eventName,
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