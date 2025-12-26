import https from "https";

export default async function handler(req, res) {
  try {
    // 🔴 client_id HARDCODED PARA TESTE
    const CLIENT_ID = "int-3Tm0ksVhvjxPI3JzglU95t";

    const CERT = process.env.CORA_CERTIFICATE;
    const KEY = process.env.CORA_PRIVATE_KEY;

    if (!CERT || !KEY) {
      return res.status(500).json({
        error: "Missing certificate or private key",
        certPresent: !!CERT,
        keyPresent: !!KEY,
      });
    }

    // 🔍 Logs seguros (não expõem segredo)
    console.log("CORA DEBUG", {
      clientId: CLIENT_ID,
      certStarts: CERT.split("\n")[0],
      certEnds: CERT.split("\n").slice(-1)[0],
      keyStarts: KEY.split("\n")[0],
      keyEnds: KEY.split("\n").slice(-1)[0],
      certLength: CERT.length,
      keyLength: KEY.length,
      nodeVersion: process.version,
    });

    const agent = new https.Agent({
      cert: CERT,
      key: KEY,
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
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

    const data = await response.json();

    return res.status(response.status).json({
      success: response.ok,
      data,
    });
  } catch (err) {
    console.error("CORA TOKEN ERROR", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
