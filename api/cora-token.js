import https from "https";

export default async function handler(req, res) {
  try {
    // ==========================
    // Leitura das variáveis
    // ==========================
    const cert = process.env.CORA_CERTIFICATE?.replace(/\\n/g, "\n");
    const key = process.env.CORA_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientId = process.env.CORA_CLIENT_ID;

    // ==========================
    // Validação do certificado
    // ==========================
    const certStartsOk = cert?.startsWith("-----BEGIN CERTIFICATE-----");
    const certEndsOk = cert?.trim().endsWith("-----END CERTIFICATE-----");

    // ==========================
    // Validação da chave privada
    // ==========================
    const keyStartsOk =
      key?.startsWith("-----BEGIN RSA PRIVATE KEY-----") ||
      key?.startsWith("-----BEGIN PRIVATE KEY-----");

    const keyEndsOk =
      key?.trim().endsWith("-----END RSA PRIVATE KEY-----") ||
      key?.trim().endsWith("-----END PRIVATE KEY-----");

    // ==========================
    // DEBUG SEGURO
    // ==========================
    console.log("CORA FINAL VALIDATION", {
      clientIdPresent: !!clientId,
      certStartsOk,
      certEndsOk,
      keyStartsOk,
      keyEndsOk,
      certFirstLine: cert?.split("\n")[0] || null,
      certLastLine: cert?.trim().split("\n").slice(-1)[0] || null,
      keyFirstLine: key?.split("\n")[0] || null,
      keyLastLine: key?.trim().split("\n").slice(-1)[0] || null,
      certLength: cert?.length || 0,
      keyLength: key?.length || 0,
      nodeVersion: process.version
    });

    // ==========================
    // Interrompe se inválido
    // ==========================
    if (!clientId) {
      throw new Error("CORA_CLIENT_ID não configurado");
    }

    if (!certStartsOk || !certEndsOk) {
      throw new Error("Certificado PEM inválido ou mal formatado");
    }

    if (!keyStartsOk || !keyEndsOk) {
      throw new Error("Chave privada RSA inválida ou mal formatada");
    }

    // ==========================
    // Cria o agente mTLS
    // ==========================
    const httpsAgent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: true
    });

    // ==========================
    // Monta o body OAuth2
    // ==========================
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId
    }).toString();

    // ==========================
    // Chamada à Cora
    // ==========================
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
      console.log("CORA RESPONSE ERROR", data);

      return res.status(response.status).json({
        success: false,
        error: data
      });
    }

    // ==========================
    // Sucesso
    // ==========================
    return res.status(200).json({
      success: true,
      token: data
    });

  } catch (error) {
    console.error("CORA TOKEN ERROR", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
