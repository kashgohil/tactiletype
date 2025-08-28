import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { OAuthProviderFactory } from './auth/oauth';
import { csrfProtection } from './middleware/csrf';
import analyticsRoutes from './routes/analytics';
import { authRoutes } from './routes/auth';
import { multiplayerRoutes } from './routes/multiplayer';
import { testRoutes } from './routes/tests';
import { userRoutes } from './routes/users';
import { WebSocketHandler } from './websocket/server';

const app = new Hono<{
  Variables: {
    wsHandler: WebSocketHandler;
  };
}>().basePath('/api');

app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3002'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use('*', csrfProtection());

app.get('/', (c) => {
  return c.json({
    message: 'tactiletype API Server',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

OAuthProviderFactory.initialize();

app.use('*', async (c, next) => {
  // WebSocket handler will be available in production setup
  await next();
});

app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/tests', testRoutes);
app.route('/multiplayer', multiplayerRoutes);
app.route('/analytics', analyticsRoutes);

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

const port = process.env.PORT || 3001;

console.log(`tactiletype API Server running on port ${port}`);
console.log(`WebSocket server will be available at ws://localhost:${port}/ws`);

export default {
  port,
  fetch: app.fetch,
  websocket: {
    message(ws: any, message: any) {
      // Handle WebSocket messages here
      console.log('WebSocket message received:', message);
    },
    open(ws: any) {
      console.log('WebSocket connection opened');
    },
    close(ws: any) {
      console.log('WebSocket connection closed');
    },
  },
};
