import https from "https";

export default async function handler(req, res) {
  console.log("========== Requisição recebida no cora-invoices ==========");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  // Validação do header x-base44-api-key
  const receivedKey = req.headers["x-base44-api-key"];
  const expectedKey = process.env.BASE44_INTERMEDIARY_KEY;

  if (!receivedKey || receivedKey !== expectedKey) {
    console.warn("Chave inválida ou ausente no header x-base44-api-key");
    return res.status(401).json({ error: "unauthorized", receivedKey });
  }

  // Preparando cert e key para mTLS
  const cert = process.env.CORA_CERTIFICATE;
  const key = process.env.CORA_PRIVATE_KEY;

  if (!cert || !key) {
    return res.status(500).json({ error: "mtls_not_configured" });
  }

  const agent = new https.Agent({
    cert,
    key,
    rejectUnauthorized: true,
  });

  try {
    // Faz a requisição real para a Cora
    const response = await fetch("https://api.stage.cora.com.br/v2/invoices", {
      method: "POST",
      agent,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": req.headers["idempotency-key"] || Date.now().toString(),
        "Authorization": `Bearer ${req.headers["authorization-token"] || ""}` // opcional por enquanto
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!response.ok) {
      console.error("Erro da Cora:", data);
      return res.status(response.status).json({ error: "cora_error", details: data });
    }

    return res.status(201).json(data);

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
