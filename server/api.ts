import type { IncomingMessage, ServerResponse } from 'http';

/**
 * TraceAI Backend API Proxy (TypeScript)
 * 
 * This middleware handles OpenRouter API calls server-side
 * so the API key never leaves the backend environment.
 */

export function createApiMiddleware(env: Record<string, string | undefined> = process.env) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    // Only handle POST /api/chat
    if (req.method === 'POST' && req.url === '/api/chat') {
      try {
        // Read the API key from environment
        const apiKey = env.VITE_OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
        const defaultModel = env.VITE_OPENROUTER_MODEL || process.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';

        if (!apiKey || apiKey.trim() === '') {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: true,
            message: 'OpenRouter API key is not configured. Please set VITE_OPENROUTER_API_KEY in your .env file.'
          }));
          return;
        }

        // Collect request body
        let messages: any, model: any;
        if ((req as any).body) {
          const parsed = typeof (req as any).body === 'string' ? JSON.parse((req as any).body) : (req as any).body;
          messages = parsed.messages;
          model = parsed.model;
        } else {
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
        console.error('[TraceAI API Proxy] Error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: true,
          message: 'Internal proxy error: ' + (error instanceof Error ? error.message : String(error))
        }));
      }
      return;
    }

    // Check API key status
    if (req.method === 'GET' && req.url === '/api/config/status') {
      const apiKey = env.VITE_OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;
      const model = env.VITE_OPENROUTER_MODEL || process.env.VITE_OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        hasApiKey: !!(apiKey && apiKey.trim() !== ''),
        model: model,
      }));
      return;
    }

    next();
  };
}
