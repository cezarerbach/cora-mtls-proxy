import https from 'https';

export default async function handler(req, res) {
    // Validar chave de API
    const apiKey = req.headers['x-base44-api-key'];
    const expectedKey = process.env.BASE44_INTERMEDIARY_KEY;

    if (!apiKey || apiKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const clientId = process.env.CORA_CLIENT_ID;
        const certificate = process.env.CORA_CERTIFICATE;
        const privateKey = process.env.CORA_PRIVATE_KEY;

        if (!clientId || !certificate || !privateKey) {
            return res.status(500).json({ error: 'Missing Cora credentials' });
        }

        // Criar agent com mTLS
        const agent = new https.Agent({
            cert: certificate,
            key: privateKey,
        });

        const response = await fetch('https://matls-clients.api.stage.cora.com.br/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=client_credentials&client_id=${clientId}`,
            agent: agent
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
