import https from "https";

export default async function handler(req, res) {
  try {
    const cert = process.env.CORA_CERTIFICATE?.replace(/\\n/g, "\n");
    const key = process.env.CORA_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientId = process.env.CORA_CLIENT_ID;

    // ==========================
    // DEBUG SEGURO – PASSO 2
    // ==========================
    console.log("CORA DEBUG", {
      clientIdPresent: !!clientId,
      clientIdValue: clientId || null, // seguro
      certStartsOk: cert?.startsWith("-----BEGIN CERTIFICATE-----") || false,
      certEndsOk: cert?.trim().endsWith("-----END CERTIFICATE-----") || false,
      keyStartsOk: key?.startsWith("-----BEGIN PRIVATE KEY-----") || false,
      keyEndsOk: key?.trim().endsWith("-----END PRIVATE KEY-----") || false,
      certLength: cert?.length || 0,
      keyLength: key?.length || 0,
      nodeVersion: process.version
    });

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

    const bodyObj = {
      grant_type: "client_credentials",
      client_id: clientId
    };

    console.log("BODY ENVIADO", bodyObj);

    const body = new URLSearchParams(bodyObj).toString();

    const response = await fetch(
      "https://matls-clients.api.stage.cora.com.br/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        body,
        agent: httpsAgent
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.log("CORA ERROR RESPONSE", data);

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
    console.error("MTLS EXCEPTION", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
