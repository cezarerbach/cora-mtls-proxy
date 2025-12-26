import https from "https";

export default async function handler(req, res) {
  try {
    // ⚠️ CLIENT_ID FIXO PARA TESTE
    const CLIENT_ID = "int-3Tm0ksVhvjxPI3JzglU95t";

    const { CORA_CERTIFICATE, CORA_PRIVATE_KEY } = process.env;

    if (!CORA_CERTIFICATE || !CORA_PRIVATE_KEY) {
      console.error("ENV CHECK FAILED", {
        hasCert: !!CORA_CERTIFICATE,
        hasKey: !!CORA_PRIVATE_KEY,
      });

      return res.status(500).json({
        error: "Missing certificate or private key",
      });
    }

    const agent = new https.Agent({
      cert: CORA_CERTIFICATE,
      key: CORA_PRIVATE_KEY,
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

    console.info("CORA RESPONSE STATUS", response.status);
    console.info("CORA RESPONSE BODY", data);

    return res.status(response.status).json(data);
  } catch (err) {
    console.error("CORA TOKEN ERROR", err);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
