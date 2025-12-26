import https from "https";

export default async function handler(req, res) {
  // 1️⃣ Log inicial
  console.log("Requisição recebida no cora-invoices");
  console.log("Método:", req.method);

  // 2️⃣ Validação do header x-base44-api-key
  const receivedApiKey = req.headers["x-base44-api-key"] || null;
  const envApiKey = process.env.BASE44_INTERMEDIARY_KEY || null;

  console.log("x-base44-api-key recebido:", receivedApiKey);
  console.log("BASE44_INTERMEDIARY_KEY do ambiente:", envApiKey);

  if (!receivedApiKey || receivedApiKey !== envApiKey) {
    console.warn("API Key inválida ou ausente");
    return res.status(401).json({ error: "unauthorized" });
  }

  // 3️⃣ Log do Authorization header
  const authHeader = req.headers["authorization"] || null;
  console.log("Authorization header:", authHeader);

  // 4️⃣ Log do payload (JSON)
  let payload;
  try {
    payload = await req.json();
    console.log("Payload recebido:", payload);
  } catch (err) {
    console.error("Erro ao parsear JSON:", err.message);
    return res.status(400).json({ error: "invalid_json", details: err.message });
  }

  // 5️⃣ Resposta temporária de teste
  return res.status(200).json({
    message: "Autenticação OK, logs gravados",
    receivedApiKey,
    authHeader,
    payload,
  });
}
