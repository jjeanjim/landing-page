import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // 🔒 Proteção por senha
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.API_SECRET}`)
    return res.status(401).json({ error: 'Unauthorized' });

  // 🔒 Validação de domínio
  const origin = req.headers.origin || '';
  if (!(origin.includes('hajime.sbs') || origin.includes('www.hajime.sbs')))
    return res.status(403).json({ error: 'Invalid origin' });

  // ✅ Pegar dados do corpo
  const { event_name, event_id, email } = req.body;

  // ✅ Validação de campos obrigatórios
  if (!event_name || !event_id) {
    return res.status(400).json({ error: 'Missing event_name or event_id' });
  }

  // ✅ Validação de email
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // 🔥 Hash do email
  const hash = (value) =>
    crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

  const userData = {
    client_ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    client_user_agent: req.headers['user-agent']
  };
  if (email) userData.em = hash(email);

  try {
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name,
              event_time: Math.floor(Date.now() / 1000),
              event_id,
              action_source: 'website',
              user_data: userData
            }
          ],
          access_token: process.env.FB_ACCESS_TOKEN
        })
      }
    );

    const data = await fbRes.json();
    res.status(200).json(data);

  } catch (err) {
    console.error('Error sending event:', err.message);
    res.status(500).json({ error: err.message });
  }
}