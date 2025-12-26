import { Agent, request } from 'undici';

function normalizePem(pem) {
  return pem?.replace(/\\n/g, '\n').trim();
}

export default async function handler(req, res) {
  try {
    /* =========================
       🔐 Auth do proxy
       ========================= */
    const apiKey = req.headers['x-base44-api-key'];
    if (apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    /* =========================
       📦 Payload
       ========================= */
    const { url, method, headers = {}, body } = req.body || {};
    if (!url || !method) {
      return res.status(400).json({
        error: 'Payload inválido. Campos obrigatórios: url, method'
      });
    }

    /* =========================
       🔑 Certificados mTLS
       ========================= */
    const cert = normalizePem(process.env.CORA_CERTIFICATE);
    const key = normalizePem(process.env.CORA_PRIVATE_KEY);

    if (!cert || !key) {
      return res.status(500).json({
        error: 'Certificado ou chave privada ausentes'
      });
    }

    /* =========================
       🚨 HTTP/2 + mTLS (ESSENCIAL)
       ========================= */
    const dispatcher = new Agent({
      allowH2: true,
      connect: {
        cert,
        key,
        rejectUnauthorized: true,
        alpnProtocols: ['h2']
      }
    });

    /* =========================
       🚀 Request REAL
       ========================= */
    const { statusCode, body: resBody } = await request(url, {
      method,
      headers,
      body,
      dispatcher
    });

    const raw = await resBody.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    return res.status(statusCode).json(parsed);

  } catch (err) {
    console.error('CORA MTLS PROXY ERROR', err);
    return res.status(500).json({
      error: 'Erro interno no proxy mTLS',
      message: err.message
    });
  }
}
