import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: true, message: 'Method Not Allowed' }));
    return;
  }

  const apiKey = process.env.VITE_OPENROUTER_API_KEY;
  const model = process.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';
  
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    hasApiKey: !!(apiKey && apiKey.trim() !== ''),
    model: model,
  }));
}
