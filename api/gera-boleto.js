import https from 'https';

export default async function handler(req, res) {
    // Validar API key
    const apiKey = req.headers['x-base44-api-key'];
    if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const boletoData = req.body;
        const accessToken = req.headers['authorization']?.replace('Bearer ', '');
        const idempotencyKey = req.headers['idempotency-key'];

        // Usar certificados diretamente
        const certificate = process.env.CORA_CERTIFICATE;
        const privateKey = process.env.CORA_PRIVATE_KEY;

        const httpsAgent = new https.Agent({
            cert: certificate,
            key: privateKey,
            rejectUnauthorized: true
        });

        // Usar fetch global (Node.js 18+) ou nativo
        const response = await fetch('https://matls-clients.api.stage.cora.com.br/v2/invoices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify(boletoData),
            agent: httpsAgent
        });

        const responseData = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(responseData);
        }

        return res.status(200).json(responseData);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
