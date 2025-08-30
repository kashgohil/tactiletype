# Tactile - Advanced Typing Test Platform

A modern, full-featured typing test platform built with React, Hono, and PostgreSQL. Compete in real-time multiplayer races, track your progress with detailed analytics, and climb the leaderboards!

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Hono.js + TypeScript + Bun runtime
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSockets for multiplayer features
- **Authentication**: JWT with OAuth support (Google, GitHub)
- **State Management**: Zustand + React Query

### Project Structure
```
tactile/
├── apps/
│   ├── web/                 # React frontend application
│   └── api/                 # Hono backend API server
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── database/            # Drizzle ORM schema & utilities
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Shared utility functions
└── docs/                    # Documentation
```

## 🚀 Features

### Phase 1 (Current Implementation)
- ✅ **User Authentication** - JWT-based auth with registration/login
- ✅ **Database Schema** - Complete schema for users, tests, results, multiplayer
- ✅ **API Endpoints** - RESTful API for all core functionality
- ✅ **Frontend Foundation** - React app with routing and auth context
- ✅ **Type Safety** - End-to-end TypeScript integration

### Planned Features
- **Real-time Typing Tests** with accurate WPM/accuracy tracking
- **Multiplayer Races** with live leaderboards
- **Advanced Analytics** with performance insights
- **Social Features** including following and achievements
- **Custom Themes** and personalization options

## 🛠️ Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (latest version)
- [PostgreSQL](https://postgresql.org/) (v14+)
- [Node.js](https://nodejs.org/) (v18+) - for some tooling compatibility

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tactile
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   # Backend environment
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your database credentials
   
   # Frontend environment
   cp apps/web/.env.example apps/web/.env
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb tactile
   
   # Generate and run migrations
   bun run db:generate
   bun run db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start both frontend and backend
   bun run dev
   
   # Or start individually
   bun run dev:api    # Backend only (port 3001)
   bun run dev:web    # Frontend only (port 5173)
   ```

### Database Management

```bash
# Generate new migration after schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## 📁 Package Details

### `apps/web` - Frontend Application
- React 19 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- React Query for server state
- Zustand for client state

### `apps/api` - Backend API
- Hono.js web framework
- JWT authentication
- Zod validation
- CORS enabled
- RESTful API design

### `packages/database` - Database Layer
- Drizzle ORM with PostgreSQL
- Type-safe database operations
- Migration management
- Optimized queries with indexes

### `packages/types` - Shared Types
- TypeScript interfaces
- API request/response types
- Database entity types
- WebSocket message types

## 🔧 Available Scripts

### Root Level
- `bun run dev` - Start both frontend and backend
- `bun run build` - Build all applications
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio

### Frontend (`apps/web`)
- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run preview` - Preview production build

### Backend (`apps/api`)
- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start production server

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration (CSRF protected)
- `POST /api/auth/login` - User login (CSRF protected)
- `GET /api/auth/me` - Get current user (sets CSRF cookie)
- `POST /api/auth/logout` - User logout (CSRF protected)
- `GET /api/auth/google` - Initiate Google OAuth (with state protection)
- `GET /api/auth/github` - Initiate GitHub OAuth (with state protection)
- `GET /api/auth/callback/google` - Google OAuth callback (state validated)
- `GET /api/auth/callback/github` - GitHub OAuth callback (state validated)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/:username` - Get public user profile

### Tests
- `GET /api/tests/texts` - Get available test texts
- `GET /api/tests/texts/:id` - Get specific test text
- `POST /api/tests/results` - Submit test result
- `GET /api/tests/results` - Get user's test results
- `GET /api/tests/leaderboard` - Get leaderboard

## 🔒 Environment Variables

### Backend (`apps/api/.env`)
```env
DATABASE_URL=postgresql://localhost:5432/tactile
JWT_SECRET=your-super-secret-jwt-key
PORT=3001
NODE_ENV=development

# OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

### Frontend (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:3001
```

## 🔒 Security Features

### CSRF Protection
Tactile implements comprehensive CSRF (Cross-Site Request Forgery) protection:

**For Basic Authentication:**
- CSRF tokens are automatically generated and set as secure HTTP-only cookies
- All state-changing requests (login, register, logout) require valid CSRF tokens
- Tokens are single-use and expire after 15 minutes
- Frontend automatically reads CSRF tokens from cookies (no API calls needed)
- Cookies are configured with `SameSite=Strict` and `Secure` flags for maximum security

**For OAuth (SSO):**
- OAuth state parameters are cryptographically secure and CSRF-protected
- State parameters are validated on callback to prevent CSRF attacks
- Invalid or missing state parameters result in authentication failure

**Security Features:**
- **Cookie-based**: CSRF tokens are stored in secure HTTP-only cookies
- **Automatic**: No manual token management required in frontend code
- **Single-use**: Each token can only be used once to prevent replay attacks
- **Expiration**: Tokens automatically expire after 15 minutes
- **Secure flags**: Cookies use `Secure`, `HttpOnly`, and `SameSite=Strict` attributes

**API Endpoints:**
- All POST/PUT/DELETE endpoints validate CSRF tokens automatically
- OAuth callbacks validate state parameters
- Successful authentication responses include fresh CSRF tokens

## 🔐 OAuth Setup (Optional)

Tactile supports OAuth authentication with Google and GitHub. To enable OAuth:

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env` file

### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `http://localhost:3001/api/auth/callback/github` (development)
   - `https://yourdomain.com/api/auth/callback/github` (production)
4. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in your `.env` file

### OAuth API Endpoints
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/callback/google` - Google OAuth callback
- `GET /api/auth/callback/github` - GitHub OAuth callback

## 🧪 Testing

```bash
# Run all tests
bun test

# Run frontend tests
cd apps/web && bun test

# Run backend tests
cd apps/api && bun test
```

## 📦 Deployment

### Production Build
```bash
bun run build
```

### Docker Support (Coming Soon)
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] **Phase 2**: Typing Engine & Core Testing Features
- [ ] **Phase 3**: Real-time Multiplayer & WebSocket Integration
- [ ] **Phase 4**: Advanced Analytics & Statistics
- [ ] **Phase 5**: Social Features & Community
- [ ] **Phase 6**: Mobile App & PWA Support

---

Built with ❤️ using modern web technologies
