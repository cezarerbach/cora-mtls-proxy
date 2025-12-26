import { Agent } from 'undici';

/**
 * Normaliza PEM vindo de env
 */
function normalizePem(pem) {
  if (!pem) return null;
  return pem.replace(/\\n/g, '\n').trim();
}

function validatePayload(payload) {
  if (!payload) return 'Payload ausente';
  if (!payload.url) return 'Campo obrigatório: url';
  if (!payload.method) return 'Campo obrigatório: method';
  return null;
}

export default async function handler(req, res) {
  try {
    /* =========================
       🔐 Autenticação do proxy
       ========================= */
    const apiKey =
      req.headers['x-base44-api-key'] ||
      req.headers['X-Base44-Api-Key'];

    if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    /* =========================
       📦 Payload
       ========================= */
    const payload = req.body;
    const validationError = validatePayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { url, method, headers = {}, body } = payload;

    /* =========================
       🔑 Certificados mTLS
       ========================= */
    const certificate = normalizePem(process.env.CORA_CERTIFICATE);
    const privateKey = normalizePem(process.env.CORA_PRIVATE_KEY);

    if (!certificate || !privateKey) {
      return res.status(500).json({
        error: 'Certificado ou chave privada não configurados'
      });
    }

    /**
     * 🚨 ESTE É O PONTO CRÍTICO
     * mTLS FUNCIONA SOMENTE COM dispatcher (undici)
     */
    const dispatcher = new Agent({
      connect: {
        cert: certificate,
        key: privateKey,
        rejectUnauthorized: true
      }
    });

    /* =========================
       🧾 Body handling
       ========================= */
    let outgoingBody = body;

    /* =========================
       🚀 Forward mTLS REAL
       ========================= */
    const response = await fetch(url, {
      method,
      headers,
      body: outgoingBody,
      dispatcher   // 👈 ESSENCIAL
    });

    const text = await response.text();

    let responsePayload;
    try {
      responsePayload = JSON.parse(text);
    } catch {
      responsePayload = text;
    }

    return res.status(response.status).json(responsePayload);

  } catch (error) {
    console.error('CORA MTLS PROXY ERROR:', error);
    return res.status(500).json({
      error: 'Erro interno no proxy mTLS',
      message: error.message
    });
  }
}
