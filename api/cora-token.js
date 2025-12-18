import https from 'https';

export default async function handler(req, res) {
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
        
        // Decodificar certificados de Base64
        const certificate = Buffer.from(process.env.CORA_CERTIFICATE_BASE64, 'base64').toString('utf8');
        const privateKey = Buffer.from(process.env.CORA_PRIVATE_KEY_BASE64, 'base64').toString('utf8');

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

        const responseText = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({ error: responseText });
        }

        return res.status(200).json(JSON.parse(responseText));

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
