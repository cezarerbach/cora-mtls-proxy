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

