import fs from "fs";
import https from "https";
import axios from "axios";

export async function gerarToken() {
  try {
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync("/d:/cert_key-cora/certificate.pem"),
      key: fs.readFileSync("/d:/cert_key-cora/private-key.key"),
      rejectUnauthorized: true
    });

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "int-3Tm0ksVhvjxPI3JzglU95t"
    }).toString();

    const response = await axios.post(
      "https://matls-clients.api.stage.cora.com.br/token",
      body,
      {
        httpsAgent,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json"
        }
      }
    );

    return {
      success: true,
      status: response.status,
      data: response.data
    };

  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    };
  }
}
