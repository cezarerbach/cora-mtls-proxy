// api/cora-token.js

import https from 'https';
import { URLSearchParams } from 'url';

// A função exportada será o handler da sua função serverless do Vercel
export default async (req, res) => {
  // 1. Validação de segurança (opcional, mas altamente recomendado)
  // Use um secret que apenas seu backend Base44 conhecerá
  const BASE44_INTERMEDIARY_KEY = process.env.BASE44_INTERMEDIARY_KEY;
  const requestApiKey = req.headers['x-base44-api-key'];

  if (!BASE44_INTERMEDIARY_KEY || requestApiKey !== BASE44_INTERMEDIARY_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }

  // 2. Carregar Credenciais da Cora (do ambiente do Vercel)
  const clientId = process.env.CORA_CLIENT_ID;
  const certificate = process.env.CORA_CERTIFICATE;
  const privateKey = process.env.CORA_PRIVATE_KEY;

  if (!clientId || !certificate || !privateKey) {
    return res.status(500).json({ error: 'Cora credentials (CLIENT_ID, CERTIFICATE, PRIVATE_KEY) not configured on Vercel.' });
  }

  try {
    const tokenUrl = new URL("https://matls-auth.api.stage.cora.com.br/token");
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData.toString())
      },
      // Configurações mTLS
      cert: certificate,
      key: privateKey,
    };
      // 3. Fazer a requisição mTLS para a Cora
    const coraResponse = await new Promise((resolve, reject) => {
      const request = https.request(tokenUrl, options, (coraRes) => {
        let data = '';
        coraRes.on('data', (chunk) => data += chunk);
        coraRes.on('end', () => {
          try {
            resolve({ statusCode: coraRes.statusCode, data: JSON.parse(data) });
          } catch (e) {
            reject(new Error(`Failed to parse Cora response: ${data}`));
          }
        });
      });

      request.on('error', (e) => reject(e)); // Lidar com erros de rede ou SSL/TLS

      request.write(postData.toString());
      request.end();
    });
     // 4. Retornar a resposta da Cora
    if (coraResponse.statusCode !== 200) {
      console.error('Error from Cora API:', coraResponse.data);
      return res.status(coraResponse.statusCode).json({
        error: 'Failed to get token from Cora API.',
        details: coraResponse.data
      });
    }

    res.status(200).json(coraResponse.data);

  } catch (error) {
    console.error('Vercel Function Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
};
    
