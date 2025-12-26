import https from "https";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  console.log("Requisição recebida no cora-invoices");

  // =========================
  // Validação x-base44-api-key
  // =========================
  const receivedApiKey = req.headers["x-base44-api-key"];
  const expectedApiKey = process.env.BASE44_INTERMEDIARY_KEY;

  if (!receivedApiKey || receivedApiKey !== expectedApiKey) {
    console.warn("x-base44-api-key ausente ou inválida", { receivedApiKey });
    return res.status(401).json({ error: "unauthorized" });
  }

  console.log("API Key válida recebida:", receivedApiKey);

  // =========================
  // Verifica mTLS
  // =========================
  const cert = process.env.CORA_CERTIFICATE ? normalizePem(process.env.CORA_CERTIFICATE) : null;
  const key = process.env.CORA_PRIVATE_KEY ? normalizePem(process.env.CORA_PRIVATE_KEY) : null;

  if (!cert || !key) {
    console.error("Certificado ou chave privada não configurados no ambiente");
    return res.status(500).json({ error: "mtls_not_configured" });
  }

  const agent = new https.Agent({
    cert,
    key,
    rejectUnauthorized: true,
  });

  // =========================
  // Authorization Header temporário para logging
  // =========================
  const authHeader = req.headers["authorization"] || null;
  console.log("Authorization header recebido:", authHeader);

  // =========================
  // Idempotency Key
  // =========================
  const idempotencyKey = req.headers["idempotency-key"] || `temp-${Date.now()}`;

  // =========================
  // Chamada para Cora
  // =========================
  try {
    console.log("Enviando requisição para Cora via mTLS...", {
      path: "/v2/invoices",
      body: req.body,
      idempotencyKey,
    });

    const response = await fetch("https://api.stage.cora.com.br/v2/invoices", {
      method: "POST",
      agent,
      headers: {
        "Authorization": authHeader || "", // pode ser vazio por enquanto
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(req.body),
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

    console.log("Resposta da Cora recebida com sucesso");
    return res.status(201).json(responseBody);

  } catch (err) {
    console.error("Erro interno no proxy:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
