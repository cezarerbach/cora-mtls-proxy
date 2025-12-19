import https from "https";
import fs from "fs";

const agent = new https.Agent({
  cert: fs.readFileSync("/D:/cert_key_cora/certificate.pem"),
  key: fs.readFileSync("/D:/cert_key_cora/private-key.key"),
  rejectUnauthorized: true
});

const body = new URLSearchParams({
  grant_type: "client_credentials",
  client_id: "int-3Tm0ksVhvjxPI3JzglU95t"
});

const response = await fetch(
  "https://matls-clients.api.stage.cora.com.br/token",
  {
    method: "POST",
    agent,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  }
);

const result = await response.json();
console.log(result);
