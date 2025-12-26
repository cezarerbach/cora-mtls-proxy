import { json } from "micro";

export default async function handler(req, res) {
  console.log("=== Requisição recebida no cora-invoices ===");
  console.log("Método:", req.method);
  console.log("Headers:", req.headers);

  let body = {};
  try {
    body = await json(req);
  } catch (err) {
    console.warn("Não foi possível parsear JSON:", err.message);
  }

  console.log("Body recebido:", body);

  // Retorno de teste
  return res.status(200).json({
    message: "Requisição recebida com sucesso (apenas logado)",
    receivedApiKey: req.headers["x-base44-api-key"] || null,
    body,
  });
}
