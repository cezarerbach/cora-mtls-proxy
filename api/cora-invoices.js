import https from "https";

function normalizePem(pem) {
  return pem?.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  /* ===============================
     AUTH INTERMEDIÁRIO (BASE44)
  =============================== */

  const apiKey = req.headers["x-base44-api-key"];
  if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  /* ===============================
     AUTH CORA
  =============================== */

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "missing_authorization_header" });
  }

  const idempotencyKey =
    req.headers["idempotency-key"] || crypto.randomUUID();

  /* ===============================
     mTLS
  =============================== */

  const cert = normalizePem(process.env.CORA_CERTIFICATE);
  const key = normalizePem(process.env.CORA_PRIVATE_KEY);

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

    const text = await response.text();
    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "cora_error",
        details: body,
      });
    }

    return res.status(201).json(body);
  } catch (err) {
    return res.status(500).json({
      error: "internal_error",
      message: err.message,
    });
  }
}
