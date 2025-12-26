import https from "https";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  console.log("Requisição recebida no cora-invoices");

  // Verifica se o body existe
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "empty_body" });
  }

  // Certificado mTLS
  if (!process.env.CORA_CERTIFICATE || !process.env.CORA_PRIVATE_KEY) {
    return res.status(500).json({ error: "mtls_not_configured" });
  }

  const cert = normalizePem(process.env.CORA_CERTIFICATE);
  const key = normalizePem(process.env.CORA_PRIVATE_KEY);

  // Authorization header temporário (vai substituir depois)
  const authHeader = req.headers["authorization"] || "Bearer TESTE_TOKEN";

  const idempotencyKey = req.headers["idempotency-key"] || crypto.randomUUID();

  const options = {
    hostname: "api.stage.cora.com.br",
    port: 443,
    path: "/v2/invoices",
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    cert,
    key,
    rejectUnauthorized: true,
  };

  const request = https.request(options, (response) => {
    let body = "";

    response.on("data", (chunk) => (body += chunk));
    response.on("end", () => {
      let responseBody;
      try {
        responseBody = JSON.parse(body);
      } catch {
        responseBody = body;
      }

      if (!response.ok && response.statusCode >= 400) {
        console.warn("Cora retornou erro:", responseBody);
        return res.status(response.statusCode).json({
          error: "cora_error",
          details: responseBody,
        });
      }

      res.status(201).json(responseBody);
    });
  });

  request.on("error", (err) => {
    console.error("Erro interno:", err);
    res.status(500).json({
      error: "internal_error",
      message: err.message,
    });
  });

  request.write(JSON.stringify(req.body));
  request.end();
}
