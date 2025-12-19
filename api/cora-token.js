import https from "https";

export default async function handler(req, res) {
  try {
    const cert = process.env.CORA_CERTIFICATE?.replace(/\\n/g, "\n");
    const key = process.env.CORA_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientId = process.env.CORA_CLIENT_ID;

    if (!cert || !key || !clientId) {
      return res.status(500).json({
        success: false,
        error: "Variáveis de ambiente ausentes"
      });
    }

    const httpsAgent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: true
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId
    }).toString();

    const response = await fetch(
      "https://matls-clients.api.stage.cora.com.br/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body,
        // fetch + mTLS
        agent: httpsAgent
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    return res.status(200).json({
      success: true,
      token: data
    });

  } catch (error) {
    console.error("MTLS ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
