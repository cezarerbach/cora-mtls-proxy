import https from "https";
import { URL } from "url";

function normalizePem(pem) {
  console.log("Normalizando PEM...");
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  console.log("=== INÍCIO DA FUNÇÃO ===");
  console.log("Método:", req.method);
  console.log("Headers recebidos:", JSON.stringify(req.headers, null, 2));

  try {
    const BASE44_API_KEY = process.env.BASE44_INTERMEDIARY_KEY;
    const INVOICES_URL = "https://api.stage.cora.com.br/invoices";
    const CERT = process.env.CORA_CERTIFICATE;
    const KEY = process.env.CORA_PRIVATE_KEY;

    console.log("Variáveis de ambiente:");
    console.log("- BASE44_API_KEY:", !!BASE44_API_KEY);
    console.log("- INVOICES_URL:", !!INVOICES_URL);
    console.log("- CERT:", !!CERT);
    console.log("- KEY:", !!KEY);

    if (!BASE44_API_KEY || !INVOICES_URL || !CERT || !KEY) {
      console.error("❌ Variáveis ausentes!");
      return res.status(500).json({ error: "Configuração de ambiente ausente" });
    }

    const receivedKey = req.headers["x-base44-api-key"];
    console.log("Validando chave Base44...");
    if (receivedKey !== BASE44_API_KEY) {
      console.warn("❌ Chave inválida:", receivedKey);
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log("✅ Chave Base44 válida");

    const { accessToken, idempotencyKey, payload } = req.body || {};
    console.log("Body recebido:", { 
      hasAccessToken: !!accessToken, 
      hasIdempotencyKey: !!idempotencyKey, 
      hasPayload: !!payload 
    });

    if (!accessToken || !idempotencyKey || !payload) {
      console.error("❌ Parâmetros ausentes");
      return res.status(400).json({
        error: "Parâmetros ausentes: accessToken, idempotencyKey e payload são obrigatórios.",
      });
    }

    console.log("Payload:", JSON.stringify(payload, null, 2));

    console.log("Criando HTTPS Agent com mTLS...");
    const agent = new https.Agent({
      cert: normalizePem(CERT),
      key: normalizePem(KEY),
      rejectUnauthorized: true,
    });
    console.log("✅ Agent criado com sucesso");

    console.log("Parseando URL:", INVOICES_URL);
    const url = new URL(INVOICES_URL);
    console.log("URL parseada:", {
      hostname: url.hostname,
      port: url.port || 443,
      pathname: url.pathname
    });

    const postData = JSON.stringify(payload);
    console.log("Tamanho do payload:", Buffer.byteLength(postData), "bytes");

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

    console.log("Opções da requisição:", JSON.stringify({
      ...options,
      agent: "HTTPS_AGENT_WITH_MTLS"
    }, null, 2));

    console.log("Iniciando requisição HTTPS...");
    const response = await new Promise((resolve, reject) => {
      const request = https.request(options, (httpRes) => {
        console.log("Resposta recebida. Status:", httpRes.statusCode);
        console.log("Headers da resposta:", JSON.stringify(httpRes.headers, null, 2));
        
        let data = "";

        httpRes.on("data", (chunk) => {
          data += chunk;
          console.log("Chunk recebido:", chunk.length, "bytes");
        });

        httpRes.on("end", () => {
          console.log("Resposta completa. Total:", data.length, "bytes");
          resolve({
            statusCode: httpRes.statusCode,
            headers: httpRes.headers,
            body: data,
          });
        });
      });

      request.on("error", (err) => {
        console.error("❌ Erro na requisição HTTPS:", err.message);
        console.error("Stack:", err.stack);
        reject(err);
      });

      console.log("Escrevendo payload na requisição...");
      request.write(postData);
      console.log("Finalizando requisição...");
      request.end();
    });

    console.log("Promise resolvida. Status final:", response.statusCode);

    let responseBody;
    try {
      responseBody = JSON.parse(response.body);
      console.log("Resposta parseada como JSON");
    } catch (e) {
      console.log("Resposta não é JSON válido");
      responseBody = response.body;
    }

    if (response.statusCode >= 400) {
      console.error("❌ Erro da Cora:", JSON.stringify(responseBody, null, 2));
      return res.status(response.statusCode).json({ error: "cora_error", details: responseBody });
    }

    console.log("✅ Sucesso! Retornando resposta...");
    return res.status(response.statusCode).json(responseBody);

  } catch (err) {
    console.error("❌❌❌ ERRO FATAL ❌❌❌");
    console.error("Mensagem:", err.message);
    console.error("Stack:", err.stack);
    console.error("Nome:", err.name);
    return res.status(500).json({ 
      error: "internal_error", 
      message: err.message,
      stack: err.stack 
    });
  }
}
