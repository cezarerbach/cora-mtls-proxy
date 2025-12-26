import https from 'https';

/**
 * Normaliza PEM vindo de env (Vercel salva com \n)
 */
function normalizePem(pem) {
  if (!pem) return null;
  return pem.replace(/\\n/g, '\n').trim();
}

/**
 * Whitelist rígida de destinos mTLS
 * (evita uso indevido do proxy)
 */
function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'matls-clients.api.stage.cora.com.br'
    );
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  /* =============================
   * Segurança básica
   * ============================= */

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-base44-api-key'];
  if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  /* =============================
   * Payload esperado
   * ============================= */

  const { url, method, headers = {}, body } = req.body || {};

  if (!url || !method) {
    return res.status(400).json({
      error: 'Payload inválido. Campos obrigatórios: url, method'
    });
  }

  if (!isAllowedUrl(url)) {
    return res.status(403).json({
      error: 'Destino não permitido'
    });
  }

  /* =============================
   * Certificados mTLS
   * ============================= */

  const cert = normalizePem(process.env.CORA_CERTIFICATE);
  const key = normalizePem(process.env.CORA_PRIVATE_KEY);

  if (!cert || !key) {
    return res.status(500).json({
      error: 'Certificado mTLS não configurado'
    });
  }

  const agent = new https.Agent({
    cert,
    key,
    rejectUnauthorized: true
  });

  /* =============================
   * Preparação do request
   * ============================= */

  const isStringBody = typeof body === 'string';

  let requestBody;
  if (body !== undefined && body !== null) {
    requestBody = isStringBody ? body : JSON.stringify(body);
  }

  const forwardHeaders = {
    ...headers
  };

  // Garante Content-Length correto
  if (requestBody && !forwardHeaders['Content-Length']) {
    forwardHeaders['Content-Length'] = Buffer.byteLength(requestBody).toString();
  }

  /* =============================
   * Chamada mTLS
   * ============================= */

  try {
    const response = await fetch(url, {
      method,
      headers: forwardHeaders,
      body: requestBody,
      agent
    });

    const responseText = await response.text();
    let responseBody;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    /* =============================
     * Forward transparente
     * ============================= */

    return res.status(response.status).json(responseBody);

  } catch (error) {
    console.error('[CORA mTLS PROXY ERROR]', {
      message: error.message,
      url,
      method
    });

    return res.status(502).json({
      error: 'Falha ao conectar com serviço bancário'
    });
  }
}
