export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { event_name, event_id, value = 0, currency = 'BRL', fbp, fbc, email } = req.body;

    if (!event_name || !event_id) return res.status(400).json({ error: 'Missing event_name or event_id' });

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'];

    const crypto = require('crypto');
    const hash = (str) => crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');

    const user_data = { client_ip_address: ip, client_user_agent: userAgent };
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;
    if (email) user_data.em = [hash(email)];

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          action_source: 'website',
          custom_data: { value, currency },
          user_data
        }
      ]
    };

    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events?access_token=${process.env.FB_ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

    const data = await fbRes.json();
    console.log('RESPOSTA META:', data);

    return res.status(200).json({ success: true, response: data });

  } catch (err) {
    console.error('ERRO:', err);
    return res.status(500).json({ error: 'Erro interno', details: err.message });
  }
}