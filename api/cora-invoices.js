export default async function handler(req, res) {
  console.log("Requisição recebida no cora-invoices");
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);

  // Apenas retornar para teste sem chamar a Cora
  return res.status(200).json({
    message: "Requisição recebida com sucesso (logado)",
    receivedApiKey: req.headers["x-base44-api-key"] || null,
    body: req.body
  });
}
