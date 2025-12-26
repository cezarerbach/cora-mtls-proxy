export default async function handler(req, res) {
    try {
        // Validar autenticação
        const apiKey = req.headers['x-base44-api-key'];
        if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Função para normalizar PEM
        function normalizePem(pem) {
            return pem
                .replace(/\\n/g, '\n')
                .replace(/-----BEGIN [A-Z\s]+-----\s*/g, (match) => match.trim() + '\n')
                .replace(/\s*-----END [A-Z\s]+-----/g, (match) => '\n' + match.trim());
        }

        // Obter certificados das variáveis de ambiente
        const cert = normalizePem(process.env.CORA_CERTIFICATE);
        const key = normalizePem(process.env.CORA_PRIVATE_KEY);

        const https = await import('https');
        const fetch = (await import('node-fetch')).default;

        const agent = new https.Agent({
            cert: cert,
            key: key,
            rejectUnauthorized: false
        });

        // Fazer requisição para Cora
        const coraResponse = await fetch('https://matls-stage.cora.com.br/invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization,
                'Idempotency-Key': req.headers['idempotency-key']
            },
            body: JSON.stringify(req.body),
            agent: agent
        });

        const data = await coraResponse.json();

        return res.status(coraResponse.status).json(data);

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
}
