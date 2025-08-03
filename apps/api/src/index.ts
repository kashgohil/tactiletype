import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authRoutes } from './routes/auth';
import { testRoutes } from './routes/tests';
import { userRoutes } from './routes/users';
import { multiplayerRoutes } from './routes/multiplayer';
import analyticsRoutes from './routes/analytics';
import { WebSocketHandler } from './websocket/server';

const app = new Hono<{
  Variables: {
    wsHandler: WebSocketHandler;
  };
}>();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Tactile API Server',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Middleware to provide WebSocket handler to routes (will be set up later)
app.use('*', async (c, next) => {
  // WebSocket handler will be available in production setup
  await next();
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/tests', testRoutes);
app.route('/api/multiplayer', multiplayerRoutes);
app.route('/api/analytics', analyticsRoutes);

// Error handling
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

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

const port = process.env.PORT || 3001;

console.log(`🚀 Tactile API Server running on port ${port}`);
console.log(`📡 WebSocket server will be available at ws://localhost:${port}/ws`);

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
