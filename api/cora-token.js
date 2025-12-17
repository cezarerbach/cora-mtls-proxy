const https = require('https');
const querystring = require('querystring');

module.exports = async (req, res) => {
  try {
    // 1. Validar API Key
    const apiKey = req.headers['x-base44-api-key'];
    const expectedKey = process.env.BASE44_INTERMEDIARY_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
    }

    // 2. Obter credenciais da Cora
    const clientId = process.env.CORA_CLIENT_ID;
    const certificate = process.env.CORA_CERTIFICATE;
    const privateKey = process.env.CORA_PRIVATE_KEY;

    if (!clientId || !certificate || !privateKey) {
      return res.status(500).json({ error: 'Missing Cora credentials' });
    }

    const tokenUrl = 'https://matls-clients.api.stage.cora.com.br/token';
    
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: clientId
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData.toString())
      },
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

      request.on('error', (e) => reject(e));
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
