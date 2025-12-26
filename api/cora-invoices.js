import https from "https";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  // Apenas log para ver se a requisição chegou
  console.log("Requisição recebida no cora-invoices");

  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    console.warn("Authorization header ausente");
  }

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

  try {
    const response = await fetch(
      "https://api.stage.cora.com.br/v2/invoices",
      {
        method: "POST",
        agent,
        headers: {
          "Authorization": authHeader || "",
          "Content-Type": "application/json",
          "Idempotency-Key": req.headers["idempotency-key"] || "test-key",
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
