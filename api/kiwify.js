import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body;

    // 1. Log para debug (Verifique isso no console da Vercel)
    console.log('--- NOVO WEBHOOK RECEBIDO ---');
    console.log('Status da Ordem:', body.order_status);

    // 2. Filtro: Processa apenas quando o pagamento é confirmado (status: paid)
    // Se você estiver usando o botão "Enviar Teste" da Kiwify, o status pode ser diferente.
    if (body.order_status !== 'paid') {
      console.log('Evento ignorado. Status não é "paid".');
      return res.status(200).send('Evento ignorado (não é pago)');
    }

    // 3. Extração de dados seguindo o padrão Kiwify
    const email = body.email;
    const value = (body.total_price_cents || 0) / 100; // Converte centavos para Real
    const event_id = body.order_id || `kw-${Date.now()}`;

    // 4. Função de Hash SHA256 (Padrão Facebook)
    const hash = (data) =>
      crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');

    const user_data = {};
    if (email) {
      user_data.em = [hash(email)]; // Facebook espera um Array de strings hasheadas
    }

    // 5. Payload para a API de Conversões do Facebook
    const payload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: event_id,
          action_source: 'website',
          event_source_url: body.product_url || '', // Opcional: URL do produto
          custom_data: {
            value: value,
            currency: 'BRL'
          },
          user_data: user_data
        }
      ]
    };

    // 6. Envio para o Facebook
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events?access_token=${process.env.FB_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    const fbData = await fbRes.json();

    console.log('🔥 RESPOSTA FACEBOOK:', fbData);

    // Retorna 200 para a Kiwify não tentar reenviar o webhook
    return res.status(200).json({
      success: true,
      fb_response: fbData
    });

  } catch (err) {
    console.error('❌ ERRO NO PROCESSAMENTO:', err.message);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}