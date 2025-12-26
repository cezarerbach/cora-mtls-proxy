import https from "https";
import { URLSearchParams } from "url";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

export default async function handler(req, res) {
  const clientId = "int-3Tm0ksVhvjxPI3JzglU95t";

  const cert = normalizePem(process.env.CORA_CERTIFICATE);
  const key  = normalizePem(process.env.CORA_PRIVATE_KEY);

  const postData = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
  }).toString();

  const options = {
    hostname: "matls-clients.api.stage.cora.com.br",
    path: "/token",
    method: "POST",
    port: 443,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
    cert,
    key,
    rejectUnauthorized: true,
  };

  const request = https.request(options, (response) => {
    let body = "";

    response.on("data", chunk => body += chunk);
    response.on("end", () => {
      res.status(response.statusCode).send(body);
    });
  });

  request.on("error", (err) => {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  });

  request.write(postData);
  request.end();
}
