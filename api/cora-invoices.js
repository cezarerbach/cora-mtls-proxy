export default async function handler(req, res) {
  return res.status(200).json({
    receivedApiKey: req.headers["x-base44-api-key"] || null,
    envApiKey: process.env.BASE44_INTERMEDIARY_KEY || null,
    headers: req.headers,
import https from "https";

function normalizePem(pem) {
  if (!pem) return null;
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}
export default async function handler(req, res) {

  console.log('DEBUG ─ headers recebidos:', Object.keys(req.headers));

  console.log(
    'DEBUG ─ x-base44-api-key (length):',
    req.headers['x-base44-api-key']?.length
  );

  console.log(
    'DEBUG ─ BASE44_INTERMEDIARY_KEY (length):',
    process.env.BASE44_INTERMEDIARY_KEY?.length
  );

  // 🔽 o restante do código continua aqui

export default async function handler(req, res) {
  /* ===============================
     HARDENING BÁSICO
  =============================== */

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  if (req.headers["x-base44-api-key"] !== process.env.BASE44_API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({ error: "missing_bearer_token" });
  }

  const idempotencyKey = req.headers["idempotency-key"];
  if (!idempotencyKey) {
    return res.status(400).json({ error: "missing_idempotency_key" });
  }

  /* ===============================
     CERTIFICADOS mTLS
  =============================== */

  const cert = normalizePem(process.env.CORA_CERTIFICATE);
  const key  = normalizePem(process.env.CORA_PRIVATE_KEY);

  if (!cert || !key) {
    return res.status(500).json({ error: "mtls_not_configured" });
  }

  const agent = new https.Agent({
    cert,
    key,
    rejectUnauthorized: true,
  });

  /* ===============================
     REQUEST PARA CORA
  =============================== */

  try {
    const response = await fetch(
      "https://api.stage.cora.com.br/v2/invoices",
      {
        method: "POST",
        agent,
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(req.body),
      }
    );

    const responseText = await response.text();
    let responseBody;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "cora_error",
        details: responseBody,
      });
    }

    return res.status(201).json(responseBody);

  } catch (err) {
    return res.status(500).json({
      error: "internal_error",
      message: err.message,
    });
  }
}

