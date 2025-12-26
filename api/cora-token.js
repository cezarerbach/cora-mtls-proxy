import https from "https";

export default async function handler(req, res) {
  try {
    const {
      CORA_CERTIFICATE,
      CORA_PRIVATE_KEY,
      CORA_CLIENT_ID,
    } = process.env;

    if (!CORA_CERTIFICATE || !CORA_PRIVATE_KEY || !CORA_CLIENT_ID) {
      return res.status(500).json({ error: "Missing env vars" });
    }

    const agent = new https.Agent({
      cert: CORA_CERTIFICATE,
      key: CORA_PRIVATE_KEY,
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CORA_CLIENT_ID,
    });

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

    return res.status(response.status).json(data);
  } catch (err) {
    console.error("CORA TOKEN ERROR", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
