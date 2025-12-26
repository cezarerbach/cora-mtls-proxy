import https from "https";

export default async function handler(req, res) {
  console.log("===== Requisição recebida no cora-invoices =====");
  console.log("Método:", req.method);
  console.log("Headers:", req.headers);

  let body = {};
  try {
    body = await req.json();
  } catch (err) {
    console.warn("Erro ao parsear JSON do body:", err.message);
  }
  console.log("Body:", body);

  // Apenas retornar para teste, sem mTLS nem chamada à Cora
  return res.status(200).json({
    message: "Requisição recebida com sucesso (apenas logado)",
    receivedApiKey: req.headers["x-base44-api-key"] || null,
    body: body
  });
}
