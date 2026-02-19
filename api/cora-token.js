import https from "https";
import { URLSearchParams } from "url";
import crypto from "crypto";

function normalizePem(pem) {
  return pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export default async function handler(req, res) {
  const clientId = "int-3Tm0ksVhvjxPI3JzglU95t";

  const cert = normalizePem(process.env.CORA_CERTIFICATE);
  const key  = normalizePem(process.env.CORA_PRIVATE_KEY);

  const debug = {
    client_id_len: clientId.length,
    cert_len: cert.length,
    cert_sha256: sha256Hex(cert),
    key_len: key.length,
    key_sha256: sha256Hex(key),
  };

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
      res.status(200).json({
        debug,
        cora: {
          status: response.statusCode,
          body
        }
      });
    });
  });

  request.on("error", (err) => {
    res.status(500).json({
      error: err.message,
      debug
    });
  });

  request.write(postData);
  request.end();
}
