import https from "https";
import axios from "axios";

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

    const httpsAgent = new https.Agent({
      cert: CORA_CERTIFICATE,
      key: CORA_PRIVATE_KEY,
    });

    const response = await axios.post(
      "https://matls-clients.api.stage.cora.com.br/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CORA_CLIENT_ID,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        httpsAgent,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      return res
        .status(error.response.status)
        .json(error.response.data);
    }

    return res.status(500).json({ error: "Unexpected error" });
  }
}
