import https from "https";
import { URL } from "url";

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
    console.error("Variáveis ausentes:", { BASE44_API_KEY: !!BASE44_API_KEY, INVOICES_URL: !!INVOICES_URL, CERT: !!CERT, KEY: !!KEY });
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
    const url = new URL(INVOICES_URL);
    const postData = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "Authorization": `Bearer ${accessToken}`,
        "Idempotency-Key": idempotencyKey,
      },
      agent: agent,
    };

    const response = await new Promise((resolve, reject) => {
      const request = https.request(options, (httpRes) => {
        let data = "";

        httpRes.on("data", (chunk) => {
          data += chunk;
        });

        httpRes.on("end", () => {
          resolve({
            statusCode: httpRes.statusCode,
            headers: httpRes.headers,
            body: data,
          });
        });
      });

      request.on("error", (err) => {
        reject(err);
      });

      request.write(postData);
      request.end();
    });

    let responseBody;
    try {
      responseBody = JSON.parse(response.body);
    } catch {
      responseBody = response.body;
    }

    if (response.statusCode >= 400) {
      console.error("Erro da Cora:", responseBody);
      return res.status(response.statusCode).json({ error: "cora_error", details: responseBody });
    }

    console.log("Resposta da Cora recebida:", responseBody);
    return res.status(response.statusCode).json(responseBody);

  } catch (err) {
    console.error("Erro interno:", err);
    return res.status(500).json({ error: "internal_error", message: err.message });
  }
}
