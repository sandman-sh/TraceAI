import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: true, message: 'Method Not Allowed' }));
    return;
  }

  try {
    const apiKey = process.env.VITE_OPENROUTER_API_KEY;
    const defaultModel = process.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';

    if (!apiKey || apiKey.trim() === '') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: true,
        message: 'OpenRouter API key is not configured. Please set VITE_OPENROUTER_API_KEY in your environment.'
      }));
      return;
    }

    // On Vercel, req.body is already parsed (as an object) or passed as a string
    let messages: any, model: any;
    if (req.body) {
      const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      messages = parsed.messages;
      model = parsed.model;
    } else {
      // Fallback: read body stream if for some reason it's not pre-parsed
      let body = '';
      for await (const chunk of req as any) {
        body += chunk;
      }
      const parsed = JSON.parse(body);
      messages = parsed.messages;
      model = parsed.model;
    }

    // Forward to OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'TraceAI'
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.statusCode = response.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: true,
        message: `OpenRouter API error: ${response.statusText}`,
        details: errorText
      }));
      return;
    }

    const data = await response.json();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));

  } catch (error) {
    console.error('[TraceAI Vercel API] Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: true,
      message: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }));
  }
}
