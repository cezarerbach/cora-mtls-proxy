export default async function handler(req, res) {
    try {
        console.log('=== DEBUG START ===');
        console.log('Request method:', req.method);
        console.log('All headers:', JSON.stringify(req.headers, null, 2));
        console.log('x-base44-api-key header:', req.headers['x-base44-api-key']);
        console.log('BASE44_INTERMEDIARY_KEY env:', process.env.BASE44_INTERMEDIARY_KEY);
        console.log('Keys match:', req.headers['x-base44-api-key'] === process.env.BASE44_INTERMEDIARY_KEY);
        
        // Validar autenticação
        const apiKey = req.headers['x-base44-api-key'];
        if (!apiKey || apiKey !== process.env.BASE44_INTERMEDIARY_KEY) {
            console.error('UNAUTHORIZED: apiKey present?', !!apiKey, 'env key present?', !!process.env.BASE44_INTERMEDIARY_KEY);
            return res.status(401).json({ 
                error: 'Unauthorized',
                debug: {
                    hasHeaderKey: !!apiKey,
                    hasEnvKey: !!process.env.BASE44_INTERMEDIARY_KEY,
                    headerKeyLength: apiKey?.length,
                    envKeyLength: process.env.BASE44_INTERMEDIARY_KEY?.length
                }
            });
        }

        console.log('Auth passed, proceeding...');

        // Função para normalizar PEM
        function normalizePem(pem) {
            return pem
                .replace(/\\n/g, '\n')
                .replace(/-----BEGIN [A-Z\s]+-----\s*/g, (match) => match.trim() + '\n')
                .replace(/\s*-----END [A-Z\s]+-----/g, (match) => '\n' + match.trim());
        }

        // Obter certificados das variáveis de ambiente
        console.log('Loading certificates...');
        const cert = normalizePem(process.env.CORA_CERTIFICATE);
        const key = normalizePem(process.env.CORA_PRIVATE_KEY);
        console.log('Cert length:', cert?.length, 'Key length:', key?.length);

        const https = await import('https');
        const fetch = (await import('node-fetch')).default;

        const agent = new https.Agent({
            cert: cert,
            key: key,
            rejectUnauthorized: false
        });

        console.log('Calling Cora API...');
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

        console.log('Cora response status:', coraResponse.status);
        const data = await coraResponse.json();
        console.log('Cora response data:', JSON.stringify(data, null, 2));

        return res.status(coraResponse.status).json(data);

    } catch (error) {
        console.error('=== ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
}
