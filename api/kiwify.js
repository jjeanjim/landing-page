import crypto from 'crypto';

export default async function handler(req, res) {
  // 1. Bloqueia métodos que não sejam POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body;

    // 2. Log de segurança para você ver na Vercel se a Kiwify bateu lá
    console.log('--- WEBHOOK HAJIME RECEBIDO ---');
    console.log('Status:', body.order_status);

    // 3. Filtro: Kiwify envia 'paid' para aprovado. Se não for, para aqui.
    if (body.order_status !== 'paid') {
      return res.status(200).send('Evento recebido, mas não processado (status != paid)');
    }

    // 4. Mapeamento de dados (Kiwify envia na raiz, sem o .data)
    const email = body.email || '';
    const order_id = body.order_id || `kw-${Date.now()}`;
    const value = (body.total_price_cents || 0) / 100;

    // 5. Preparação do User Data (Hash SHA256)
    const hash = (str) => 
      crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');

    const user_data = {
      client_ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
      client_user_agent: req.headers['user-agent']
    };

    if (email) {
      user_data.em = [hash(email)];
    }

    // 6. Payload para a API de Conversões da Meta
    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: order_id,
          action_source: 'website',
          custom_data: {
            value: value,
            currency: 'BRL'
          },
          user_data: user_data
        }
      ]
    };

    // 7. Disparo para o Facebook
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events?access_token=${process.env.FB_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const fbData = await fbRes.json();
    console.log('--- RESPOSTA FACEBOOK ---', fbData);

    return res.status(200).json({ success: true, fb_response: fbData });

  } catch (err) {
    console.error('❌ ERRO CRÍTICO:', err.message);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}