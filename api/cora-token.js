import https from "https";
import { URLSearchParams } from "url";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  try {
    const clientId = "int-3Tm0ksVhvjxPI3JzglU95t";

    const cert = normalizePem(process.env.CORA_CERTIFICATE);
    const key  = normalizePem(process.env.CORA_PRIVATE_KEY);

    const agent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: true,
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
    }).toString();

    const response = await fetch(
      "https://matls-clients.api.stage.cora.com.br/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        agent,
      }
    );

    const data = await response.text();

    res.status(response.status).send(data);
  } catch (err) {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
}
