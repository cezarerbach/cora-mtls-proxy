console.log("DEBUG PARAMS", {
  clientId: process.env.CORA_CLIENT_ID,
  grantType: "client_credentials",
  certStartsOk: cert.startsWith("-----BEGIN CERTIFICATE-----"),
  certEndsOk: cert.trim().endsWith("-----END CERTIFICATE-----"),
  keyStartsOk: key.startsWith("-----BEGIN PRIVATE KEY-----"),
  keyEndsOk: key.trim().endsWith("-----END PRIVATE KEY-----"),
  certLength: cert.length,
  keyLength: key.length
});
