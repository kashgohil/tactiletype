import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { OAuthProviderFactory } from './auth/oauth';
import { FRONTEND_URL, PORT } from './constants';
import { csrfProtection } from './middleware/csrf';
import analyticsRoutes from './routes/analytics';
import { authRoutes } from './routes/auth';
import { challengeRoutes } from './routes/challenges';
import { multiplayerRoutes } from './routes/multiplayer';
import { testRoutes } from './routes/tests';
import { userRoutes } from './routes/users';
import { multiplayerHub } from './websocket/hub';

const app = new Hono().basePath('/api');

app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: [FRONTEND_URL],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use('*', csrfProtection());

// Inject multiplayer hub for HTTP routes that create/list rooms
app.use('/multiplayer/*', async (c, next) => {
  c.set('wsHandler' as never, multiplayerHub as never);
  await next();
});

app.get('/', (c) => {
  return c.json({
    message: 'tactiletype API Server',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

OAuthProviderFactory.initialize();

app.route('/', authRoutes);
app.route('/users', userRoutes);
app.route('/tests', testRoutes);
app.route('/multiplayer', multiplayerRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/challenges', challengeRoutes);

app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = Number(PORT) || 3021;

console.log(`tactiletype API Server running on port ${port}`);
console.log(`WebSocket available at ws://localhost:${port}/ws`);

let connectionSeq = 0;

export default {
  port,
  async fetch(
    req: Request,
    server: { upgrade: (req: Request, opts?: { data?: unknown }) => boolean }
  ) {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req, {
        data: { connectionId: `conn_${Date.now()}_${++connectionSeq}` },
      });
      if (upgraded) return undefined as unknown as Response;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws: { data: { connectionId: string }; send: (d: string) => void }) {
      const id = ws.data.connectionId;
      multiplayerHub.onOpen(id, ws);
    },
    async message(ws: { data: { connectionId: string } }, message: string | Buffer) {
      await multiplayerHub.onMessage(ws.data.connectionId, message);
    },
    close(ws: { data: { connectionId: string } }) {
      multiplayerHub.onClose(ws.data.connectionId);
    },
  },
};
