import https from 'https';
import crypto from 'crypto';

/* ================================
 * Helpers
 * ================================ */

function normalizePem(pem) {
    if (!pem) return null;
    return pem.replace(/\\n/g, '\n').trim();
}

function nowIso() {
    return new Date().toISOString();
}

function hash(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

/* ================================
 * Security config
 * ================================ */

// 🔒 URL whitelist
const ALLOWED_HOSTS = [
    'matls-clients.api.stage.cora.com.br',
    'matls-clients.api.cora.com.br'
];

// 🧱 Simple in-memory rate limit (adequado para proxy bancário)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateLimitStore = new Map();

/* ================================
 * Rate limit
 * ================================ */

function checkRateLimit(key) {
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, start: now };

    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
        entry.count = 0;
        entry.start = now;
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    return entry.count <= RATE_LIMIT_MAX;
}

/* ================================
 * Contract validation
 * ================================ */

function validateRequest(payload) {
    if (!payload || typeof payload !== 'object') {
        return 'Invalid JSON body';
    }

    const { url, method } = payload;

    if (!url || typeof url !== 'string') {
        return 'Missing or invalid url';
    }

    if (!method || typeof method !== 'string') {
        return 'Missing or invalid method';
    }

    return null;
}

function validateUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return 'Invalid URL format';
    }

    if (parsed.protocol !== 'https:') {
        return 'Only HTTPS is allowed';
    }

    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
        return `Host not allowed: ${parsed.hostname}`;
    }

    return null;
}

/* ================================
 * Handler
 * ================================ */

export default async function handler(req, res) {
    /* -------- CORS -------- */
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Idempotency-Key, x-base44-api-key'
    );
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    /* -------- Auth -------- */
    const intermediaryKey = req.headers['x-base44-api-key'];
    if (!intermediaryKey || intermediaryKey !== process.env.BASE44_INTERMEDIARY_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    /* -------- Rate limit -------- */
    const rateKey = hash(intermediaryKey);
    if (!checkRateLimit(rateKey)) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    /* -------- Validation -------- */
    const payload = req.body;
    const contractError = validateRequest(payload);
    if (contractError) {
        return res.status(400).json({ error: contractError });
    }

    const { url, method, headers, body } = payload;

    const urlError = validateUrl(url);
    if (urlError) {
        return res.status(403).json({ error: urlError });
    }

    /* -------- mTLS material -------- */
    const cert = normalizePem(process.env.CORA_CERTIFICATE);
    const key = normalizePem(process.env.CORA_PRIVATE_KEY);

    if (!cert || !key) {
        return res.status(500).json({
            error: 'mTLS certificates not configured'
        });
    }

    const agent = new https.Agent({
        cert,
        key,
        rejectUnauthorized: true
    });

    /* -------- Logging (bank-safe) -------- */
    const correlationId = crypto.randomUUID();
    console.log(JSON.stringify({
        type: 'cora_mtls_request',
        correlationId,
        at: nowIso(),
        targetHost: new URL(url).hostname,
        method,
        hasBody: !!body,
        headersSent: Object.keys(headers || {}),
    }));

    /* -------- Execute -------- */
    try {
        const response = await fetch(url, {
            method,
            agent,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            timeout: 30_000
        });

        const text = await response.text();
        let responseBody;
        try {
            responseBody = JSON.parse(text);
        } catch {
            responseBody = { raw: text };
        }

        console.log(JSON.stringify({
            type: 'cora_mtls_response',
            correlationId,
            at: nowIso(),
            status: response.status
        }));

        return res.status(response.status).json(responseBody);

    } catch (err) {
        console.error(JSON.stringify({
            type: 'cora_mtls_error',
            correlationId,
            at: nowIso(),
            message: err.message
        }));

        return res.status(500).json({
            error: 'mTLS proxy error',
            correlationId
        });
    }
}

