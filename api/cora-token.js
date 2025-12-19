import https from "https";
import axios from "axios";

/**
 * Gera token OAuth2 via mTLS (Vercel)
 */
export default async function handler(req, res) {
  try {
    if (
      !process.env.CORA_CERTIFICATE ||
      !process.env.CORA_PRIVATE_KEY ||
      !process.env.CORA_CLIENT_ID
    ) {
      return res.status(500).json({
        success: false,
        error: "Variáveis de ambiente não configuradas"
      });
    }

    const httpsAgent = new https.Agent({
      cert: process.env.CORA_CERTIFICATE.replace(/\\n/g, "\n"),
      key: process.env.CORA_PRIVATE_KEY.replace(/\\n/g, "\n"),
      rejectUnauthorized: true
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.CORA_CLIENT_ID
    }).toString();

    const response = await axios.post(
      "https://matls-clients.api.stage.cora.com.br/token",
      body,
      {
        httpsAgent,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        },
        timeout: 10000
      }
    );

    return res.status(200).json({
      success: true,
      token: response.data
    });

  } catch (error) {
    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || {
        message: error.message
      }
    });
  }
}
