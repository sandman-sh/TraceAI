import type { IncomingMessage, ServerResponse } from 'http';
import { createApiMiddleware } from '../server/api';

const middleware = createApiMiddleware(process.env);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  return new Promise<void>((resolve) => {
    middleware(req, res, () => {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: true, message: 'Not Found' }));
      resolve();
    });
  });
}
