import https from "https";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  console.log("Requisição recebida no cora-invoices");
  console.log("Headers:", req.headers);

  const BASE44_API_KEY = process.env.BASE44_INTERMEDIARY_KEY;
  const INVOICES_URL = process.env.VERCEL_CORA_INVOICES_URL;
  const CERT = process.env.CORA_CERTIFICATE;
  const KEY = process.env.CORA_PRIVATE_KEY;

  // Validação básica de ambiente
  if (!BASE44_API_KEY || !INVOICES_URL || !CERT || !KEY) {
    return res.status(500).json({ error: "Configuração de ambiente ausente" });
  }

  // Validação de header Base44
  const receivedKey = req.headers["x-base44-api-key"];
  if (receivedKey !== BASE44_API_KEY) {
    console.warn("Chave Base44 inválida:", receivedKey);
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validando corpo da requisição
  const { accessToken, idempotencyKey, payload } = req.body || {};
  if (!accessToken || !idempotencyKey || !payload) {
    return res.status(400).json({
      error: "Parâmetros ausentes: accessToken, idempotencyKey e payload são obrigatórios.",
    });
  }

  console.log("Payload recebido:", payload);

  // Configurando HTTPS Agent com mTLS
  const agent = new https.Agent({
    cert: normalizePem(CERT),
    key: normalizePem(KEY),
    rejectUnauthorized: true,
  });

  try {
    const response = await fetch(INVOICES_URL, {
      method: "POST",
      agent,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Idempotency-Key": idempotencyKey,
        "x-base44-api-key": BASE44_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    if (!response.ok) {
      console.error("Erro da Cora:", responseBody);
      return res.status(response.status).json({ error: "cora_error", details: responseBody });
    }

    console.log("Resposta da Cora recebida:", responseBody);
    return res.status(201).json(responseBody);

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
