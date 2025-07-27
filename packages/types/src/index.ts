// User types
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  bio?: string;
  country?: string;
  keyboard?: string;
  preferredLanguage: string;
  isPublic: boolean;
}

export interface UserWithProfile extends User {
  profile?: UserProfile;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  exp: number;
}

// Test types
export interface TestText {
  id: string;
  title: string;
  content: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
  wordCount: number;
  createdAt: string;
}

export interface TestResult {
  id: string;
  userId: string;
  testTextId: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
  completedAt: string;
}

export interface TestResultWithText extends TestResult {
  testText: Pick<TestText, 'title' | 'language' | 'difficulty'>;
}

export interface SubmitResultRequest {
  testTextId: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeTaken: number;
  keystrokeData?: string;
}

// Statistics types
export interface UserStats {
  totalTests: number;
  avgWpm: number;
  bestWpm: number;
  avgAccuracy: number;
  bestAccuracy: number;
  totalErrors: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  bestWpm: number;
  avgWpm: number;
  avgAccuracy: number;
  testCount: number;
}

// Typing engine types
export interface KeystrokeEvent {
  key: string;
  timestamp: number;
  correct: boolean;
  position: number;
}

export interface TypingMetrics {
  wpm: number;
  accuracy: number;
  errors: number;
  progress: number;
  timeElapsed: number;
}

// Multiplayer types
export interface MultiplayerRoom {
  id: string;
  name: string;
  hostId: string;
  testTextId: string;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'finished';
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  finishedAt?: string;
  finalWpm?: number;
  finalAccuracy?: number;
}

// WebSocket types
export interface WSMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export interface TypingProgress {
  userId: string;
  progress: number;
  wpm: number;
  accuracy: number;
  errors: number;
  timestamp: number;
}

// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Configuration types
export interface TestConfiguration {
  timeLimit?: number;
  wordLimit?: number;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  status: number;
}