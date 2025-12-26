import https from 'https';

/**
 * Normaliza PEM vindo de env var
 */
function normalizePem(pem) {
    if (!pem) return null;
    return pem.replace(/\\n/g, '\n').trim();
}

export default async function handler(req, res) {
    /**
     * ===============================
     * CORS / PREFLIGHT
     * ===============================
     */
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Idempotency-Key, x-base44-api-key'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'POST, OPTIONS'
    );

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    /**
     * ===============================
     * METHOD VALIDATION
     * ===============================
     */
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    /**
     * ===============================
     * INTERMEDIARY AUTH (Base44)
     * ===============================
     */
    const apiKey =
        req.headers['x-base44-api-key'] ||
        req.headers['x-base44-api-key'.toLowerCase()];

    if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    /**
     * ===============================
     * AUTHORIZATION TOKEN
     * ===============================
     */
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const accessToken = authHeader.replace('Bearer ', '').trim();
    const idempotencyKey = req.headers['idempotency-key'];

    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Missing Idempotency-Key header' });
    }

    /**
     * ===============================
     * CERTIFICATES (mTLS)
     * ===============================
     */
    const certificate = normalizePem(process.env.CORA_CERTIFICATE);
    const privateKey = normalizePem(process.env.CORA_PRIVATE_KEY);

    if (!certificate || !privateKey) {
        return res.status(500).json({
            error: 'mTLS certificate or private key not configured'
        });
    }

    const httpsAgent = new https.Agent({
        cert: certificate,
        key: privateKey,
        rejectUnauthorized: true
    });

    /**
     * ===============================
     * REQUEST BODY
     * ===============================
     */
    let boletoData;
    try {
        boletoData = req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    /**
     * ===============================
     * CALL CORA API
     * ===============================
     */
    try {
        const coraResponse = await fetch(
            'https://matls-clients.api.stage.cora.com.br/v2/invoices',
            {
                method: 'POST',
                agent: httpsAgent,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify(boletoData)
            }
        );

        const responseText = await coraResponse.text();
        let responseJson;

        try {
            responseJson = JSON.parse(responseText);
        } catch {
            responseJson = { raw: responseText };
        }

        if (!coraResponse.ok) {
            return res.status(coraResponse.status).json({
                error: 'Cora API error',
                details: responseJson
            });
        }

        return res.status(200).json(responseJson);

    } catch (err) {
        return res.status(500).json({
            error: 'Internal proxy error',
            message: err.message
        });
    }
}
