import https from "https";

export default async function handler(req, res) {
  // --- LOGS TEMPORÁRIOS PARA DEPURAÇÃO ---
  console.log("Recebido x-base44-api-key:", req.headers["x-base44-api-key"]);
  console.log("Recebido Authorization:", req.headers["authorization"]);
  console.log("Recebido Idempotency-Key:", req.headers["idempotency-key"]);
  console.log("Payload recebido:", req.body);

  // --- CHECAGEM SIMPLES DO API KEY ---
  const expectedKey = process.env.BASE44_INTERMEDIARY_KEY;
  const receivedKey = req.headers["x-base44-api-key"];
  if (!receivedKey || receivedKey !== expectedKey) {
    return res.status(401).json({
      error: "unauthorized",
      message: "x-base44-api-key inválido ou ausente",
      receivedKey,
      expectedKey
    });
  }

  // --- CHECAGEM BÁSICA DE MTLS (simulação) ---
  if (!process.env.CORA_CERTIFICATE || !process.env.CORA_PRIVATE_KEY) {
    return res.status(500).json({ error: "mtls_not_configured" });
  }

  const cert = process.env.CORA_CERTIFICATE;
  const key = process.env.CORA_PRIVATE_KEY;

  const agent = new https.Agent({ cert, key, rejectUnauthorized: true });

  // --- RETORNO SIMULADO APENAS PARA TESTE ---
  return res.status(200).json({
    message: "Headers e payload recebidos com sucesso",
    headers: req.headers,
    body: req.body
  });
}
