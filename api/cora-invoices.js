// api/cora-invoices.js
export default async function handler(req, res) {
  console.log("========== Requisição recebida no cora-invoices ==========");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  // Validação simples do header x-base44-api-key
  const receivedKey = req.headers["x-base44-api-key"];
  const expectedKey = process.env.BASE44_INTERMEDIARY_KEY;

  if (!receivedKey || receivedKey !== expectedKey) {
    console.warn("Chave inválida ou ausente no header x-base44-api-key");
    return res.status(401).json({ error: "unauthorized", receivedKey });
  }

  // Apenas retorna o payload recebido para conferência
  return res.status(200).json({
    message: "Requisição recebida com sucesso (apenas logado)",
    receivedApiKey: receivedKey,
    body: req.body,
  });
}
