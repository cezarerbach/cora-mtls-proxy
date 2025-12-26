export default async function handler(req, res) {
    // API key interna
    const apiKey = req.headers['x-base44-api-key'];
    if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const boletoData = req.body;

        const authHeader = req.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing Bearer token' });
        }

        const accessToken = authHeader.replace('Bearer ', '');
        const idempotencyKey = req.headers['idempotency-key'];

        if (!idempotencyKey) {
            return res.status(400).json({ error: 'Missing Idempotency-Key' });
        }

        const response = await fetch(
            'https://api.stage.cora.com.br/v2/invoices',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify(boletoData)
            }
        );

        const responseData = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(responseData);
        }

        return res.status(201).json(responseData);

    } catch (error) {
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
